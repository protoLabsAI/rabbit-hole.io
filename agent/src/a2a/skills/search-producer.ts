/**
 * Search Producer — A2A skill: "search"
 *
 * Calls the rabbit-hole MCP server's `research_entity` tool (depth: "basic")
 * and formats the result as a structured markdown bundle for fleet agents.
 *
 * Env:
 *   RABBIT_HOLE_MCP_URL   — MCP HTTP server base URL (default http://localhost:3398)
 *   RABBIT_HOLE_MCP_TOKEN — Bearer token (optional in dev, required in prod)
 */

import type { ProducerFn } from "../store/task-store.js";

import { callMcpTool } from "./mcp-client.js";

export const searchProducer: ProducerFn = async (ctx, input) => {
  const mcpUrl = process.env["RABBIT_HOLE_MCP_URL"] ?? "http://localhost:3398";
  const token = process.env["RABBIT_HOLE_MCP_TOKEN"] ?? "";

  let result: unknown;
  try {
    const mcpResult = await callMcpTool(
      mcpUrl,
      token,
      "research_entity",
      { query: input, depth: "basic", persist: true },
      ctx.signal
    );

    if (mcpResult.isError) {
      ctx.fail({
        code: -32603,
        message: `research_entity returned an error: ${mcpResult.rawText}`,
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

  ctx.pushText(formatResearchBundle(result, input));
  ctx.finish();
};

// ── Formatting ───────────────────────────────────────────────────────

interface ResearchEntityResult {
  wikipedia?: { title?: string; text?: string; url?: string; error?: string };
  webSearch?: {
    results?: Array<{ title?: string; url?: string; snippet?: string }>;
  };
  extraction?: {
    entities?: Array<{
      name?: string;
      type?: string;
      aliases?: string[];
      properties?: Record<string, unknown>;
    }>;
  };
  bundle?: {
    entities?: Array<{
      name?: string;
      type?: string;
      uid?: string;
    }>;
  };
  evidence?: Array<{ title?: string; url?: string; publisher?: string }>;
  error?: string;
}

function formatResearchBundle(raw: unknown, query: string): string {
  const r = (raw ?? {}) as ResearchEntityResult;
  const lines: string[] = [];

  lines.push(`# Search: ${query}\n`);

  // ── Wikipedia ──────────────────────────────────────────────────────
  if (r.wikipedia && !r.wikipedia.error) {
    const title = r.wikipedia.title ?? query;
    const text = r.wikipedia.text ?? "";
    lines.push(`## ${title}\n`);
    if (text) {
      // First 600 chars — overview paragraph
      lines.push(text.slice(0, 600).trim() + (text.length > 600 ? "…" : ""));
      lines.push("");
    }
  }

  // ── Extracted Entities ─────────────────────────────────────────────
  const entities = r.extraction?.entities ?? r.bundle?.entities ?? [];
  if (entities.length > 0) {
    lines.push("## Key Entities\n");
    for (const e of entities.slice(0, 10)) {
      const name = e.name ?? "(unnamed)";
      const type = e.type ?? "Entity";
      const aliases = (e as { aliases?: string[] }).aliases;
      const aliasStr = aliases?.length ? ` (also: ${aliases.join(", ")})` : "";
      lines.push(`- **${name}** [${type}]${aliasStr}`);
    }
    lines.push("");
  }

  // ── Web Sources ────────────────────────────────────────────────────
  const webResults = r.webSearch?.results ?? [];
  const evidenceItems = r.evidence ?? [];

  if (webResults.length > 0 || evidenceItems.length > 0) {
    lines.push("## Sources\n");

    for (const src of evidenceItems.slice(0, 4)) {
      if (src.url) {
        const publisher = src.publisher ? ` (${src.publisher})` : "";
        lines.push(`- [${src.title ?? src.url}](${src.url})${publisher}`);
      }
    }

    for (const res of webResults.slice(0, 4)) {
      if (res.url) {
        lines.push(`- [${res.title ?? res.url}](${res.url})`);
        if (res.snippet) {
          lines.push(`  ${res.snippet.slice(0, 200)}`);
        }
      }
    }
    lines.push("");
  }

  if (r.error && entities.length === 0) {
    lines.push(`> Note: ${r.error}`);
  }

  return lines.join("\n");
}
