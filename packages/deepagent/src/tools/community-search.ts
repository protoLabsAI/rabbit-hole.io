/**
 * Community Search Tool — GraphRAG global search for deep research
 *
 * Searches community summaries in Qdrant to give the research agent
 * thematic context from the knowledge graph. Complements search_graph
 * (entity-level) with community-level insights.
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { searchCommunitySummaries } from "@proto/vector";

const QDRANT_ENABLED = !!(
  process.env.QDRANT_URL && process.env.OLLAMA_ENDPOINT
);

export const communitySearchTool = tool(
  async (input: { query: string }) => {
    if (!QDRANT_ENABLED) {
      return "Community search not available — Qdrant not configured.";
    }

    try {
      const results = await searchCommunitySummaries(input.query, 5);

      if (results.length === 0) {
        return `No community summaries match "${input.query}". The knowledge graph may not have enough entities for community detection yet.`;
      }

      const formatted = results
        .map((r, i) => {
          const entities = r.topEntities.join(", ");
          return [
            `[Community ${i + 1}] (${r.entityCount} entities, score: ${r.score.toFixed(3)})`,
            `  Summary: ${r.summary}`,
            entities ? `  Key entities: ${entities}` : null,
          ]
            .filter(Boolean)
            .join("\n");
        })
        .join("\n\n");

      return `Found ${results.length} relevant knowledge communities:\n\n${formatted}`;
    } catch (err) {
      return `Community search failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
  {
    name: "search_communities",
    description:
      "Search community summaries for broad thematic context from the knowledge graph. " +
      "Use this for understanding what topics, themes, or groups of entities exist. " +
      "Complements search_graph (individual entities) with community-level insights.",
    schema: z.object({
      query: z
        .string()
        .describe("Thematic query to find relevant entity communities"),
    }),
  }
);
