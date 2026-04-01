/**
 * KG entity vector operations
 *
 * Upserts entity embeddings to the kg-entities collection and
 * provides semantic search over entities.
 */

import { ensureKgCollection } from "./collections";
import { embedOne } from "./embed";
import { getQdrantClient, KG_COLLECTION, uidToPointId } from "./qdrant";

export interface KgEntityPoint {
  uid: string;
  name: string;
  type: string;
  tags: string[];
  aliases: string[];
}

/**
 * Builds a compact text representation of an entity for embedding.
 * Richer context → better semantic search.
 */
function buildEntityText(entity: KgEntityPoint): string {
  const parts = [`${entity.name} (${entity.type})`];
  if (entity.tags?.length) parts.push(`tags: ${entity.tags.join(", ")}`);
  if (entity.aliases?.length)
    parts.push(`also known as: ${entity.aliases.join(", ")}`);
  return parts.join(". ");
}

export async function upsertEntityVector(entity: KgEntityPoint): Promise<void> {
  await ensureKgCollection();
  const client = getQdrantClient();
  const vector = await embedOne(buildEntityText(entity));

  await client.upsert(KG_COLLECTION, {
    wait: false, // fire-and-forget; don't block ingest
    points: [
      {
        id: uidToPointId(entity.uid),
        vector,
        payload: {
          uid: entity.uid,
          name: entity.name,
          type: entity.type,
          tags: entity.tags ?? [],
          aliases: entity.aliases ?? [],
        },
      },
    ],
  });
}

export async function searchKgVector(
  query: string,
  limit = 20
): Promise<Array<{ uid: string; score: number }>> {
  await ensureKgCollection();
  const client = getQdrantClient();
  const vector = await embedOne(query);

  const results = await client.search(KG_COLLECTION, {
    vector,
    limit,
    with_payload: ["uid"],
  });

  return results
    .filter((r) => typeof r.payload?.uid === "string")
    .map((r) => ({ uid: r.payload!.uid as string, score: r.score }));
}
