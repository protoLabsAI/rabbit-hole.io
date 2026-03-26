#!/usr/bin/env node
/**
 * Rabbit Hole MCP Server — HTTP Transport
 *
 * Exposes the same research and media processing tools over HTTP
 * using the MCP Streamable HTTP transport (spec 2025-03-26).
 *
 * Any MCP client on the network can connect at:
 *   POST /mcp   — JSON-RPC messages (initialize, tool calls, etc.)
 *   GET  /mcp   — SSE stream for server-initiated messages
 *   DELETE /mcp  — Session teardown
 *
 * Additional REST endpoints:
 *   GET  /health       — Server health check
 *   GET  /openapi.json — Auto-generated OpenAPI spec from MCP tools
 *
 * Environment variables:
 *   MCP_PORT           - HTTP port (default: 3398)
 *   MCP_AUTH_TOKEN      - Bearer token for authentication (required in production)
 *   JOB_PROCESSOR_URL  - Job processor URL (default: http://localhost:8680)
 *   RABBIT_HOLE_URL    - Rabbit Hole app URL (default: http://localhost:3399)
 *   TAVILY_API_KEY     - Tavily search key (optional)
 *   GROQ_API_KEY       - Groq transcription key (optional)
 *   ANTHROPIC_API_KEY  - Anthropic extraction key (optional)
 */

import { randomUUID } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  isInitializeRequest,
} from "@modelcontextprotocol/sdk/types.js";

import { handleToolCall } from "./handler.js";
import { generateOpenAPISpec } from "./openapi.js";
import { mediaTools } from "./tools/media-tools.js";
import { researchTools } from "./tools/research-tools.js";

// ─── Configuration ──────────────────────────────────────────────────

const PORT = parseInt(process.env.MCP_PORT || "3398", 10);
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;
const JOB_PROCESSOR_URL =
  process.env.JOB_PROCESSOR_URL || "http://localhost:8680";
const ALL_TOOLS = [...researchTools, ...mediaTools];
const START_TIME = Date.now();

// ─── Session Management ─────────────────────────────────────────────

const transports = new Map<string, StreamableHTTPServerTransport>();
const servers = new Map<string, Server>();

// ─── Server Factory ─────────────────────────────────────────────────

function createMcpServer(): Server {
  const server = new Server(
    { name: "rabbit-hole", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: ALL_TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await handleToolCall(name, args ?? {}, {
        jobProcessorUrl: JOB_PROCESSOR_URL,
        tavilyApiKey: process.env.TAVILY_API_KEY,
        groqApiKey: process.env.GROQ_API_KEY,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      });
      return {
        content: [
          {
            type: "text" as const,
            text:
              typeof result === "string"
                ? result
                : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}

// ─── Auth Middleware ─────────────────────────────────────────────────

function authenticate(req: IncomingMessage, res: ServerResponse): boolean {
  // Skip auth if no token configured (dev mode)
  if (!AUTH_TOKEN) return true;

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Missing or invalid Authorization header" })
    );
    return false;
  }

  const token = authHeader.slice(7);
  if (token !== AUTH_TOKEN) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid token" }));
    return false;
  }

  return true;
}

// ─── CORS Headers ───────────────────────────────────────────────────

function setCorsHeaders(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Mcp-Session-Id, Accept"
  );
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
}

// ─── Request Body Parser ────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

// ─── Route: Health ──────────────────────────────────────────────────

function handleHealth(_req: IncomingMessage, res: ServerResponse) {
  const uptimeMs = Date.now() - START_TIME;
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: "ok",
      server: "rabbit-hole-mcp",
      version: "0.1.0",
      transport: "streamable-http",
      tools: ALL_TOOLS.length,
      activeSessions: transports.size,
      uptime: `${Math.floor(uptimeMs / 1000)}s`,
      auth: AUTH_TOKEN ? "bearer" : "none",
    })
  );
}

// ─── Route: OpenAPI ─────────────────────────────────────────────────

let cachedSpec: string | null = null;

function handleOpenAPI(_req: IncomingMessage, res: ServerResponse) {
  if (!cachedSpec) {
    cachedSpec = JSON.stringify(generateOpenAPISpec(ALL_TOOLS, PORT), null, 2);
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(cachedSpec);
}

// ─── Route: MCP POST ────────────────────────────────────────────────

async function handleMcpPost(req: IncomingMessage, res: ServerResponse) {
  const body = await readBody(req);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32700, message: "Parse error" },
        id: null,
      })
    );
    return;
  }

  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  // Existing session
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res, parsed);
    return;
  }

  // New session — must be an initialize request
  if (!sessionId && isInitializeRequest(parsed)) {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports.set(sid, transport);
        servers.set(sid, server);
        console.error(`[mcp-http] Session created: ${sid.slice(0, 8)}…`);
      },
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) {
        transports.delete(sid);
        servers.delete(sid);
        console.error(`[mcp-http] Session closed: ${sid.slice(0, 8)}…`);
      }
    };

    await server.connect(transport);
    await transport.handleRequest(req, res, parsed);
    return;
  }

  // Invalid request
  res.writeHead(400, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Bad Request: missing session ID or not an initialize request",
      },
      id: null,
    })
  );
}

// ─── Route: MCP GET (SSE stream) ────────────────────────────────────

async function handleMcpGet(req: IncomingMessage, res: ServerResponse) {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid or missing session ID" }));
    return;
  }
  await transports.get(sessionId)!.handleRequest(req, res);
}

// ─── Route: MCP DELETE (session teardown) ───────────────────────────

async function handleMcpDelete(req: IncomingMessage, res: ServerResponse) {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && transports.has(sessionId)) {
    await transports.get(sessionId)!.close();
    transports.delete(sessionId);
    servers.delete(sessionId);
    res.writeHead(200);
    res.end();
  } else {
    res.writeHead(404);
    res.end();
  }
}

// ─── HTTP Server ────────────────────────────────────────────────────

const httpServer = createServer(async (req, res) => {
  setCorsHeaders(res);

  // Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const path = url.pathname;

  // Health — no auth required
  if (path === "/health" && req.method === "GET") {
    handleHealth(req, res);
    return;
  }

  // OpenAPI — no auth required
  if (path === "/openapi.json" && req.method === "GET") {
    handleOpenAPI(req, res);
    return;
  }

  // All /mcp routes require auth
  if (path === "/mcp") {
    if (!authenticate(req, res)) return;

    try {
      switch (req.method) {
        case "POST":
          await handleMcpPost(req, res);
          break;
        case "GET":
          await handleMcpGet(req, res);
          break;
        case "DELETE":
          await handleMcpDelete(req, res);
          break;
        default:
          res.writeHead(405, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Method not allowed" }));
      }
    } catch (error) {
      console.error("[mcp-http] Request error:", error);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error" },
            id: null,
          })
        );
      }
    }
    return;
  }

  // 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

// ─── Graceful Shutdown ──────────────────────────────────────────────

async function shutdown() {
  console.error("[mcp-http] Shutting down…");
  for (const [sid, transport] of transports) {
    await transport.close();
    transports.delete(sid);
    servers.delete(sid);
  }
  httpServer.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ─── Start ──────────────────────────────────────────────────────────

httpServer.listen(PORT, "0.0.0.0", () => {
  console.error(
    `[mcp-http] Rabbit Hole MCP server listening on http://0.0.0.0:${PORT}`
  );
  console.error(`[mcp-http] MCP endpoint: POST/GET/DELETE /mcp`);
  console.error(`[mcp-http] Health: GET /health`);
  console.error(`[mcp-http] OpenAPI: GET /openapi.json`);
  console.error(
    `[mcp-http] Tools: ${ALL_TOOLS.length} (${researchTools.length} research, ${mediaTools.length} media)`
  );
  console.error(
    `[mcp-http] Auth: ${AUTH_TOKEN ? "bearer token" : "disabled (set MCP_AUTH_TOKEN to enable)"}`
  );
});
