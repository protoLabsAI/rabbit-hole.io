/**
 * Job Processor HTTP API Server
 *
 * Provides HTTP endpoints for job enqueueing.
 * Next.js calls this API instead of inserting directly into PostgreSQL.
 */

import http from "http";

import { Sidequest } from "sidequest";

import { getGlobalPostgresPool } from "@protolabsai/database";
import { searchCorpus } from "@protolabsai/vector";

import { TextExtractionJob } from "./jobs/TextExtractionJob.js";
import { handleIngestionRequest } from "./src/api/ingestion-routes.js";

export function createAPIServer(port: number = 8680) {
  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    // Ingestion routes (POST /ingest, GET /ingest, GET /ingest/:jobId/stream)
    const handled = await handleIngestionRequest(req, res);
    if (handled) return;

    // GET /search?q=<query>&topK=<n> — corpus search over ingested docs
    // (pgvector cosine). Backs `rh recall` + the search UI.
    if (req.method === "GET" && req.url?.startsWith("/search")) {
      try {
        const url = new URL(req.url, "http://localhost");
        const q = url.searchParams.get("q")?.trim();
        if (!q) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "missing required query param: q" }));
          return;
        }
        const topKRaw = parseInt(url.searchParams.get("topK") || "8", 10);
        const topK = Number.isFinite(topKRaw)
          ? Math.min(Math.max(topKRaw, 1), 50)
          : 8;

        const hits = await searchCorpus(getGlobalPostgresPool(), q, { topK });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ query: q, count: hits.length, hits }));
      } catch (error: any) {
        console.error("❌ Corpus search failed:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "corpus search failed",
            message: error.message,
          })
        );
      }
      return;
    }

    // POST /enqueue/text-extraction
    if (req.method === "POST" && req.url === "/enqueue/text-extraction") {
      try {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
        }

        const data = JSON.parse(body);

        const job = await Sidequest.build(TextExtractionJob)
          .queue("file-processing")
          .enqueue(data);

        res.writeHead(202, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            jobId: job.id,
            queue: "file-processing",
          })
        );
      } catch (error: any) {
        console.error("❌ Failed to enqueue text extraction job:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Failed to enqueue job",
            message: error.message,
          })
        );
      }
      return;
    }

    // GET /health
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "healthy",
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    // 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  server.listen(port, () => {
    console.log(`🌐 Job API server running on port ${port}`);
    console.log(`   POST /enqueue/text-extraction`);
    console.log(`   POST /ingest`);
    console.log(`   GET  /ingest`);
    console.log(`   GET  /ingest/:jobId/stream`);
    console.log(`   GET  /health`);
  });

  return server;
}
