/**
 * KG Facts Producer — A2A skill: "kg_facts"
 *
 * Two-layer knowledge retrieval:
 *   1. Graphiti — temporal facts with validity windows (when/valid_at/invalid_at)
 *   2. Neo4j via MCP graph_search — entity details, relationships, properties
 *
 * Both run in parallel. Results are merged into a single markdown response.
 * Graphiti facts section appears first (temporal knowledge), followed by
 * structural entity details from Neo4j.
 *
 * Env:
 *   RABBIT_HOLE_MCP_URL   — MCP HTTP server base URL (default http://localhost:3398)
 *   RABBIT_HOLE_MCP_TOKEN — Bearer token
 *   GRAPHITI_URL          — Graphiti service URL (default http://graphiti:8000)
 */

import { GraphitiClient } from "../../lib/graphiti-client.js";
import type { GraphitiFact } from "../../lib/graphiti-client.js";
import type { ProducerFn } from "../store/task-store.js";

import { callMcpTool } from "./mcp-client.js";

export const kgFactsProducer: ProducerFn = async (ctx, input) => {
  const mcpUrl = process.env["RABBIT_HOLE_MCP_URL"] ?? "http://localhost:3398";
  const token = process.env["RABBIT_HOLE_MCP_TOKEN"] ?? "";
  const graphiti = new GraphitiClient();

  // ── Run both sources in parallel ──────────────────────────────────────
  const [graphitiResult, mcpResult] = await Promise.allSettled([
    graphiti.searchFacts(input, 15),
    callMcpTool(
      mcpUrl,
      token,
      "graph_search",
      { query: input, limit: 15 },
      ctx.signal
    ),
  ]);

  if (ctx.signal.aborted) return;

  const facts: GraphitiFact[] =
    graphitiResult.status === "fulfilled" ? graphitiResult.value : [];

  let kgEntities: unknown = null;
  if (mcpResult.status === "fulfilled" && !mcpResult.value.isError) {
    kgEntities = mcpResult.value.data;
  } else if (mcpResult.status === "rejected" && !ctx.signal.aborted) {
    // MCP call failed — continue with just Graphiti facts if available
  }

  if (facts.length === 0 && kgEntities === null) {
    ctx.fail({
      code: -32603,
      message:
        mcpResult.status === "rejected"
          ? mcpResult.reason instanceof Error
            ? mcpResult.reason.message
            : String(mcpResult.reason)
          : "No knowledge found for this query",
    });
    return;
  }

  ctx.pushText(formatMergedResults(facts, kgEntities, input));
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
  error?: string;
}

function formatMergedResults(
  facts: GraphitiFact[],
  rawEntities: unknown,
  query: string
): string {
  const lines: string[] = [`# Knowledge: ${query}\n`];
  const now = Date.now();

  // ── Temporal Facts (Graphiti) ─────────────────────────────────────────
  const activeFacts = facts.filter((f) => {
    if (f.invalid_at && new Date(f.invalid_at).getTime() <= now) return false;
    if (f.expired_at && new Date(f.expired_at).getTime() <= now) return false;
    return true;
  });

  if (activeFacts.length > 0) {
    lines.push(`## Temporal Facts\n`);
    for (const f of activeFacts.slice(0, 15)) {
      lines.push(`- ${f.fact}`);
      const validity = formatValidity(f);
      if (validity) lines.push(`  *${validity}*`);
    }
    lines.push("");
  }

  // ── Structural Entities (Neo4j) ────────────────────────────────────────
  const r = (rawEntities ?? {}) as GraphSearchResult;
  const entities = r.results ?? [];

  if (entities.length > 0) {
    const total = r.totalCount ?? entities.length;
    lines.push(`## Entities *(${entities.length} of ${total})*\n`);

    for (const e of entities) {
      const name = e.name ?? "(unnamed)";
      const type = e.type ?? "Entity";
      const score = e.score != null ? ` — score: ${e.score.toFixed(2)}` : "";
      lines.push(`### ${name} [${type}]${score}`);

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
  }

  if (activeFacts.length === 0 && entities.length === 0) {
    lines.push(
      "> No knowledge found for this query.\n" +
        "> Try running a `search` or `deep_research` task first to populate the graph."
    );
  }

  return lines.join("\n");
}

function formatValidity(f: GraphitiFact): string {
  const parts: string[] = [];
  if (f.valid_at) parts.push(`valid from ${f.valid_at.slice(0, 10)}`);
  if (f.invalid_at) parts.push(`until ${f.invalid_at.slice(0, 10)}`);
  return parts.join(", ");
}
