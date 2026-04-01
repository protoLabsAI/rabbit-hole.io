/**
 * OpenAPI Spec Generator
 *
 * Auto-generates an OpenAPI 3.1 spec from MCP tool definitions.
 * Each tool becomes a POST endpoint under /api/tools/{toolName}.
 * Input schemas are mapped directly from the MCP tool inputSchema.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    contact?: { url: string };
  };
  servers: Array<{ url: string; description: string }>;
  security?: Array<Record<string, string[]>>;
  paths: Record<string, Record<string, unknown>>;
  components: {
    securitySchemes?: Record<string, unknown>;
    schemas: Record<string, unknown>;
  };
}

export function generateOpenAPISpec(tools: Tool[], port: number): OpenAPISpec {
  const paths: Record<string, Record<string, unknown>> = {};

  // MCP endpoint
  paths["/mcp"] = {
    post: {
      summary: "MCP JSON-RPC endpoint",
      description:
        "Send JSON-RPC 2.0 messages per the MCP Streamable HTTP transport spec (2025-03-26). " +
        "First request must be an InitializeRequest with no Mcp-Session-Id header. " +
        "Subsequent requests must include the Mcp-Session-Id header returned in the initialize response.",
      tags: ["MCP Transport"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/JsonRpcRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "JSON-RPC response or SSE stream",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/JsonRpcResponse" },
            },
            "text/event-stream": {
              description: "SSE stream for long-running tool calls",
            },
          },
        },
        "401": { description: "Missing or invalid auth token" },
        "403": { description: "Invalid token" },
      },
    },
    get: {
      summary: "MCP SSE stream for server-initiated messages",
      tags: ["MCP Transport"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "Mcp-Session-Id",
          in: "header",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": {
          description: "SSE event stream",
          content: { "text/event-stream": {} },
        },
      },
    },
    delete: {
      summary: "Terminate MCP session",
      tags: ["MCP Transport"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "Mcp-Session-Id",
          in: "header",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": { description: "Session terminated" },
        "404": { description: "Session not found" },
      },
    },
  };

  // Health endpoint
  paths["/health"] = {
    get: {
      summary: "Server health check",
      tags: ["System"],
      responses: {
        "200": {
          description: "Server status",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", example: "ok" },
                  server: { type: "string", example: "rabbit-hole-mcp" },
                  version: { type: "string", example: "0.1.0" },
                  transport: { type: "string", example: "streamable-http" },
                  tools: { type: "integer", example: 11 },
                  activeSessions: { type: "integer" },
                  uptime: { type: "string", example: "3600s" },
                  auth: { type: "string", enum: ["bearer", "none"] },
                },
              },
            },
          },
        },
      },
    },
  };

  // Generate a reference endpoint per tool for documentation
  for (const tool of tools) {
    const safeName = tool.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    paths[`/api/tools/${safeName}`] = {
      post: {
        summary: tool.description,
        description:
          `MCP tool: \`${tool.name}\`\n\n` +
          "Call this tool via the MCP protocol by sending a `tools/call` JSON-RPC request " +
          `to POST /mcp with \`"name": "${tool.name}"\` and the arguments below.\n\n` +
          "This REST endpoint is documented for reference only — use the MCP transport for actual tool calls.",
        tags: [categorizeTool(tool.name)],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: tool.inputSchema as Record<string, unknown>,
            },
          },
        },
        responses: {
          "200": {
            description: "Tool result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    content: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: { type: "string", example: "text" },
                          text: { type: "string" },
                        },
                      },
                    },
                    isError: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Rabbit Hole MCP Server",
      description:
        "Knowledge graph research and media processing tools exposed via MCP Streamable HTTP transport. " +
        "Connect any MCP client to POST /mcp to use these tools. " +
        "The /api/tools/* endpoints are documented for reference — actual calls go through the MCP protocol.",
      version: "0.1.0",
      contact: { url: "https://rabbit-hole.io" },
    },
    servers: [
      { url: `http://localhost:${port}`, description: "Local development" },
      { url: `http://rabbit-hole.tail:${port}`, description: "Tailscale VPN" },
    ],
    security: [{ bearerAuth: [] }],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description:
            "Set MCP_AUTH_TOKEN env var on the server, pass as Bearer token",
        },
      },
      schemas: {
        JsonRpcRequest: {
          type: "object",
          required: ["jsonrpc", "method"],
          properties: {
            jsonrpc: { type: "string", enum: ["2.0"] },
            id: { oneOf: [{ type: "string" }, { type: "number" }] },
            method: {
              type: "string",
              enum: [
                "initialize",
                "tools/list",
                "tools/call",
                "notifications/initialized",
              ],
            },
            params: { type: "object" },
          },
        },
        JsonRpcResponse: {
          type: "object",
          properties: {
            jsonrpc: { type: "string", enum: ["2.0"] },
            id: { oneOf: [{ type: "string" }, { type: "number" }] },
            result: { type: "object" },
            error: {
              type: "object",
              properties: {
                code: { type: "integer" },
                message: { type: "string" },
              },
            },
          },
        },
      },
    },
  };
}

/** Categorize tool for OpenAPI tags. */
function categorizeTool(name: string): string {
  const researchTools = [
    "wikipedia_search",
    "web_search",
    "tavily_search",
    "extract_entities",
    "validate_bundle",
    "ingest_bundle",
    "graph_search",
    "research_entity",
  ];
  if (researchTools.includes(name)) return "Research Tools";
  return "Media Tools";
}
