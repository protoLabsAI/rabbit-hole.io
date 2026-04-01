/**
 * Collection setup helpers — idempotent, safe to call on every boot.
 */

import {
  getQdrantClient,
  EMBED_DIMS,
  KG_COLLECTION,
  RESEARCH_COLLECTION,
  COMMUNITY_COLLECTION,
} from "./qdrant";

export async function ensureKgCollection(): Promise<void> {
  const client = getQdrantClient();
  const { collections } = await client.getCollections();
  if (collections.some((c) => c.name === KG_COLLECTION)) return;

  await client.createCollection(KG_COLLECTION, {
    vectors: { size: EMBED_DIMS, distance: "Cosine" },
  });
}

export async function ensureResearchCollection(): Promise<void> {
  const client = getQdrantClient();
  const { collections } = await client.getCollections();
  if (collections.some((c) => c.name === RESEARCH_COLLECTION)) return;

  await client.createCollection(RESEARCH_COLLECTION, {
    vectors: { size: EMBED_DIMS, distance: "Cosine" },
  });

  // Payload index on sessionId for fast per-session filtering
  await client.createPayloadIndex(RESEARCH_COLLECTION, {
    field_name: "sessionId",
    field_schema: "keyword",
  });
}

export async function ensureCommunityCollection(): Promise<void> {
  const client = getQdrantClient();
  const { collections } = await client.getCollections();
  if (collections.some((c) => c.name === COMMUNITY_COLLECTION)) return;

  await client.createCollection(COMMUNITY_COLLECTION, {
    vectors: { size: EMBED_DIMS, distance: "Cosine" },
  });

  await client.createPayloadIndex(COMMUNITY_COLLECTION, {
    field_name: "communityId",
    field_schema: "integer",
  });
}
