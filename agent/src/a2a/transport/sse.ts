/**
 * Server-Sent Events transport for the A2A streaming methods.
 *
 * Wire format matches Quinn's reference handler (protoLabsAI/quinn
 * a2a_handler.py) point-for-point — Quinn is the canonical spec
 * implementation per the build-an-a2a-agent + a2a-streaming guides.
 *
 * Frame envelope: every SSE `data: ` line is a JSON-RPC 2.0 response
 *
 *   data: {"jsonrpc":"2.0","id":<rpcId>,"result":<event>}\n\n
 *
 * Inner event shapes (kind discriminator is mandatory; the SDK silently
 * drops frames missing it):
 *
 *   kind: "task"            → { id, contextId, status, artifacts? }
 *                             (Task snapshot — uses `id`, not `taskId`)
 *   kind: "status-update"   → { taskId, contextId, status, final }
 *                             (TaskStatusUpdateEvent — uses `taskId`)
 *   kind: "artifact-update" → { taskId, contextId, artifact, append, lastChunk }
 *
 * Terminal sequence (strict order):
 *
 *   1. artifact-update with append:false, lastChunk:true (full artifact)
 *   2. status-update   with final:true   (terminal state)
 *   3. `data: [DONE]\n\n`
 *
 * Producer lifecycle is decoupled from the consumer — subscribers
 * unsubscribe on client disconnect but the producer keeps running in
 * the store, so `:resubscribe` attaches cleanly.
 */

import type { ServerResponse } from "node:http";

import type { StoreEvent, TaskRecord, TaskStore } from "../store/task-store.js";

type SseEvent = {
  kind: "task" | "status-update" | "artifact-update" | "message";
  [key: string]: unknown;
};

export interface SseOpenOpts {
  /** Emit a full artifact snapshot with append:false on attach (resubscribe). */
  sendInitialSnapshot: boolean;
  /**
   * The `id` from the original JSON-RPC request. Echoed in every frame's
   * envelope for SDK correlation. `null` for REST callers hitting
   * `GET /tasks/{id}:subscribe` directly — valid per JSON-RPC spec.
   */
  requestId: string | number | null;
}

const SSE_HEADERS = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache, no-transform",
  connection: "keep-alive",
  "x-accel-buffering": "no",
} as const;

/** Spec terminator — the SDK reads `[DONE]` as close-of-stream signal. */
const DONE_SENTINEL = "data: [DONE]\n\n";

export function openSseStream(
  res: ServerResponse,
  taskStore: TaskStore,
  taskId: string,
  opts: SseOpenOpts
): { close: () => void } {
  const record = taskStore.get(taskId);
  if (!record) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found", taskId }));
    return { close: () => {} };
  }

  res.writeHead(200, { ...SSE_HEADERS });
  res.flushHeaders?.();

  const requestId = opts.requestId;

  // Initial Task snapshot — uses `id` (not taskId), optional artifacts.
  writeEvent(res, requestId, {
    kind: "task",
    id: taskId,
    contextId: record.contextId,
    status: record.status,
    artifacts: [record.artifact],
  });

  // On :resubscribe, also emit a non-append artifact-update with the
  // accumulated text so the client rebuilds its buffer in one shot.
  if (opts.sendInitialSnapshot && record.artifact.parts[0]?.text) {
    writeEvent(res, requestId, {
      kind: "artifact-update",
      taskId,
      contextId: record.contextId,
      artifact: record.artifact,
      append: false,
      lastChunk: false,
    });
  }

  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    unsubscribe();
    try {
      // Terminal sentinel — spec-mandated close signal.
      res.write(DONE_SENTINEL);
      res.end();
    } catch {
      /* already closed */
    }
  };

  const unsubscribe = taskStore.subscribe(taskId, (event) => {
    if (closed) return;
    writeEvent(res, requestId, enrichEvent(event, record));
    if (event.kind === "status-update" && event.final) {
      close();
    }
  });

  res.on("close", close);
  res.on("error", close);

  // Heartbeat every 15s so proxies don't time out long-running streams.
  // Uses SSE comment (`: ...\n\n`) so consumers don't see it as an event.
  const heartbeat = setInterval(() => {
    if (closed) {
      clearInterval(heartbeat);
      return;
    }
    try {
      res.write(": keep-alive\n\n");
    } catch {
      close();
    }
  }, 15_000);
  heartbeat.unref();

  return { close };
}

function enrichEvent(event: StoreEvent, record: TaskRecord): SseEvent {
  if (event.kind === "status-update") {
    // TaskStatusUpdateEvent — spec uses `taskId`, not `id`.
    return {
      kind: "status-update",
      taskId: record.taskId,
      contextId: record.contextId,
      status: event.status,
      final: event.final,
    };
  }
  // TaskArtifactUpdateEvent — singular `artifact`, not `artifacts` array.
  return {
    kind: "artifact-update",
    taskId: record.taskId,
    contextId: record.contextId,
    artifact: event.artifact,
    append: event.append,
    lastChunk: event.lastChunk,
  };
}

function writeEvent(
  res: ServerResponse,
  requestId: string | number | null,
  event: SseEvent
): void {
  const frame = { jsonrpc: "2.0" as const, id: requestId, result: event };
  try {
    res.write(`data: ${JSON.stringify(frame)}\n\n`);
  } catch {
    /* client gone — close handler will clean up */
  }
}
