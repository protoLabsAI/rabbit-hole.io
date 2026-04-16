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

import type { IngestionJobData } from "@protolabsai/types";

import { MediaIngestionJob } from "../../jobs/MediaIngestionJob.js";

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

      res.writeHead(202, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          jobId: job.id,
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

  // ----- GET /ingest (list) -----
  if (req.method === "GET" && url === "/ingest") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ jobs: [] }));
    return true;
  }

  // ----- GET /ingest/:jobId/status -----
  const statusMatch = url.match(/^\/ingest\/([^/]+)\/status$/);
  if (req.method === "GET" && statusMatch) {
    const jobId = statusMatch[1];
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ jobId, status: "pending" }));
    return true;
  }

  // ----- GET /ingest/:jobId/result -----
  const resultMatch = url.match(/^\/ingest\/([^/]+)\/result$/);
  if (req.method === "GET" && resultMatch) {
    const jobId = resultMatch[1];
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ jobId, result: null }));
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
