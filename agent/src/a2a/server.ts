import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

import type { AgentCard } from "./card.js";
import type { RpcRouter } from "./rpc/router.js";
import { JSON_RPC_ERRORS, rpcError } from "./rpc/types.js";
import type { TaskStore } from "./store/task-store.js";
import { openSseStream } from "./transport/sse.js";

export interface ServerConfig {
  port: number;
  host?: string;
  card: AgentCard;
  router: RpcRouter;
  taskStore: TaskStore;
  /** Header name matching card.securitySchemes.apiKey.name */
  apiKeyHeader?: string;
  /** When set, /a2a requests without a matching X-API-Key are rejected with 401. */
  apiKey?: string;
}

/**
 * HTTP transport for the A2A agent.
 *
 * Routes:
 *   GET  /ok                             Liveness
 *   GET  /.well-known/agent-card.json    Agent card (canonical)
 *   GET  /.well-known/agent.json         Agent card (legacy fallback)
 *   POST /a2a                            JSON-RPC 2.0 dispatch — including
 *                                        message/stream + message/sendStream
 *                                        which upgrade the same response to
 *                                        text/event-stream instead of returning
 *                                        a JSON body, and tasks/resubscribe
 *                                        which reattaches to an existing task.
 *   GET  /tasks/{id}:subscribe           REST alias for tasks/resubscribe
 *
 * Intentionally zero-dep (node:http) so this module adds no runtime weight
 * beyond the JSON-RPC wiring itself.
 */
export function createA2AServer(cfg: ServerConfig): Server {
  const apiKeyHeader = (cfg.apiKeyHeader ?? "x-api-key").toLowerCase();

  return createHttpServer(async (req, res) => {
    try {
      await dispatch(req, res, cfg, apiKeyHeader);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "internal_error", message }));
      }
    }
  });
}

async function dispatch(
  req: IncomingMessage,
  res: ServerResponse,
  cfg: ServerConfig,
  apiKeyHeader: string
): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const method = req.method ?? "GET";

  // ── Health probe ────────────────────────────────────────────────
  if (method === "GET" && url.pathname === "/ok") {
    writeJson(res, 200, { ok: true });
    return;
  }

  // ── Agent card (both canonical and legacy paths) ────────────────
  if (
    method === "GET" &&
    (url.pathname === "/.well-known/agent-card.json" ||
      url.pathname === "/.well-known/agent.json")
  ) {
    res.writeHead(200, {
      "content-type": "application/json",
      "cache-control": "public, max-age=60",
    });
    res.end(JSON.stringify(cfg.card));
    return;
  }

  // ── REST convenience: GET /tasks/{id}:subscribe → SSE reconnect ─
  const subscribeMatch =
    method === "GET"
      ? url.pathname.match(/^\/tasks\/([^/]+):subscribe$/)
      : null;
  if (subscribeMatch) {
    if (!checkApiKey(req, res, cfg, apiKeyHeader)) return;
    const taskId = decodeURIComponent(subscribeMatch[1] ?? "");
    if (!cfg.taskStore.get(taskId)) {
      writeJson(res, 404, { error: "not_found", taskId });
      return;
    }
    openSseStream(res, cfg.taskStore, taskId, { sendInitialSnapshot: true });
    return;
  }

  // ── JSON-RPC dispatch ───────────────────────────────────────────
  if (method === "POST" && url.pathname === "/a2a") {
    if (!checkApiKey(req, res, cfg, apiKeyHeader)) return;

    const body = await readJson(req);
    if (body === null) {
      writeJson(
        res,
        400,
        rpcError(null, JSON_RPC_ERRORS.PARSE_ERROR, "Invalid JSON body")
      );
      return;
    }

    // Detect streaming methods and upgrade to SSE. message/stream and
    // message/sendStream create a task then stream; tasks/resubscribe
    // attaches to an existing task.
    const rpcMethod = getMethodName(body);
    if (rpcMethod === "tasks/resubscribe") {
      await handleResubscribe(res, body, cfg);
      return;
    }
    if (rpcMethod === "message/stream" || rpcMethod === "message/sendStream") {
      await handleMessageStream(res, body, cfg);
      return;
    }

    const response = await cfg.router.dispatch(body, {
      requestId: null,
      apiKey: cfg.apiKey,
    });
    if (response === null) {
      res.writeHead(204);
      res.end();
      return;
    }
    writeJson(res, 200, response);
    return;
  }

  // ── 404 for everything else ─────────────────────────────────────
  writeJson(res, 404, { error: "not_found", path: url.pathname });
}

// ── Streaming handlers ─────────────────────────────────────────────

async function handleMessageStream(
  res: ServerResponse,
  body: unknown,
  cfg: ServerConfig
): Promise<void> {
  // Reuse message/send to validate + create the task, but capture the
  // result so we know which task to stream.
  const response = await cfg.router.dispatch(
    { ...(body as Record<string, unknown>), method: "message/send" },
    { requestId: null, apiKey: cfg.apiKey }
  );
  if (!response || "error" in response) {
    // Error path — surface as JSON before the SSE upgrade happens.
    writeJson(res, 200, response ?? { error: "no_response" });
    return;
  }
  const result = response.result as { id?: string };
  if (!result.id) {
    writeJson(res, 500, { error: "missing_id" });
    return;
  }
  openSseStream(res, cfg.taskStore, result.id, {
    sendInitialSnapshot: false,
  });
}

async function handleResubscribe(
  res: ServerResponse,
  body: unknown,
  cfg: ServerConfig
): Promise<void> {
  if (!isObject(body) || !isObject(body["params"])) {
    writeJson(
      res,
      400,
      rpcError(null, JSON_RPC_ERRORS.INVALID_PARAMS, "params.id is required")
    );
    return;
  }
  const taskId = body["params"]["id"];
  if (typeof taskId !== "string") {
    writeJson(
      res,
      400,
      rpcError(
        null,
        JSON_RPC_ERRORS.INVALID_PARAMS,
        "params.id is required (string)"
      )
    );
    return;
  }
  if (!cfg.taskStore.get(taskId)) {
    writeJson(res, 404, { error: "not_found", taskId });
    return;
  }
  openSseStream(res, cfg.taskStore, taskId, { sendInitialSnapshot: true });
}

// ── Helpers ─────────────────────────────────────────────────────────

function checkApiKey(
  req: IncomingMessage,
  res: ServerResponse,
  cfg: ServerConfig,
  apiKeyHeader: string
): boolean {
  if (!cfg.apiKey || cfg.card.security.length === 0) return true;
  const presented = headerValue(req, apiKeyHeader);
  if (presented === cfg.apiKey) return true;
  writeJson(res, 401, {
    error: "unauthorized",
    message: `Missing or invalid ${apiKeyHeader} header`,
  });
  return false;
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function headerValue(req: IncomingMessage, name: string): string | undefined {
  const raw = req.headers[name];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

function getMethodName(body: unknown): string | undefined {
  if (!isObject(body)) return undefined;
  const m = body["method"];
  return typeof m === "string" ? m : undefined;
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

async function readJson(req: IncomingMessage): Promise<unknown | null> {
  const chunks: Buffer[] = [];
  let total = 0;
  const LIMIT = 1_000_000;
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
    total += (chunk as Buffer).length;
    if (total > LIMIT) return null;
  }
  if (total === 0) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}
