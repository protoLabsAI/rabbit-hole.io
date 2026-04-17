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

export interface MessageSendResult {
  /** A2A spec field name for the task identifier */
  id: string;
  contextId: string;
  status: TaskRecord["status"];
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
    const { skill, input, contextId } = parseSendParams(params);
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
      id: record.taskId,
      contextId: record.contextId,
      status: submittedStatus,
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
  return {
    kind: "task",
    id: record.taskId,
    contextId: record.contextId,
    skill: record.skill,
    status: record.status,
    artifact: record.artifact,
    ...(record.error && { error: record.error }),
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
  };
}

// ── Param parsers ───────────────────────────────────────────────────

function parseSendParams(raw: unknown): {
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

  // A2A spec: skill comes from params.metadata.skillHint
  const metadata = raw["metadata"];
  const skill = isObject(metadata) ? metadata["skillHint"] : undefined;
  if (typeof skill !== "string" || skill.length === 0) {
    throw new RpcHandlerError(
      JSON_RPC_ERRORS.INVALID_PARAMS,
      "params.metadata.skillHint is required"
    );
  }

  // A2A spec: input text comes from params.message.parts[].text
  const message = raw["message"];
  let input = "";
  if (isObject(message)) {
    const parts = message["parts"];
    if (Array.isArray(parts)) {
      input = parts
        .filter(
          (p): p is Record<string, unknown> =>
            isObject(p) && (p["kind"] === "text" || p["type"] === "text")
        )
        .map((p) => (typeof p["text"] === "string" ? p["text"] : ""))
        .join("\n")
        .trim();
    }
  }

  const contextId = raw["contextId"];
  const result: { skill: string; input: string; contextId?: string } = {
    skill,
    input,
  };
  if (typeof contextId === "string") result.contextId = contextId;
  return result;
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

function parsePushConfig(raw: unknown): PushNotificationConfig {
  if (!isObject(raw)) {
    throw new RpcHandlerError(
      JSON_RPC_ERRORS.INVALID_PARAMS,
      "params must be an object"
    );
  }
  const taskId = raw["taskId"];
  const url = raw["url"];
  if (typeof taskId !== "string") {
    throw new RpcHandlerError(
      JSON_RPC_ERRORS.INVALID_PARAMS,
      "params.taskId is required (string)"
    );
  }
  if (typeof url !== "string") {
    throw new RpcHandlerError(
      JSON_RPC_ERRORS.INVALID_PARAMS,
      "params.url is required (string)"
    );
  }
  const id = typeof raw["id"] === "string" ? raw["id"] : undefined;
  const token = typeof raw["token"] === "string" ? raw["token"] : undefined;
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
