/**
 * Ingest URL Producer — A2A skill: "ingest_url"
 *
 * Accepts a URL (HTML, PDF, audio, video, YouTube) and triggers the
 * rabbit-hole media ingest pipeline via the MCP `ingest_url` tool.
 * Returns a JSON summary of what was ingested.
 *
 * Env:
 *   RABBIT_HOLE_MCP_URL   — MCP HTTP server base URL (default http://localhost:3398)
 *   RABBIT_HOLE_MCP_TOKEN — Bearer token
 */

import type { ProducerFn } from "../store/task-store.js";

import { callMcpTool } from "./mcp-client.js";

export const ingestUrlProducer: ProducerFn = async (ctx, input) => {
  const mcpUrl = process.env["RABBIT_HOLE_MCP_URL"] ?? "http://localhost:3398";
  const token = process.env["RABBIT_HOLE_MCP_TOKEN"] ?? "";

  // Validate the input looks like a URL before passing to MCP
  const url = input.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    ctx.fail({
      code: -32602,
      message: `Invalid input: expected a URL (http/https), got: ${url.slice(0, 100)}`,
    });
    return;
  }

  let result: unknown;
  try {
    const mcpResult = await callMcpTool(
      mcpUrl,
      token,
      "ingest_url",
      { url },
      ctx.signal
    );

    if (mcpResult.isError) {
      ctx.fail({
        code: -32603,
        message: `ingest_url returned an error: ${mcpResult.rawText}`,
      });
      return;
    }

    result = mcpResult.data;
  } catch (err) {
    if (ctx.signal.aborted) return;
    ctx.fail({
      code: -32603,
      message: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  if (ctx.signal.aborted) return;

  ctx.pushText(formatIngestResult(result, url));
  ctx.finish();
};

function formatIngestResult(raw: unknown, url: string): string {
  const r = (raw ?? {}) as Record<string, unknown>;
  const lines: string[] = [`# Ingest: ${url}\n`];

  if (r.error) {
    lines.push(`> Error: ${r.error}`);
    return lines.join("\n");
  }

  if (r.jobId) lines.push(`**Job ID**: ${r.jobId}`);
  if (r.status) lines.push(`**Status**: ${r.status}`);
  if (r.message) lines.push(`\n${r.message}`);

  // Ingest summary fields (from job processor response)
  if (r.entitiesIngested)
    lines.push(`\n**Entities ingested**: ${r.entitiesIngested}`);
  if (r.relationshipsIngested)
    lines.push(`**Relationships ingested**: ${r.relationshipsIngested}`);

  if (lines.length === 1) {
    lines.push(JSON.stringify(raw, null, 2));
  }

  return lines.join("\n");
}
