/**
 * EntityMemoryMiddleware — queries the knowledge graph before and after research.
 *
 * In `beforeAgent`, queries Neo4j for entities related to the user's search
 * query and injects a 'prior knowledge' summary into ctx.state.priorKnowledge:
 *   { entities: [{ name, type, relationshipCount, lastUpdated }], staleEntities: string[] }
 *
 * Staleness threshold: entity is stale if updatedAt > 30 days ago.
 *
 * In `afterAgent`, checks if new evidence was discovered for entities already
 * in the graph and flags them for update in ctx.state.entitiesToUpdate.
 *
 * All Neo4j calls are wrapped in a Langfuse span tracking graph lookup latency
 * and hit/miss counts. Errors are handled gracefully — a Neo4j failure does not
 * break the pipeline.
 */

import { getGlobalNeo4jClient } from "@protolabsai/database";

import type {
  AgentResult,
  MiddlewareContext,
  ResearchMiddleware,
} from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Full-text index name for entity name search. */
const FULLTEXT_INDEX = "idx_entity_name_fulltext";

/** Maximum number of entities to retrieve from Neo4j. */
const MAX_RESULTS = 10;

/** Days after which an entity is considered stale. */
const STALE_DAYS = 30;

const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PriorKnowledgeEntity {
  name: string;
  type: string;
  relationshipCount: number;
  lastUpdated: string | null;
}

export interface PriorKnowledge {
  entities: PriorKnowledgeEntity[];
  staleEntities: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape Lucene special characters and add a prefix wildcard to the last token.
 * Mirrors the logic in apps/rabbit-hole/app/api/entity-search/route.ts.
 *
 * "donald trump" → "donald trump*"
 * "O'Brien"      → "O\'Brien*"
 */
export function buildLuceneQuery(rawQuery: string): string {
  const escaped = rawQuery
    .trim()
    .replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, "\\$1");
  if (!escaped) return escaped;
  const parts = escaped.split(/\s+/);
  parts[parts.length - 1] = parts[parts.length - 1] + "*";
  return parts.join(" ");
}

/**
 * Returns true if the given ISO date string (or Date) represents a timestamp
 * older than STALE_DAYS days.
 */
export function isStale(lastUpdated: string | null): boolean {
  if (!lastUpdated) return true; // no timestamp → treat as stale
  const updatedMs = new Date(lastUpdated).getTime();
  if (isNaN(updatedMs)) return true;
  return Date.now() - updatedMs > STALE_MS;
}

// ---------------------------------------------------------------------------
// Cypher query
// ---------------------------------------------------------------------------

/**
 * Queries idx_entity_name_fulltext for entities matching the Lucene query.
 * Returns up to MAX_RESULTS rows with:
 *   - name, type (first label), relationshipCount, updatedAt
 */
const ENTITY_LOOKUP_CYPHER = `
  CALL db.index.fulltext.queryNodes($index, $ftQuery)
  YIELD node AS e, score
  WHERE e.name IS NOT NULL
  WITH e, score
  OPTIONAL MATCH (e)-[r]-()
  RETURN
    e.name              AS name,
    labels(e)[0]        AS type,
    count(r)            AS relationshipCount,
    e.updatedAt         AS updatedAt
  ORDER BY score DESC
  LIMIT $limit
`;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export class EntityMemoryMiddleware implements ResearchMiddleware {
  readonly id = "entity-memory";

  // -------------------------------------------------------------------------
  // beforeAgent — query Neo4j, inject prior knowledge
  // -------------------------------------------------------------------------

  async beforeAgent(ctx: MiddlewareContext): Promise<void> {
    const query = ctx.state["query"] as string | undefined;
    if (!query?.trim()) return;

    const ftQuery = buildLuceneQuery(query);
    if (!ftQuery) return;

    const startTime = Date.now();
    const span = ctx.tracing.createSpan("entity-memory:graph-lookup", {
      query,
      ftQuery,
    });

    let entities: PriorKnowledgeEntity[] = [];

    try {
      const client = getGlobalNeo4jClient();
      const result = await client.executeRead(ENTITY_LOOKUP_CYPHER, {
        index: FULLTEXT_INDEX,
        ftQuery,
        limit: MAX_RESULTS,
      });

      entities = result.records.map((record) => {
        const relCount = record.get("relationshipCount");
        const relationshipCount =
          typeof relCount === "number"
            ? relCount
            : typeof relCount?.toNumber === "function"
              ? relCount.toNumber()
              : 0;

        const updatedAt = record.get("updatedAt") as string | null;

        return {
          name: record.get("name") as string,
          type: (record.get("type") as string | null) ?? "Unknown",
          relationshipCount,
          lastUpdated: updatedAt ?? null,
        };
      });
    } catch (err) {
      // Neo4j failure must not break the pipeline.
      span.end({
        error: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - startTime,
        hitCount: 0,
        missCount: 1,
      });
      return;
    }

    const staleEntities = entities
      .filter((e) => isStale(e.lastUpdated))
      .map((e) => e.name);

    const priorKnowledge: PriorKnowledge = { entities, staleEntities };
    ctx.state["priorKnowledge"] = priorKnowledge;

    span.end({
      latencyMs: Date.now() - startTime,
      hitCount: entities.length,
      missCount: entities.length === 0 ? 1 : 0,
    });
  }

  // -------------------------------------------------------------------------
  // afterAgent — flag entities needing update based on new evidence
  // -------------------------------------------------------------------------

  async afterAgent(ctx: MiddlewareContext, result: AgentResult): Promise<void> {
    const priorKnowledge = ctx.state["priorKnowledge"] as
      | PriorKnowledge
      | undefined;
    if (!priorKnowledge || priorKnowledge.entities.length === 0) return;

    // Collect text from the agent's final output to check for entity mentions.
    const agentText = result.text ?? "";
    if (!agentText) return;

    const agentTextLower = agentText.toLowerCase();

    const entitiesToUpdate: string[] = priorKnowledge.entities
      .filter((entity) => agentTextLower.includes(entity.name.toLowerCase()))
      .map((entity) => entity.name);

    ctx.state["entitiesToUpdate"] = entitiesToUpdate;
  }
}
