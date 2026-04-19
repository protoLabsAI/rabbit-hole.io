/**
 * KG Facts Producer — A2A skill: "kg_facts"
 *
 * Queries the rabbit-hole knowledge graph for entities and relationships
 * matching the input query via the MCP `graph_search` tool.
 * Returns structured markdown with entity details for fleet agents.
 *
 * Env:
 *   RABBIT_HOLE_MCP_URL   — MCP HTTP server base URL (default http://localhost:3398)
 *   RABBIT_HOLE_MCP_TOKEN — Bearer token
 */

import type { ProducerFn } from "../store/task-store.js";

import { callMcpTool } from "./mcp-client.js";

export const kgFactsProducer: ProducerFn = async (ctx, input) => {
  const mcpUrl = process.env["RABBIT_HOLE_MCP_URL"] ?? "http://localhost:3398";
  const token = process.env["RABBIT_HOLE_MCP_TOKEN"] ?? "";

  let result: unknown;
  try {
    const mcpResult = await callMcpTool(
      mcpUrl,
      token,
      "graph_search",
      { query: input, limit: 15 },
      ctx.signal
    );

    if (mcpResult.isError) {
      ctx.fail({
        code: -32603,
        message: `graph_search returned an error: ${mcpResult.rawText}`,
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

  ctx.pushText(formatKgResults(result, input));
  ctx.finish();
};

// ── Formatting ───────────────────────────────────────────────────────

interface GraphEntity {
  uid?: string;
  name?: string;
  type?: string;
  score?: number;
  aliases?: string[];
  tags?: string[];
  relationshipCount?: number;
  connectedEntities?: Array<{
    name?: string;
    type?: string;
    relationship?: string;
  }>;
}

interface GraphSearchResult {
  results?: GraphEntity[];
  totalCount?: number;
  query?: string;
  error?: string;
}

function formatKgResults(raw: unknown, query: string): string {
  const r = (raw ?? {}) as GraphSearchResult;
  const lines: string[] = [`# Knowledge Graph: ${query}\n`];

  if (r.error) {
    lines.push(`> ${r.error}`);
    return lines.join("\n");
  }

  const entities = r.results ?? [];
  if (entities.length === 0) {
    lines.push(
      "> No entities found in the knowledge graph for this query.\n" +
        "> Try a broader term or run a search first to populate the graph."
    );
    return lines.join("\n");
  }

  const total = r.totalCount ?? entities.length;
  lines.push(`*${entities.length} of ${total} entities*\n`);

  for (const e of entities) {
    const name = e.name ?? "(unnamed)";
    const type = e.type ?? "Entity";
    const score = e.score != null ? ` — score: ${e.score.toFixed(2)}` : "";
    lines.push(`## ${name} [${type}]${score}`);

    if (e.aliases?.length) {
      lines.push(`**Also known as**: ${e.aliases.join(", ")}`);
    }
    if (e.tags?.length) {
      lines.push(`**Tags**: ${e.tags.join(", ")}`);
    }
    if (e.uid) {
      lines.push(`**UID**: \`${e.uid}\``);
    }
    if (e.relationshipCount != null) {
      lines.push(`**Relationships**: ${e.relationshipCount}`);
    }

    const connections = e.connectedEntities ?? [];
    if (connections.length > 0) {
      lines.push("\n**Connected to:**");
      for (const c of connections.slice(0, 5)) {
        const rel = c.relationship ? ` —[${c.relationship}]→` : " →";
        lines.push(`- ${c.name ?? "?"} [${c.type ?? "Entity"}]${rel}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}
