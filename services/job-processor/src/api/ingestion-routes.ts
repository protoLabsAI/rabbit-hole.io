/**
 * Ingestion HTTP Route Handler
 *
 * Handles HTTP requests for media ingestion:
 *   POST /ingest                   – enqueue a new ingestion job
 *   GET  /ingest/:jobId/status     – get the current job status
 *   GET  /ingest/:jobId/result     – retrieve the extraction result
 *   GET  /ingest/:jobId/stream     – SSE stream of job progress
 *   GET  /ingest                   – list recent ingestion jobs
 *
 * Returns false for routes it does not own so the caller can fall through
 * to the next handler.
 */

import type { IncomingMessage, ServerResponse } from "http";

import { Sidequest } from "sidequest";

import { getGlobalPostgresPool } from "@protolabsai/database";
import type { IngestionJobData } from "@protolabsai/types";
import { MinioService } from "@protolabsai/utils/storage";

import { MediaIngestionJob } from "../../jobs/MediaIngestionJob.js";

const RESULTS_BUCKET = process.env.MINIO_RESULTS_BUCKET || "evidence-processed";

// ==================== handleIngestionRequest ====================

export async function handleIngestionRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const url = req.url ?? "";

  // ----- POST /ingest -----
  if (req.method === "POST" && url === "/ingest") {
    try {
      let rawBody = "";
      for await (const chunk of req) {
        rawBody += chunk;
      }

      let body: Record<string, unknown>;
      try {
        body = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
        return true;
      }

      if (!body.jobId || !body.request) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ error: "Missing required fields: jobId, request" })
        );
        return true;
      }

      const job = await Sidequest.build(MediaIngestionJob)
        .queue("media-ingestion")
        .enqueue(body as unknown as IngestionJobData);

      // Record the initial "queued" state so status is queryable immediately,
      // before the worker picks the job up and flips it to processing. The job
      // itself owns the processing/completed/failed transitions. Best-effort.
      const reqMeta = (body.request ?? {}) as Record<string, unknown>;
      await getGlobalPostgresPool()
        .query(
          `INSERT INTO media_ingestion_status
             (job_id, status, workspace_id, requested_by)
           VALUES ($1, 'queued', $2, $3)
           ON CONFLICT (job_id) DO NOTHING`,
          [body.jobId, reqMeta.workspaceId ?? null, reqMeta.requestedBy ?? null]
        )
        .catch((err: unknown) => {
          console.warn(
            "⚠️ failed to record queued status:",
            err instanceof Error ? err.message : err
          );
        });

      // Echo back the caller's jobId — that's the id the caller tracks and the
      // one carried through the job payload (IngestionJobData.jobId). job.id is
      // Sidequest's internal auto-increment (process-lifetime, collides across
      // restarts/replicas); surface it separately for correlation only. (#289)
      res.writeHead(202, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          jobId: body.jobId,
          sidequestId: job.id,
          queue: "media-ingestion",
        })
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("❌ /ingest enqueue failed:", message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to enqueue job", message }));
    }
    return true;
  }

  // ----- GET /ingest (list recent jobs) -----
  if (req.method === "GET" && url === "/ingest") {
    try {
      const { rows } = await getGlobalPostgresPool().query(
        `SELECT job_id, status, category, error, created_at, updated_at
           FROM media_ingestion_status
          ORDER BY created_at DESC
          LIMIT 50`
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jobs: rows.map((r) => ({
            jobId: r.job_id,
            status: r.status,
            category: r.category,
            error: r.error,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          })),
        })
      );
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Failed to list jobs",
          message: err instanceof Error ? err.message : "Unknown error",
        })
      );
    }
    return true;
  }

  // ----- GET /ingest/:jobId/status -----
  const statusMatch = url.match(/^\/ingest\/([^/]+)\/status$/);
  if (req.method === "GET" && statusMatch) {
    const jobId = statusMatch[1];
    try {
      const { rows } = await getGlobalPostgresPool().query(
        `SELECT status, category, error, text_length, artifacts_count,
                created_at, updated_at
           FROM media_ingestion_status WHERE job_id = $1`,
        [jobId]
      );
      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jobId, status: "unknown" }));
        return true;
      }
      const row = rows[0];
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jobId,
          status: row.status,
          category: row.category,
          textLength: row.text_length,
          artifactsCount: row.artifacts_count,
          error: row.error,
          updatedAt: row.updated_at,
        })
      );
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Failed to get status",
          message: err instanceof Error ? err.message : "Unknown error",
        })
      );
    }
    return true;
  }

  // ----- GET /ingest/:jobId/result -----
  const resultMatch = url.match(/^\/ingest\/([^/]+)\/result$/);
  if (req.method === "GET" && resultMatch) {
    const jobId = resultMatch[1];
    try {
      const { rows } = await getGlobalPostgresPool().query(
        `SELECT status, results_key FROM media_ingestion_status WHERE job_id = $1`,
        [jobId]
      );
      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jobId, status: "unknown", result: null }));
        return true;
      }
      const { status, results_key } = rows[0];
      if (status !== "completed" || !results_key) {
        // Not done yet (or no stored artifact) — report status, no result.
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jobId, status, result: null }));
        return true;
      }
      // Fetch the stored result.json from MinIO (evidence-processed bucket).
      const buf = await new MinioService().downloadFile(
        results_key,
        RESULTS_BUCKET
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jobId,
          status,
          result: JSON.parse(buf.toString("utf-8")),
        })
      );
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Failed to get result",
          message: err instanceof Error ? err.message : "Unknown error",
        })
      );
    }
    return true;
  }

  // ----- GET /ingest/:jobId/stream (SSE) -----
  const streamMatch = url.match(/^\/ingest\/([^/]+)\/stream$/);
  if (req.method === "GET" && streamMatch) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write('data: {"type":"connected"}\n\n');
    res.end();
    return true;
  }

  return false;
}
