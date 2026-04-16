/**
 * Server-Sent Events transport for the A2A streaming methods.
 *
 * Spec requirements enforced here:
 *  - Every event carries a `kind` discriminator (task | status-update |
 *    artifact-update | message). Omission causes the SDK to drop events.
 *  - On :resubscribe reconnect, emit the full accumulated text with
 *    append:false, then switch to append:true deltas. Consumers track
 *    last_sent_len to avoid duplicates; we snapshot once at attach time.
 *  - Terminal sequence is two events: artifact-update (lastChunk:true,
 *    append:false, full artifact) THEN status-update (final:true).
 *    TaskStore.finish() emits these in the correct order; this transport
 *    closes the stream after the final:true status-update.
 *  - Producer lifecycle is decoupled from the consumer — the subscriber
 *    registered here unsubscribes when the client disconnects but the
 *    producer keeps running in the store until it finishes on its own.
 */

import type { ServerResponse } from "node:http";

import type { StoreEvent, TaskRecord, TaskStore } from "../store/task-store.js";

export interface SseEvent {
  kind: "task" | "status-update" | "artifact-update" | "message";
  taskId: string;
  contextId: string;
  [key: string]: unknown;
}

const SSE_HEADERS = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache, no-transform",
  connection: "keep-alive",
  "x-accel-buffering": "no",
} as const;

/**
 * Open an SSE stream on the given response and attach a store subscriber.
 * Caller is responsible for having already validated auth + that the task
 * exists. Returns the live attachment so callers can abort early.
 */
export function openSseStream(
  res: ServerResponse,
  taskStore: TaskStore,
  taskId: string,
  opts: { sendInitialSnapshot: boolean }
): { close: () => void } {
  const record = taskStore.get(taskId);
  if (!record) {
    // Caller should have checked; fail closed.
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found", taskId }));
    return { close: () => {} };
  }

  res.writeHead(200, { ...SSE_HEADERS });
  res.flushHeaders?.();

  // Initial `kind: "task"` event — full snapshot so reconnecting consumers
  // see current state before deltas start streaming.
  writeEvent(res, {
    kind: "task",
    taskId,
    contextId: record.contextId,
    status: record.status,
    artifact: record.artifact,
    final: false,
  });

  // On :resubscribe we also emit a non-append artifact-update with the
  // accumulated text so the client can rebuild its buffer in one shot.
  if (opts.sendInitialSnapshot && record.artifact.parts[0]?.text) {
    writeEvent(res, {
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
      res.end();
    } catch {
      /* already closed */
    }
  };

  const unsubscribe = taskStore.subscribe(taskId, (event) => {
    if (closed) return;
    const payload = enrichEvent(event, record);
    writeEvent(res, payload);
    // Close the stream after the terminal status-update (final:true). The
    // preceding artifact-update with lastChunk:true is part of the spec's
    // 2-event terminal sequence and goes out first — see TaskStore.finish.
    if (event.kind === "status-update" && event.final) {
      close();
    }
  });

  // Client disconnect → stop pushing but leave producer running in store.
  res.on("close", close);
  res.on("error", close);

  // Heartbeat every 15s so proxies (cloudflared, etc.) don't time out the
  // connection during long-running research tasks.
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
    return {
      kind: "status-update",
      taskId: record.taskId,
      contextId: record.contextId,
      status: event.status,
      final: event.final,
    };
  }
  // artifact-update
  return {
    kind: "artifact-update",
    taskId: record.taskId,
    contextId: record.contextId,
    artifact: event.artifact,
    append: event.append,
    lastChunk: event.lastChunk,
  };
}

function writeEvent(res: ServerResponse, event: SseEvent): void {
  try {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  } catch {
    /* client gone — close handler will clean up */
  }
}
