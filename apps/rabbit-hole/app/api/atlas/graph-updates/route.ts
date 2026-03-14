/**
 * Graph Updates SSE Endpoint
 *
 * GET /api/atlas/graph-updates
 *
 * Streams real-time graph mutations (new entities, relationships)
 * to connected Atlas clients via Server-Sent Events.
 */

import { NextRequest } from "next/server";

import { graphUpdateEmitter, type GraphUpdateEvent } from "./emitter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial keepalive to flush proxies
      controller.enqueue(encoder.encode(": connected\n\n"));

      const onUpdate = (event: GraphUpdateEvent) => {
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          // Stream closed, will be cleaned up by abort handler
        }
      };

      graphUpdateEmitter.on("graph-update", onUpdate);

      // Keepalive every 15s
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 15000);

      // Cleanup on disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        graphUpdateEmitter.removeListener("graph-update", onUpdate);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
