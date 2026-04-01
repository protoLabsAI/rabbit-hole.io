/**
 * Qdrant client singleton + shared constants
 */

import { QdrantClient } from "@qdrant/js-client-rest";

let _client: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (!_client) {
    const url = process.env.QDRANT_URL || "http://localhost:6333";
    _client = new QdrantClient({ url });
  }
  return _client;
}

/** Dimensions for qwen3-embedding:0.6b */
export const EMBED_DIMS = 1024;

/** Persistent collection for KG entity embeddings */
export const KG_COLLECTION = "kg-entities";

/** Single collection for all research session memory, filtered by sessionId */
export const RESEARCH_COLLECTION = "research-memory";

/**
 * Deterministic point ID from an entity UID string.
 * Uses FNV-1a 32-bit hash — collision probability negligible at KG scale.
 */
export function uidToPointId(uid: string): number {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < uid.length; i++) {
    hash ^= uid.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
    hash = hash >>> 0; // unsigned 32-bit
  }
  return hash;
}
