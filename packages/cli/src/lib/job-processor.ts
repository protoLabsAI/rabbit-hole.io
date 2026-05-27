/**
 * Typed client for the job-processor HTTP API (port 8680).
 *
 * The job-processor is the rabbit-hole worker — postgres-backed Sidequest
 * queue, MinIO blob store. The CLI uses it to enqueue media ingest jobs
 * (PDF parse, audio transcript, URL fetch, etc.) and poll for status.
 *
 * Surface (from services/job-processor/src/api/ingestion-routes.ts):
 *   POST /ingest                    enqueue (caller generates jobId)
 *   GET  /ingest/:jobId/status      status
 *   GET  /ingest/:jobId/result      final extraction result
 *   GET  /ingest/:jobId/stream      SSE progress
 *   GET  /ingest                    list (placeholder, returns [])
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename } from "node:path";

export type SerializedIngestSource =
  | {
      type: "file";
      /** base64 file contents */
      bufferBase64: string;
      mediaType: string;
      fileName?: string;
    }
  | {
      type: "url";
      url: string;
      mediaType?: string;
    };

export type IngestRequest = {
  source: SerializedIngestSource;
  workspaceId?: string;
  requestedBy?: string;
  metadata?: Record<string, unknown>;
};

export type EnqueueResult = {
  success: boolean;
  jobId: string;
  queue: string;
};

export type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "waiting"
  | string;

export type StatusResponse = {
  jobId: string;
  status: JobStatus;
  progress?: unknown;
  error?: string;
  [k: string]: unknown;
};

export type CorpusHit = {
  documentId: string;
  source: string;
  chunkIndex: number;
  content: string;
  score: number;
  metadata: Record<string, unknown> | null;
};

export type CorpusSearchResponse = {
  query: string;
  count: number;
  hits: CorpusHit[];
};

const MIME = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  html: "text/html",
  htm: "text/html",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  mp4: "video/mp4",
  mkv: "video/x-matroska",
  webm: "video/webm",
} as const;

export class JobProcessorClient {
  constructor(private baseUrl: string) {}

  /**
   * Enqueue an ingest job from a local file path or a URL string.
   * Returns the jobId the worker now owns.
   */
  async ingest(input: {
    source: string;
    mediaType?: string;
    metadata?: Record<string, unknown>;
  }): Promise<EnqueueResult> {
    const jobId = randomUUID();
    const request: IngestRequest = {
      source: toSerializedSource(input.source, input.mediaType),
      metadata: input.metadata,
    };
    const r = await fetch(`${this.baseUrl}/ingest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId, request }),
    });
    if (!r.ok)
      throw new Error(`POST /ingest failed: ${r.status} ${await r.text()}`);
    return (await r.json()) as EnqueueResult;
  }

  async status(jobId: string): Promise<StatusResponse> {
    const r = await fetch(`${this.baseUrl}/ingest/${jobId}/status`);
    if (!r.ok)
      throw new Error(`status ${jobId} failed: ${r.status} ${await r.text()}`);
    return (await r.json()) as StatusResponse;
  }

  async result(jobId: string): Promise<unknown> {
    const r = await fetch(`${this.baseUrl}/ingest/${jobId}/result`);
    if (!r.ok)
      throw new Error(`result ${jobId} failed: ${r.status} ${await r.text()}`);
    return await r.json();
  }

  /** Corpus search over ingested docs (pgvector cosine) via GET /search. */
  async recall(
    query: string,
    opts: { topK?: number } = {}
  ): Promise<CorpusSearchResponse> {
    const u = new URL(`${this.baseUrl}/search`);
    u.searchParams.set("q", query);
    if (opts.topK) u.searchParams.set("topK", String(opts.topK));
    const r = await fetch(u);
    if (!r.ok) throw new Error(`recall failed: ${r.status} ${await r.text()}`);
    return (await r.json()) as CorpusSearchResponse;
  }

  async waitFor(
    jobId: string,
    opts: { intervalMs?: number; timeoutMs?: number } = {}
  ): Promise<StatusResponse> {
    const interval = opts.intervalMs ?? 2000;
    const deadline = Date.now() + (opts.timeoutMs ?? 5 * 60_000);
    while (Date.now() < deadline) {
      const s = await this.status(jobId);
      if (
        s.status === "completed" ||
        s.status === "failed" ||
        s.status === "cancelled"
      )
        return s;
      await new Promise((r) => setTimeout(r, interval));
    }
    throw new Error(`timed out waiting for job ${jobId}`);
  }
}

function toSerializedSource(
  source: string,
  mediaTypeHint?: string
): SerializedIngestSource {
  if (/^https?:\/\//.test(source)) {
    return { type: "url", url: source, mediaType: mediaTypeHint };
  }
  const buf = readFileSync(source);
  const fileName = basename(source);
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const mediaType =
    mediaTypeHint ||
    MIME[ext as keyof typeof MIME] ||
    "application/octet-stream";
  return {
    type: "file",
    bufferBase64: buf.toString("base64"),
    mediaType,
    fileName,
  };
}
