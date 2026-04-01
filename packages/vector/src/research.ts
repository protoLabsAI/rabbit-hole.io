/**
 * Research session vector memory
 *
 * Single shared collection (research-memory) with per-session filtering.
 * Each chunk carries a sessionId payload so cleanup is a filtered delete.
 */

import { ensureResearchCollection } from "./collections";
import { embed, embedOne } from "./embed";
import { getQdrantClient, RESEARCH_COLLECTION } from "./qdrant";

export interface ResearchChunk {
  sessionId: string;
  content: string;
  /** Human-readable source label, e.g. "searxng:AI safety 2025" */
  source: string;
  hopIndex: number;
}

export async function upsertResearchChunks(
  chunks: ResearchChunk[]
): Promise<void> {
  if (chunks.length === 0) return;
  await ensureResearchCollection();
  const client = getQdrantClient();

  const vectors = await embed(chunks.map((c) => c.content));
  const now = Date.now();

  const points = chunks.map((chunk, i) => ({
    // Use timestamp + index for unique IDs; research chunks are ephemeral
    id: now * 1000 + i,
    vector: vectors[i],
    payload: {
      sessionId: chunk.sessionId,
      content: chunk.content,
      source: chunk.source,
      hopIndex: chunk.hopIndex,
    },
  }));

  await client.upsert(RESEARCH_COLLECTION, { wait: false, points });
}

export async function searchResearchMemory(
  query: string,
  sessionId: string,
  limit = 5
): Promise<Array<{ content: string; source: string; score: number }>> {
  await ensureResearchCollection();
  const client = getQdrantClient();
  const vector = await embedOne(query);

  const results = await client.search(RESEARCH_COLLECTION, {
    vector,
    limit,
    filter: {
      must: [{ key: "sessionId", match: { value: sessionId } }],
    },
    with_payload: ["content", "source", "score"],
  });

  return results.map((r) => ({
    content: r.payload?.content as string,
    source: r.payload?.source as string,
    score: r.score,
  }));
}

export async function clearResearchSession(sessionId: string): Promise<void> {
  const client = getQdrantClient();
  try {
    await client.delete(RESEARCH_COLLECTION, {
      filter: {
        must: [{ key: "sessionId", match: { value: sessionId } }],
      },
    });
  } catch {
    // Collection may not exist yet — not an error
  }
}
