-- Migration 019: Corpus chunks for pgvector search
-- Purpose: Store embedded chunks of ingested documents so search can run
--          over attached files. Replaces the retired Neo4j/Qdrant graph
--          search. Embeddings are qwen3-embedding (1024-dim) via the gateway.
-- Target: rabbit_hole_app database (pgvector extension required).

SET search_path TO public;

-- pgvector — guaranteed present in the homelab image
-- (pgvector/pgvector:pg17 + stacks/rabbit-hole init), but declare here too
-- so self-hosters on a plain postgres get a clear failure if the extension
-- binary is missing rather than a confusing syntax error on vector().
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS corpus_chunks (
    id           BIGSERIAL PRIMARY KEY,
    -- Groups all chunks of one ingested document; matches the ingest jobId.
    document_id  TEXT NOT NULL,
    -- Human-facing origin: a URL or a filename.
    source       TEXT NOT NULL,
    -- 0-based position of this chunk within its document.
    chunk_index  INTEGER NOT NULL,
    content      TEXT NOT NULL,
    -- qwen3-embedding dimensionality. Keep in sync with CORPUS_EMBED_DIMS
    -- in packages/vector/src/corpus.ts.
    embedding    vector(1024) NOT NULL,
    metadata     JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (document_id, chunk_index)
);

-- HNSW index for fast approximate cosine nearest-neighbour search.
-- vector_cosine_ops pairs with the `<=>` operator used by searchCorpus().
CREATE INDEX IF NOT EXISTS corpus_chunks_embedding_idx
    ON corpus_chunks USING hnsw (embedding vector_cosine_ops);

-- Fast delete/re-index by document.
CREATE INDEX IF NOT EXISTS corpus_chunks_document_idx
    ON corpus_chunks (document_id);
