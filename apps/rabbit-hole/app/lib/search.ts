/**
 * Shared search utilities — used by /api/chat and /api/research/deep.
 *
 * Single source of truth for graph, web, and Wikipedia search.
 * searchGraph uses hybrid BM25 (Neo4j fulltext) + vector (Qdrant) with RRF fusion.
 */

import { getGlobalNeo4jClient } from "@protolabsai/database";
import { createNeo4jClientWithIntegerConversion } from "@protolabsai/utils";
import {
  searchKgVector,
  reciprocalRankFusion,
  searchCommunitySummaries,
} from "@protolabsai/vector";

// ── Types ────────────────────────────────────────────────────────────

export interface GraphSearchResult {
  uid: string;
  name: string;
  type: string;
  tags: string[];
  aliases: string[];
  score: number;
  relationshipCount: number;
  connectedEntities: Array<{
    name: string;
    type: string;
    relationship: string;
  }>;
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

export interface WikiSearchResult {
  title: string;
  text: string;
  url: string;
  snippet: string;
}

export interface CommunitySearchResult {
  communityId: number;
  summary: string;
  topEntities: string[];
  entityCount: number;
  score: number;
}

// ── Lucene Query Builder ─────────────────────────────────────────────

export function buildLuceneQuery(rawQuery: string): string {
  const escaped = rawQuery
    .trim()
    .replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, "\\$1");
  if (!escaped) return escaped;
  const parts = escaped.split(/\s+/);
  parts[parts.length - 1] = parts[parts.length - 1] + "*";
  return parts.join(" ");
}

// ── Graph Search (hybrid BM25 + vector, RRF) ─────────────────────────

const QDRANT_ENABLED = !!(
  process.env.QDRANT_URL && process.env.OLLAMA_ENDPOINT
);

export async function searchGraph(
  query: string,
  limit = 10
): Promise<GraphSearchResult[]> {
  const baseClient = getGlobalNeo4jClient();
  const client = createNeo4jClientWithIntegerConversion(baseClient);
  const ftQuery = buildLuceneQuery(query);

  // Run BM25 fulltext and Qdrant vector in parallel
  const [fulltextResults, vectorResults] = await Promise.all([
    // BM25 leg: Neo4j fulltext with relationship context
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
      .then((result) =>
        result.records.map((r: any) => ({
          uid: r.get("uid") as string,
          name: r.get("name") as string,
          type: r.get("type") as string,
          tags: r.get("tags") as string[],
          aliases: r.get("aliases") as string[],
          score: r.get("score") as number,
          relationshipCount: r.get("relCount") as number,
          connectedEntities: r.get(
            "connections"
          ) as GraphSearchResult["connectedEntities"],
        }))
      ),

    // Vector leg: Qdrant semantic search (no-op if not configured)
    QDRANT_ENABLED
      ? searchKgVector(query, limit * 2).catch(() => [])
      : Promise.resolve([]),
  ]);

  // If Qdrant not configured, return fulltext results as-is
  if (!QDRANT_ENABLED || vectorResults.length === 0) {
    return fulltextResults.slice(0, limit);
  }

  // Build RRF input lists
  const bm25List = fulltextResults.map((r) => ({ uid: r.uid, score: r.score }));
  const fused = reciprocalRankFusion(bm25List, vectorResults).slice(0, limit);

  // Map of uid → full entity (from BM25 results, which carry relationship data)
  const entityMap = new Map(fulltextResults.map((r) => [r.uid, r]));

  // Fetch any vector-only hits (not in BM25 results) from Neo4j
  const missingUids = fused
    .map((r) => r.uid)
    .filter((uid) => !entityMap.has(uid));

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
      .then((result) =>
        result.records.map((r: any) => ({
          uid: r.get("uid") as string,
          name: r.get("name") as string,
          type: r.get("type") as string,
          tags: r.get("tags") as string[],
          aliases: r.get("aliases") as string[],
          score: r.get("score") as number,
          relationshipCount: r.get("relCount") as number,
          connectedEntities: r.get(
            "connections"
          ) as GraphSearchResult["connectedEntities"],
        }))
      );

    fetched.forEach((e) => entityMap.set(e.uid, e));
  }

  // Return in RRF order, dropping any uids with no entity data
  return fused
    .map((r) => entityMap.get(r.uid))
    .filter((r): r is GraphSearchResult => r !== undefined);
}

// ── Community Search (GraphRAG global search) ───────────────────────

export async function searchCommunities(
  query: string,
  limit = 5
): Promise<CommunitySearchResult[]> {
  if (!QDRANT_ENABLED) return [];

  try {
    return await searchCommunitySummaries(query, limit);
  } catch {
    return [];
  }
}

// ── Web Search (SearXNG) ─────────────────────────────────────────────

export async function searchWeb(
  query: string,
  maxResults = 6
): Promise<WebSearchResult[]> {
  const endpoint = process.env.SEARXNG_ENDPOINT;
  if (!endpoint) return [];

  const url = new URL("/search", endpoint);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("pageno", "1");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    results?: Array<{
      title: string;
      url: string;
      content: string;
      score?: number;
    }>;
  };

  return (
    data.results?.slice(0, maxResults).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 500),
      score: r.score,
    })) ?? []
  );
}

// ── Wikipedia Search ─────────────────────────────────────────────────

export async function searchWikipedia(
  query: string
): Promise<WikiSearchResult | null> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1&srlimit=1`;
  const searchRes = await fetch(searchUrl);
  const searchData = (await searchRes.json()) as {
    query?: { search?: Array<{ title: string }> };
  };

  const results = searchData?.query?.search;
  if (!results?.length) return null;

  const title = results[0].title;
  const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&explaintext=1&format=json&utf8=1`;
  const contentRes = await fetch(contentUrl);
  const contentData = (await contentRes.json()) as {
    query?: { pages?: Record<string, { extract?: string }> };
  };

  const page = Object.values(contentData?.query?.pages ?? {})[0];
  const text = page?.extract ?? "";
  const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

  return {
    title,
    text: text.slice(0, 5000),
    url,
    snippet: text.slice(0, 300),
  };
}

// ── Retry Wrapper ────────────────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }
  throw lastError!;
}
