/**
 * Corpus search over ingested documents — pgvector adapter.
 *
 * Replaces the retired Neo4j/Qdrant knowledge-graph search. Ingested docs
 * (via the job-processor) are chunked, embedded with `qwen3-embedding`
 * (1024-dim) through the gateway, and stored as `vector(1024)` rows in the
 * `corpus_chunks` table on the rabbit_hole_app Postgres (pgvector extension,
 * see migration 019). Query side embeds the question and does a cosine
 * `<=>` nearest-neighbour search.
 *
 * The Pool is injected by the caller (job-processor / API route) so this
 * package stays decoupled from connection management — use
 * `getGlobalPostgresPool()` from `@protolabsai/database`.
 */

import type { Pool } from "pg";

import { embed, embedOne } from "./embed";

/** Must match the vector(N) column width in migration 019 + qwen3-embedding. */
export const CORPUS_EMBED_DIMS = 1024;

export interface CorpusChunkInput {
  /** 0-based position of the chunk within its source document. */
  chunkIndex: number;
  content: string;
}

export interface CorpusSearchHit {
  documentId: string;
  source: string;
  chunkIndex: number;
  content: string;
  /** Cosine similarity in [0,1] — higher is closer. */
  score: number;
  metadata: Record<string, unknown> | null;
}

/** Serialize a JS number[] into the pgvector text literal `[a,b,c]`. */
function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

/**
 * Replace all chunks for a document, then insert the new embedded set.
 * Idempotent on re-ingest of the same documentId.
 */
export async function upsertCorpusChunks(
  pool: Pool,
  opts: {
    documentId: string;
    source: string;
    chunks: CorpusChunkInput[];
    metadata?: Record<string, unknown>;
  }
): Promise<number> {
  const { documentId, source, chunks, metadata } = opts;
  if (chunks.length === 0) return 0;

  const vectors = await embed(chunks.map((c) => c.content));
  if (vectors.length !== chunks.length) {
    throw new Error(
      `embedding count mismatch: got ${vectors.length} for ${chunks.length} chunks`
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Idempotent: clear any prior chunks for this document first.
    await client.query("DELETE FROM corpus_chunks WHERE document_id = $1", [
      documentId,
    ]);

    const metaJson = metadata ? JSON.stringify(metadata) : null;
    for (let i = 0; i < chunks.length; i++) {
      await client.query(
        `INSERT INTO corpus_chunks
           (document_id, source, chunk_index, content, embedding, metadata)
         VALUES ($1, $2, $3, $4, $5::vector, $6::jsonb)`,
        [
          documentId,
          source,
          chunks[i].chunkIndex,
          chunks[i].content,
          toVectorLiteral(vectors[i]),
          metaJson,
        ]
      );
    }
    await client.query("COMMIT");
    return chunks.length;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Embed the query and return the top-k most similar chunks across the corpus.
 * `<=>` is pgvector's cosine distance; similarity = 1 - distance.
 */
export async function searchCorpus(
  pool: Pool,
  query: string,
  opts: { topK?: number } = {}
): Promise<CorpusSearchHit[]> {
  const topK = opts.topK ?? 8;
  const queryVec = await embedOne(query);

  const res = await pool.query(
    `SELECT document_id, source, chunk_index, content, metadata,
            1 - (embedding <=> $1::vector) AS score
       FROM corpus_chunks
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
    [toVectorLiteral(queryVec), topK]
  );

  return res.rows.map((r) => ({
    documentId: r.document_id,
    source: r.source,
    chunkIndex: r.chunk_index,
    content: r.content,
    score: Number(r.score),
    metadata: r.metadata ?? null,
  }));
}

/** Drop every chunk for a document (e.g. on delete/re-index). */
export async function deleteCorpusDocument(
  pool: Pool,
  documentId: string
): Promise<number> {
  const res = await pool.query(
    "DELETE FROM corpus_chunks WHERE document_id = $1",
    [documentId]
  );
  return res.rowCount ?? 0;
}
