import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

import type { AgentCard } from "./card.js";
import type { RpcRouter } from "./rpc/router.js";
import { JSON_RPC_ERRORS, rpcError } from "./rpc/types.js";

export interface ServerConfig {
  port: number;
  host?: string;
  card: AgentCard;
  router: RpcRouter;
  /** Header name matching card.securitySchemes.apiKey.name */
  apiKeyHeader?: string;
  /** When set, /a2a requests without a matching X-API-Key are rejected with 401. */
  apiKey?: string;
}

/**
 * HTTP transport for the A2A agent.
 *
 * Routes:
 *   GET  /.well-known/agent-card.json   → agent card (canonical)
 *   GET  /.well-known/agent.json        → agent card (legacy fallback)
 *   GET  /ok                            → liveness probe
 *   POST /a2a                           → JSON-RPC 2.0 dispatch
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
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
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

  // ── JSON-RPC dispatch ───────────────────────────────────────────
  if (method === "POST" && url.pathname === "/a2a") {
    // Auth check — only when the card declares security
    if (cfg.apiKey && cfg.card.security.length > 0) {
      const presented = headerValue(req, apiKeyHeader);
      if (presented !== cfg.apiKey) {
        res.writeHead(401, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            error: "unauthorized",
            message: `Missing or invalid ${apiKeyHeader} header`,
          })
        );
        return;
      }
    }

    const body = await readJson(req);
    if (body === null) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(
        JSON.stringify(
          rpcError(null, JSON_RPC_ERRORS.PARSE_ERROR, "Invalid JSON body")
        )
      );
      return;
    }

    const response = await cfg.router.dispatch(body, {
      requestId: null,
      apiKey: cfg.apiKey,
    });
    if (response === null) {
      // Notification — no body per JSON-RPC spec.
      res.writeHead(204);
      res.end();
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(response));
    return;
  }

  // ── 404 for everything else ─────────────────────────────────────
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found", path: url.pathname }));
}

function headerValue(req: IncomingMessage, name: string): string | undefined {
  const raw = req.headers[name];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

async function readJson(req: IncomingMessage): Promise<unknown | null> {
  const chunks: Buffer[] = [];
  let total = 0;
  const LIMIT = 1_000_000; // 1 MB — more than enough for A2A payloads
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
