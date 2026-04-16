/**
 * GraphRAG Community Detection + Summarization
 *
 * Uses graphology + Louvain clustering (no Neo4j GDS required).
 * Pipeline: pull graph → detect communities → write IDs to Neo4j →
 *           summarize via LLM → embed + store in Qdrant.
 */

import Graph from "graphology";
import louvain from "graphology-communities-louvain";

import { ensureCommunityCollection } from "./collections";
import { embed, embedOne } from "./embed";
import { getQdrantClient, COMMUNITY_COLLECTION, uidToPointId } from "./qdrant";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommunityMember {
  uid: string;
  name: string;
  type: string;
  tags: string[];
  degree: number;
}

export interface Community {
  communityId: number;
  members: CommunityMember[];
  relationships: Array<{
    source: string;
    target: string;
    type: string;
  }>;
}

export interface CommunitySummaryPoint {
  communityId: number;
  summary: string;
  entityCount: number;
  topEntities: string[];
  topEntityTypes: string[];
  relationshipCount: number;
  generatedAt: string;
}

export interface CommunitySearchResult {
  communityId: number;
  summary: string;
  topEntities: string[];
  entityCount: number;
  score: number;
}

// ---------------------------------------------------------------------------
// 1. Pull graph from Neo4j into graphology
// ---------------------------------------------------------------------------

interface Neo4jClient {
  executeRead: (query: string, params?: Record<string, any>) => Promise<any>;
  executeWrite?: (query: string, params?: Record<string, any>) => Promise<any>;
}

export async function pullGraphToGraphology(
  client: Neo4jClient
): Promise<Graph> {
  const graph = new Graph({ multi: false, type: "undirected" });

  // Fetch all entities
  const nodesResult = await client.executeRead(
    `MATCH (e:Entity)
     WHERE e.uid IS NOT NULL AND e.name IS NOT NULL
     RETURN e.uid AS uid, e.name AS name, e.type AS type,
            COALESCE(e.tags, []) AS tags`
  );

  for (const record of nodesResult.records) {
    const uid = record.get("uid") as string;
    graph.addNode(uid, {
      name: record.get("name") as string,
      type: record.get("type") as string,
      tags: record.get("tags") as string[],
    });
  }

  if (graph.order === 0) return graph;

  // Fetch all relationships between entities
  const edgesResult = await client.executeRead(
    `MATCH (a:Entity)-[r]->(b:Entity)
     WHERE a.uid IS NOT NULL AND b.uid IS NOT NULL
     RETURN a.uid AS source, b.uid AS target, type(r) AS relType`
  );

  for (const record of edgesResult.records) {
    const source = record.get("source") as string;
    const target = record.get("target") as string;
    const relType = record.get("relType") as string;

    if (graph.hasNode(source) && graph.hasNode(target)) {
      // Skip self-loops and duplicate edges (undirected graph)
      if (source !== target && !graph.hasEdge(source, target)) {
        graph.addEdge(source, target, { type: relType });
      }
    }
  }

  return graph;
}

// ---------------------------------------------------------------------------
// 2. Detect communities via Louvain
// ---------------------------------------------------------------------------

export function detectCommunities(graph: Graph): Map<string, number> {
  if (graph.order === 0) return new Map();

  // graphology-communities-louvain assigns community to each node attribute
  louvain.assign(graph, { resolution: 1.0 });

  const mapping = new Map<string, number>();
  graph.forEachNode((uid, attrs) => {
    mapping.set(uid, attrs.community as number);
  });

  return mapping;
}

// ---------------------------------------------------------------------------
// 3. Write community IDs back to Neo4j
// ---------------------------------------------------------------------------

export async function writeCommunityIdsToNeo4j(
  client: Neo4jClient,
  mapping: Map<string, number>
): Promise<number> {
  if (mapping.size === 0) return 0;

  const batch: Array<{ uid: string; communityId: number }> = [];
  for (const [uid, communityId] of mapping) {
    batch.push({ uid, communityId });
  }

  // Batch write in chunks of 500
  const CHUNK_SIZE = 500;
  let written = 0;

  for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
    const chunk = batch.slice(i, i + CHUNK_SIZE);
    const writeClient = client.executeWrite ?? client.executeRead;
    await writeClient.call(
      client,
      `UNWIND $batch AS item
       MATCH (e:Entity {uid: item.uid})
       SET e.communityId = item.communityId`,
      { batch: chunk }
    );
    written += chunk.length;
  }

  return written;
}

// ---------------------------------------------------------------------------
// 4. Group communities from graph + mapping
// ---------------------------------------------------------------------------

export function groupCommunities(
  graph: Graph,
  mapping: Map<string, number>
): Community[] {
  const communityMap = new Map<number, Community>();

  // Group members
  for (const [uid, communityId] of mapping) {
    if (!communityMap.has(communityId)) {
      communityMap.set(communityId, {
        communityId,
        members: [],
        relationships: [],
      });
    }

    const attrs = graph.getNodeAttributes(uid);
    const community = communityMap.get(communityId)!;
    community.members.push({
      uid,
      name: attrs.name as string,
      type: attrs.type as string,
      tags: (attrs.tags as string[]) ?? [],
      degree: graph.degree(uid),
    });
  }

  // Collect intra-community relationships
  graph.forEachEdge((_edge, attrs, source, target) => {
    const srcCommunity = mapping.get(source);
    const tgtCommunity = mapping.get(target);
    if (
      srcCommunity !== undefined &&
      srcCommunity === tgtCommunity &&
      communityMap.has(srcCommunity)
    ) {
      communityMap.get(srcCommunity)!.relationships.push({
        source: graph.getNodeAttribute(source, "name") as string,
        target: graph.getNodeAttribute(target, "name") as string,
        type: attrs.type as string,
      });
    }
  });

  // Sort members by degree descending within each community
  for (const community of communityMap.values()) {
    community.members.sort((a, b) => b.degree - a.degree);
  }

  return Array.from(communityMap.values())
    .filter((c) => c.members.length >= 3) // Only summarize communities with 3+ entities
    .sort((a, b) => b.members.length - a.members.length);
}

// ---------------------------------------------------------------------------
// 5. Summarize communities via LLM
// ---------------------------------------------------------------------------

function buildCommunityPrompt(community: Community): string {
  const entities = community.members
    .slice(0, 20)
    .map((m) => {
      const tags = m.tags.length ? ` [${m.tags.join(", ")}]` : "";
      return `- ${m.name} (${m.type})${tags}`;
    })
    .join("\n");

  const relationships = community.relationships
    .slice(0, 15)
    .map((r) => `- ${r.source} --[${r.type}]--> ${r.target}`)
    .join("\n");

  return `Summarize this group of related entities from a knowledge graph. Describe the common theme, key actors, and how they connect. Be concise (2-3 sentences).

Entities (${community.members.length} total):
${entities}

Relationships:
${relationships || "(none)"}

Summary:`;
}

/**
 * Generates LLM summaries for communities, embeds them, and stores in Qdrant.
 *
 * @param communities - Grouped communities from groupCommunities()
 * @param generateText - Function that takes a prompt and returns generated text.
 *   Caller provides this to avoid a hard dependency on @protolabsai/llm-providers.
 */
export async function summarizeAndStoreCommunities(
  communities: Community[],
  generateText: (prompt: string) => Promise<string>
): Promise<number> {
  if (communities.length === 0) return 0;

  await ensureCommunityCollection();
  const client = getQdrantClient();
  const now = new Date().toISOString();

  let stored = 0;

  // Process in batches of 5 to manage LLM concurrency
  for (let i = 0; i < communities.length; i += 5) {
    const batch = communities.slice(i, i + 5);

    const summaries = await Promise.all(
      batch.map(async (community) => {
        const prompt = buildCommunityPrompt(community);
        const summary = await generateText(prompt);
        return { community, summary: summary.trim() };
      })
    );

    // Embed all summaries in one batch call
    const texts = summaries.map((s) => s.summary);
    const vectors = await embed(texts);

    // Build Qdrant points
    const points = summaries.map((s, idx) => {
      const topEntities = s.community.members.slice(0, 5).map((m) => m.name);

      const typeCounts = new Map<string, number>();
      for (const m of s.community.members) {
        typeCounts.set(m.type, (typeCounts.get(m.type) ?? 0) + 1);
      }
      const topEntityTypes = Array.from(typeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([t]) => t);

      return {
        id: uidToPointId(`community:${s.community.communityId}`),
        vector: vectors[idx],
        payload: {
          communityId: s.community.communityId,
          summary: s.summary,
          entityCount: s.community.members.length,
          topEntities,
          topEntityTypes,
          relationshipCount: s.community.relationships.length,
          generatedAt: now,
        } as Record<string, unknown>,
      };
    });

    await client.upsert(COMMUNITY_COLLECTION, {
      wait: false,
      points,
    });

    stored += points.length;
  }

  return stored;
}

// ---------------------------------------------------------------------------
// 6. Search community summaries
// ---------------------------------------------------------------------------

export async function searchCommunitySummaries(
  query: string,
  limit = 5
): Promise<CommunitySearchResult[]> {
  await ensureCommunityCollection();
  const client = getQdrantClient();
  const vector = await embedOne(query);

  const results = await client.search(COMMUNITY_COLLECTION, {
    vector,
    limit,
    with_payload: true,
  });

  return results
    .filter((r) => r.payload?.summary)
    .map((r) => ({
      communityId: r.payload!.communityId as number,
      summary: r.payload!.summary as string,
      topEntities: (r.payload!.topEntities as string[]) ?? [],
      entityCount: (r.payload!.entityCount as number) ?? 0,
      score: r.score,
    }));
}

// ---------------------------------------------------------------------------
// 7. Full pipeline orchestrator
// ---------------------------------------------------------------------------

export interface CommunityPipelineResult {
  nodeCount: number;
  edgeCount: number;
  communityCount: number;
  summarized: number;
  communitySizes: Array<{ communityId: number; size: number }>;
}

/**
 * Runs the full community detection + summarization pipeline.
 *
 * @param client - Neo4j client for graph queries
 * @param generateText - LLM text generation function
 */
export async function runCommunityPipeline(
  client: Neo4jClient,
  generateText: (prompt: string) => Promise<string>
): Promise<CommunityPipelineResult> {
  // 1. Pull graph
  const graph = await pullGraphToGraphology(client);
  if (graph.order === 0) {
    return {
      nodeCount: 0,
      edgeCount: 0,
      communityCount: 0,
      summarized: 0,
      communitySizes: [],
    };
  }

  // 2. Detect communities
  const mapping = detectCommunities(graph);

  // 3. Write community IDs back to Neo4j
  await writeCommunityIdsToNeo4j(client, mapping);

  // 4. Group and summarize
  const communities = groupCommunities(graph, mapping);
  const summarized = await summarizeAndStoreCommunities(
    communities,
    generateText
  );

  // 5. Build stats
  const communitySizes = communities.map((c) => ({
    communityId: c.communityId,
    size: c.members.length,
  }));

  return {
    nodeCount: graph.order,
    edgeCount: graph.size,
    communityCount: communities.length,
    summarized,
    communitySizes,
  };
}
