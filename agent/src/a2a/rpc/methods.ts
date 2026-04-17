/**
 * JSON-RPC handlers for the A2A spec.
 *
 * Split by concern:
 *   registerMessageMethods  message/send, message/stream*, tasks/resubscribe
 *   registerTaskMethods     tasks/get, tasks/cancel
 *   registerPushMethods     tasks/pushNotificationConfig/{set,get,list,delete}
 *
 * Streaming methods (message/stream, message/sendStream, tasks/resubscribe)
 * cannot return a JSON-RPC response — they must upgrade the transport to
 * Server-Sent Events. They reject here with a special marker and the HTTP
 * layer (server.ts) switches transports when it sees the marker, rather than
 * letting the RPC router serialize a response. This keeps the router simple
 * and keeps SSE plumbing out of the method body.
 */

import type {
  PushConfigStore,
  PushNotificationConfig,
} from "../store/push-config-store.js";
import type { ProducerFn, TaskRecord, TaskStore } from "../store/task-store.js";

import { RpcHandlerError, type RpcRouter } from "./router.js";
import { JSON_RPC_ERRORS } from "./types.js";

// ── Params / Result types ───────────────────────────────────────────

export interface MessageSendParams {
  /** A2A spec: message object carrying the user turn */
  message?: {
    messageId?: string;
    role?: string;
    parts?: Array<{ kind?: string; type?: string; text?: string }>;
  };
  /** A2A spec: metadata bag — skillHint selects the producer */
  metadata?: Record<string, unknown>;
  /** Optional conversation context — chains multiple sends into one context */
  contextId?: string;
}

/**
 * A2A spec `Task` object — what `message/send`, `tasks/get`, and
 * `tasks/cancel` return. `@a2a-js/sdk` routes on `kind: "task"` to
 * extract id + artifacts; the discriminator is load-bearing.
 */
export interface MessageSendResult {
  kind: "task";
  id: string;
  contextId: string;
  status: TaskRecord["status"];
  artifacts?: TaskRecord["artifact"][];
}

export interface TasksGetParams {
  /** A2A spec field name */
  id: string;
}

export interface TasksCancelResult {
  /** A2A spec field name */
  id: string;
  state: string;
  canceled: boolean;
}

export type ProducerRegistry = Record<string, ProducerFn>;

// ── Registration ────────────────────────────────────────────────────

export function registerMessageMethods(
  router: RpcRouter,
  taskStore: TaskStore,
  producers: ProducerRegistry
): void {
  router.register("message/send", async (params) => {
    const { skill, input, contextId } = parseSendParams(
      params,
      Object.keys(producers)
    );
    const producer = producers[skill];
    if (!producer) {
      throw new RpcHandlerError(
        JSON_RPC_ERRORS.INVALID_PARAMS,
        `Unknown skill: ${skill}. Available: ${Object.keys(producers).join(", ")}`
      );
    }
    const record = taskStore.create({ skill, input, contextId });
    // Snapshot state:submitted BEFORE defer — spec requires us to return
    // state:submitted within ~1s even though startProducer flips to working.
    const submittedStatus: TaskRecord["status"] = {
      state: record.status.state,
      timestamp: record.status.timestamp,
    };
    // Defer producer start so the caller's response is serialized before
    // any state transitions fire on the record.
    setImmediate(() => {
      try {
        taskStore.startProducer(record.taskId, producer);
      } catch {
        // Task might have been canceled between create + setImmediate;
        // startProducer will throw if state is no longer submitted.
      }
    });
    const result: MessageSendResult = {
      kind: "task",
      id: record.taskId,
      contextId: record.contextId,
      status: submittedStatus,
      artifacts: [record.artifact],
    };
    return result;
  });
}

export function registerTaskMethods(
  router: RpcRouter,
  taskStore: TaskStore
): void {
  router.register("tasks/get", async (params) => {
    const { taskId } = parseTaskId(params);
    const record = taskStore.get(taskId);
    if (!record) {
      throw new RpcHandlerError(
        JSON_RPC_ERRORS.INVALID_PARAMS,
        `Unknown taskId: ${taskId}`
      );
    }
    return serializeTask(record);
  });

  router.register("tasks/cancel", async (params) => {
    const { taskId } = parseTaskId(params);
    const { canceled, state } = taskStore.cancel(taskId);
    if (state === "unknown") {
      throw new RpcHandlerError(
        JSON_RPC_ERRORS.INVALID_PARAMS,
        `Unknown task id: ${taskId}`
      );
    }
    const result: TasksCancelResult = { id: taskId, state, canceled };
    return result;
  });
}

export function registerPushMethods(
  router: RpcRouter,
  pushStore: PushConfigStore,
  taskStore: TaskStore
): void {
  router.register("tasks/pushNotificationConfig/set", async (params) => {
    const cfg = parsePushConfig(params);
    if (!taskStore.get(cfg.taskId)) {
      throw new RpcHandlerError(
        JSON_RPC_ERRORS.INVALID_PARAMS,
        `Unknown taskId: ${cfg.taskId}`
      );
    }
    pushStore.set(cfg);
    return { taskId: cfg.taskId, id: cfg.id };
  });

  router.register("tasks/pushNotificationConfig/get", async (params) => {
    const p = parseTaskIdAndConfigId(params);
    const cfg = pushStore.get(p.taskId, p.id);
    if (!cfg) {
      throw new RpcHandlerError(
        JSON_RPC_ERRORS.INVALID_PARAMS,
        `No config ${p.id} for task ${p.taskId}`
      );
    }
    return cfg;
  });

  router.register("tasks/pushNotificationConfig/list", async (params) => {
    // Push config methods use `taskId` (not `id`) to reference the target task —
    // distinct from the A2A task lifecycle methods which use `id`.
    if (!isObject(params) || typeof params["taskId"] !== "string") {
      throw new RpcHandlerError(
        JSON_RPC_ERRORS.INVALID_PARAMS,
        "params.taskId is required (string)"
      );
    }
    const taskId = params["taskId"];
    return { taskId, configs: pushStore.list(taskId) };
  });

  router.register("tasks/pushNotificationConfig/delete", async (params) => {
    const p = parseTaskIdAndConfigId(params);
    const removed = pushStore.delete(p.taskId, p.id);
    return { taskId: p.taskId, id: p.id, removed };
  });
}

// ── Serialization helpers ───────────────────────────────────────────

function serializeTask(record: TaskRecord): unknown {
  // A2A Task shape: `kind: "task"`, `id` (not taskId), `artifacts` array
  // (not singular artifact). skill/createdAt/updatedAt are our-own extras
  // — non-spec keys are allowed on a Task object (SDK ignores unknowns).
  return {
    kind: "task",
    id: record.taskId,
    contextId: record.contextId,
    skill: record.skill,
    status: record.status,
    artifacts: [record.artifact],
    ...(record.error && { error: record.error }),
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
  };
}

// ── Param parsers ───────────────────────────────────────────────────

function parseSendParams(
  raw: unknown,
  availableSkills: readonly string[] = []
): {
  skill: string;
  input: string;
  contextId?: string;
} {
  if (!isObject(raw)) {
    throw new RpcHandlerError(
      JSON_RPC_ERRORS.INVALID_PARAMS,
      "params must be an object"
    );
  }

  // Skill resolution order:
  //   1. params.message.metadata.skill / .skillHint   (A2A spec — SDK writes here)
  //   2. params.metadata.skill         / .skillHint   (some clients attach at params root)
  //   3. params.skill                                  (legacy shape kept for back-compat)
  //   4. single skill fallback — if the agent only offers one, use that
  const message = isObject(raw["message"]) ? raw["message"] : undefined;
  const msgMeta =
    message && isObject(message["metadata"]) ? message["metadata"] : undefined;
  const rootMeta = isObject(raw["metadata"]) ? raw["metadata"] : undefined;
  const skill =
    pickString(msgMeta, "skill") ??
    pickString(msgMeta, "skillHint") ??
    pickString(rootMeta, "skill") ??
    pickString(rootMeta, "skillHint") ??
    pickString(raw, "skill") ??
    (availableSkills.length === 1 ? availableSkills[0] : undefined);
  if (!skill) {
    throw new RpcHandlerError(
      JSON_RPC_ERRORS.INVALID_PARAMS,
      availableSkills.length > 0
        ? `skill is required — set via message.metadata.skill (available: ${availableSkills.join(", ")})`
        : "skill is required — set via message.metadata.skill"
    );
  }

  // Input text — A2A spec pulls from params.message.parts[].text; legacy
  // shape used params.input. Concat text parts in order so multi-part
  // messages round-trip losslessly.
  let input = "";
  if (message && Array.isArray(message["parts"])) {
    const chunks: string[] = [];
    for (const p of message["parts"]) {
      if (
        isObject(p) &&
        (p["kind"] === "text" || p["type"] === "text") &&
        typeof p["text"] === "string"
      ) {
        chunks.push(p["text"]);
      }
    }
    input = chunks.join("\n").trim();
  }
  if (input.length === 0) {
    const legacy = pickString(raw, "input");
    if (legacy) input = legacy;
  }
  if (input.length === 0) {
    throw new RpcHandlerError(
      JSON_RPC_ERRORS.INVALID_PARAMS,
      'input text is required — set via message.parts[{kind:"text", text}] or legacy params.input'
    );
  }

  // contextId can live on message or at params root.
  const contextId =
    (message && pickString(message, "contextId")) ??
    pickString(raw, "contextId");
  const result: { skill: string; input: string; contextId?: string } = {
    skill,
    input,
  };
  if (contextId) result.contextId = contextId;
  return result;
}

function pickString(
  obj: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function parseTaskId(raw: unknown): { taskId: string } {
  if (!isObject(raw) || typeof raw["id"] !== "string") {
    throw new RpcHandlerError(
      JSON_RPC_ERRORS.INVALID_PARAMS,
      "params.id is required (string)"
    );
  }
  return { taskId: raw["id"] };
}

function parseTaskIdAndConfigId(raw: unknown): { taskId: string; id: string } {
  if (
    !isObject(raw) ||
    typeof raw["taskId"] !== "string" ||
    typeof raw["id"] !== "string"
  ) {
    throw new RpcHandlerError(
      JSON_RPC_ERRORS.INVALID_PARAMS,
      "params.taskId and params.id are required (string)"
    );
  }
  return { taskId: raw["taskId"], id: raw["id"] };
}

/**
 * Accept every shape callers use for
 * `tasks/pushNotificationConfig/set`:
 *
 *   A2A spec (what @a2a-js/sdk sends):
 *     { taskId, pushNotificationConfig: { url, authentication: { credentials }, id? } }
 *
 *   Quinn-style wrapper (identical but alternate key):
 *     { taskId, taskPushNotificationConfig: { url, ... } }
 *
 *   Legacy flat shape kept for back-compat:
 *     { taskId, url, token?, id? }
 */
function parsePushConfig(raw: unknown): PushNotificationConfig {
  if (!isObject(raw)) {
    throw new RpcHandlerError(
      JSON_RPC_ERRORS.INVALID_PARAMS,
      "params must be an object"
    );
  }
  const taskId = raw["taskId"];
  if (typeof taskId !== "string") {
    throw new RpcHandlerError(
      JSON_RPC_ERRORS.INVALID_PARAMS,
      "params.taskId is required (string)"
    );
  }

  // Look for a nested config object (spec) — try both property names.
  const nested = isObject(raw["pushNotificationConfig"])
    ? raw["pushNotificationConfig"]
    : isObject(raw["taskPushNotificationConfig"])
      ? raw["taskPushNotificationConfig"]
      : undefined;

  // Authenticator payload (spec): credentials carry the Bearer token.
  const nestedAuth =
    nested && isObject(nested["authentication"])
      ? nested["authentication"]
      : undefined;

  const url =
    (nested && typeof nested["url"] === "string" ? nested["url"] : undefined) ??
    (typeof raw["url"] === "string" ? raw["url"] : undefined);
  if (typeof url !== "string" || url.length === 0) {
    throw new RpcHandlerError(
      JSON_RPC_ERRORS.INVALID_PARAMS,
      "pushNotificationConfig.url is required (string) — spec shape: params.pushNotificationConfig.url; legacy: params.url"
    );
  }

  const id =
    (nested && typeof nested["id"] === "string" ? nested["id"] : undefined) ??
    (typeof raw["id"] === "string" ? raw["id"] : undefined);

  const token =
    (nestedAuth && typeof nestedAuth["credentials"] === "string"
      ? nestedAuth["credentials"]
      : undefined) ??
    (nested && typeof nested["token"] === "string"
      ? nested["token"]
      : undefined) ??
    (typeof raw["token"] === "string" ? raw["token"] : undefined);

  return {
    taskId,
    id: id ?? taskId,
    url,
    ...(token && { token }),
  };
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
