-- Migration 020: Media ingestion job status
-- Purpose: Persist the lifecycle of a media-ingestion job (keyed by the
--          caller's jobId) so GET /ingest/:jobId/status and /result can
--          report real state. Previously those endpoints were stubs that
--          always returned "pending"/null, so `rh status` / `rh ingest --wait`
--          could never observe completion (#289 follow-up).
--
--          Completion was only emitted via an ephemeral pg_notify; this table
--          is the durable record the HTTP routes read.
-- Target: rabbit_hole_app database (same as corpus_chunks; written via
--         getGlobalPostgresPool() in the job-processor).

SET search_path TO public;

CREATE TABLE IF NOT EXISTS media_ingestion_status (
    -- The caller-provided jobId (also corpus_chunks.document_id).
    job_id          TEXT PRIMARY KEY,
    -- queued | processing | completed | failed
    status          TEXT NOT NULL,
    workspace_id    TEXT,
    requested_by    TEXT,
    -- MinIO object key of the stored result.json (set on completion).
    results_key     TEXT,
    category        TEXT,
    text_length     INTEGER,
    artifacts_count INTEGER,
    error           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recent-jobs listing / housekeeping by recency.
CREATE INDEX IF NOT EXISTS media_ingestion_status_created_idx
    ON media_ingestion_status (created_at DESC);
