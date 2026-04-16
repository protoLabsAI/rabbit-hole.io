/**
 * Graph Search Tool — hybrid BM25 + vector search over the knowledge graph
 *
 * Mirrors the hybrid search logic in apps/rabbit-hole/app/lib/search.ts but
 * packaged as a LangGraph tool for the research loop.
 *
 * Uses Neo4j fulltext (BM25) + Qdrant vector (if configured), fused with RRF.
 * Falls back gracefully to BM25-only when Qdrant is not available.
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { getGlobalNeo4jClient } from "@protolabsai/database";
import { createNeo4jClientWithIntegerConversion } from "@protolabsai/utils";
import { searchKgVector, reciprocalRankFusion } from "@protolabsai/vector";

const QDRANT_ENABLED = !!(
  process.env.QDRANT_URL && process.env.OLLAMA_ENDPOINT
);

function buildLuceneQuery(rawQuery: string): string {
  const escaped = rawQuery
    .trim()
    .replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, "\\$1");
  if (!escaped) return escaped;
  const parts = escaped.split(/\s+/);
  parts[parts.length - 1] = parts[parts.length - 1] + "*";
  return parts.join(" ");
}

export const graphSearchTool = tool(
  async (input: { query: string; limit?: number }) => {
    const limit = input.limit ?? 8;

    try {
      const baseClient = getGlobalNeo4jClient();
      const client = createNeo4jClientWithIntegerConversion(baseClient);
      const ftQuery = buildLuceneQuery(input.query);

      const [fulltextResults, vectorResults] = await Promise.all([
        client
          .executeRead(
            `
            CALL db.index.fulltext.queryNodes('idx_entity_name_fulltext', $ftQuery)
            YIELD node AS e, score
            WHERE e.uid IS NOT NULL AND e.name IS NOT NULL
            WITH e, score
            OPTIONAL MATCH (e)-[r]-(connected)
            WHERE connected.name IS NOT NULL
            WITH e, score,
                 count(r) as relCount,
                 collect(DISTINCT {
                   name: connected.name,
                   type: labels(connected)[0],
                   relationship: type(r)
                 })[0..5] as connections
            RETURN
              e.uid as uid, e.name as name, labels(e)[0] as type,
              COALESCE(e.tags, []) as tags, COALESCE(e.aliases, []) as aliases,
              score, relCount, connections
            ORDER BY score DESC, e.name ASC
            LIMIT $limit
            `,
            { ftQuery, limit: limit * 2 }
          )
          .then((result: any) =>
            result.records.map((r: any) => ({
              uid: r.get("uid") as string,
              name: r.get("name") as string,
              type: r.get("type") as string,
              tags: r.get("tags") as string[],
              aliases: r.get("aliases") as string[],
              score: r.get("score") as number,
              relationshipCount: r.get("relCount") as number,
              connectedEntities: r.get("connections") as Array<{
                name: string;
                type: string;
                relationship: string;
              }>,
            }))
          ),

        QDRANT_ENABLED
          ? searchKgVector(input.query, limit * 2).catch(() => [])
          : Promise.resolve([]),
      ]);

      let finalResults = fulltextResults;

      if (QDRANT_ENABLED && vectorResults.length > 0) {
        const bm25List = fulltextResults.map((r: any) => ({
          uid: r.uid,
          score: r.score,
        }));
        const fused = reciprocalRankFusion(bm25List, vectorResults).slice(
          0,
          limit
        );

        const entityMap = new Map(fulltextResults.map((r: any) => [r.uid, r]));

        const missingUids = fused
          .map((r: any) => r.uid)
          .filter((uid: string) => !entityMap.has(uid));

        if (missingUids.length > 0) {
          const fetched = await client
            .executeRead(
              `
              MATCH (e:Entity)
              WHERE e.uid IN $uids AND e.uid IS NOT NULL AND e.name IS NOT NULL
              OPTIONAL MATCH (e)-[r]-(connected)
              WHERE connected.name IS NOT NULL
              WITH e,
                   count(r) as relCount,
                   collect(DISTINCT {
                     name: connected.name,
                     type: labels(connected)[0],
                     relationship: type(r)
                   })[0..5] as connections
              RETURN
                e.uid as uid, e.name as name, labels(e)[0] as type,
                COALESCE(e.tags, []) as tags, COALESCE(e.aliases, []) as aliases,
                0.5 as score, relCount, connections
              `,
              { uids: missingUids }
            )
            .then((result: any) =>
              result.records.map((r: any) => ({
                uid: r.get("uid") as string,
                name: r.get("name") as string,
                type: r.get("type") as string,
                tags: r.get("tags") as string[],
                aliases: r.get("aliases") as string[],
                score: r.get("score") as number,
                relationshipCount: r.get("relCount") as number,
                connectedEntities: r.get("connections") as Array<{
                  name: string;
                  type: string;
                  relationship: string;
                }>,
              }))
            );

          fetched.forEach((e: any) => entityMap.set(e.uid, e));
        }

        finalResults = fused
          .map((r: any) => entityMap.get(r.uid))
          .filter(Boolean);
      } else {
        finalResults = fulltextResults.slice(0, limit);
      }

      if (finalResults.length === 0) {
        return `No entities found in the knowledge graph for "${input.query}".`;
      }

      const formatted = finalResults
        .map((e: any, i: number) => {
          const connections = (e.connectedEntities ?? [])
            .map((c: any) => `${c.name} (${c.type}) [${c.relationship}]`)
            .join(", ");
          const tags = (e.tags ?? []).join(", ");
          return [
            `[${i + 1}] ${e.name} (${e.type})`,
            tags ? `  Tags: ${tags}` : null,
            connections ? `  Related: ${connections}` : null,
          ]
            .filter(Boolean)
            .join("\n");
        })
        .join("\n\n");

      return `Found ${finalResults.length} entities in the knowledge graph:\n\n${formatted}`;
    } catch (err) {
      return `Knowledge graph search failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
  {
    name: "search_graph",
    description:
      "Search the knowledge graph for entities matching a query. " +
      "Uses hybrid BM25 + semantic vector search. " +
      "Returns entity names, types, tags, and related entities. " +
      "Use this to check what is already known before researching externally.",
    schema: z.object({
      query: z.string().describe("Search query to find relevant entities"),
      limit: z
        .number()
        .optional()
        .describe("Max entities to return (default 8)"),
    }),
  }
);
