/**
 * Minimal MCP HTTP client for calling tools on the rabbit-hole MCP server.
 *
 * The MCP Streamable HTTP transport requires a two-step flow:
 *   1. POST /mcp with an `initialize` request → server returns Mcp-Session-Id header
 *   2. POST /mcp with the tool call, including that session ID
 *
 * This helper encapsulates both steps so producers can call tools in one shot.
 */

export interface McpToolResult {
  /** Parsed JSON if the result text is valid JSON, otherwise raw text. */
  data: unknown;
  /** Raw text from the MCP content block */
  rawText: string;
  isError: boolean;
}

export async function callMcpTool(
  mcpUrl: string,
  token: string,
  toolName: string,
  toolArgs: Record<string, unknown>,
  signal: AbortSignal
): Promise<McpToolResult> {
  const base = mcpUrl.replace(/\/+$/, "");
  const endpoint = `${base}/mcp`;

  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  // ── Step 1: Initialize a session ─────────────────────────────────────
  const initRes = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...authHeaders,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 0,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "rabbit-hole-a2a", version: "0.1.0" },
      },
    }),
    signal,
  });

  if (!initRes.ok) {
    throw new Error(
      `MCP initialize failed: HTTP ${initRes.status} ${initRes.statusText}`
    );
  }

  const sessionId = initRes.headers.get("mcp-session-id");
  if (!sessionId) {
    throw new Error("MCP initialize did not return an Mcp-Session-Id header");
  }

  // ── Step 2: Call the tool ─────────────────────────────────────────────
  const toolRes = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "Mcp-Session-Id": sessionId,
      ...authHeaders,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: toolName, arguments: toolArgs },
    }),
    signal,
  });

  if (!toolRes.ok) {
    throw new Error(
      `MCP tools/call failed: HTTP ${toolRes.status} ${toolRes.statusText}`
    );
  }

  const json = (await toolRes.json()) as {
    result?: { content?: Array<{ text?: string }>; isError?: boolean };
    error?: { code: number; message: string };
  };

  if (json.error) {
    throw new Error(`MCP RPC error ${json.error.code}: ${json.error.message}`);
  }

  const rawText = json.result?.content?.[0]?.text ?? "";
  const isError = json.result?.isError === true;

  let data: unknown;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { text: rawText };
  }

  return { data, rawText, isError };
}
