/**
 * GET /api/ingest/progress?jobId=xxx
 *
 * SSE endpoint that listens to PostgreSQL NOTIFY on media_ingestion_progress
 * and forwards matching events to the client.
 */

import { NextRequest } from "next/server";
import type { PoolClient } from "pg";

import { getGlobalPostgresPool } from "@protolabsai/database";

function releaseClient(client: PoolClient | null) {
  if (client) {
    try {
      client.release();
    } catch {
      // Already released
    }
  }
}

export async function GET(req: NextRequest) {
  const userId = "local-user";
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return new Response("Missing jobId parameter", { status: 400 });
  }

  const encoder = new TextEncoder();
  // Store client ref for cancel() cleanup
  const clientRef: { current: PoolClient | null } = { current: null };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const pool = getGlobalPostgresPool();
        const client = await pool.connect();
        clientRef.current = client;

        // Send initial connected event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "connected", jobId })}\n\n`
          )
        );

        // Listen for progress notifications
        await client.query("LISTEN media_ingestion_progress");

        client.on("notification", (msg) => {
          if (!msg.payload) return;

          try {
            const payload = JSON.parse(msg.payload);
            // Only forward events for the requested jobId
            if (payload.jobId === jobId) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
              );

              // Close stream on terminal states
              if (
                payload.status === "completed" ||
                payload.status === "failed"
              ) {
                controller.close();
                releaseClient(clientRef.current);
                clientRef.current = null;
              }
            }
          } catch {
            // Ignore malformed payloads
          }
        });

        // Heartbeat every 15s to keep connection alive
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch {
            clearInterval(heartbeat);
          }
        }, 15000);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(heartbeat);
          try {
            controller.close();
          } catch {
            // Already closed
          }
          releaseClient(clientRef.current);
          clientRef.current = null;
        }, 300000);
      } catch (error) {
        console.error("[/api/ingest/progress] SSE error:", error);
        controller.error(error);
        releaseClient(clientRef.current);
        clientRef.current = null;
      }
    },
    cancel() {
      releaseClient(clientRef.current);
      clientRef.current = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
