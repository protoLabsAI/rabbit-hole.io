/**
 * Deep Research SSE Stream
 *
 * GET /api/research/deep/:id
 * Streams research progress as Server-Sent Events.
 * Heartbeat every 15s. Supports reconnection via Last-Event-ID.
 */

import { NextRequest } from "next/server";

import { getResearch } from "../research-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const state = getResearch(id);

  if (!state) {
    return new Response(JSON.stringify({ error: "Research not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check for reconnection — resume from last event
  const lastEventId = request.headers.get("last-event-id");
  let startFromIndex = 0;
  if (lastEventId && state.events.length > 0) {
    const idx = state.events.findIndex((e) => e.id === lastEventId);
    if (idx >= 0) startFromIndex = idx + 1;
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send retry interval
      controller.enqueue(encoder.encode("retry: 5000\n\n"));

      // Send all events since last seen
      let sentIndex = startFromIndex;
      for (let i = startFromIndex; i < state.events.length; i++) {
        const event = state.events[i];
        controller.enqueue(
          encoder.encode(
            `id: ${event.id}\ndata: ${JSON.stringify({ type: event.type, data: event.data, timestamp: event.timestamp })}\n\n`
          )
        );
        sentIndex = i + 1;
      }

      // If already complete, send final state and close
      if (state.status === "completed" || state.status === "failed") {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "state", data: { status: state.status, phase: state.phase, finalReport: state.finalReport, sources: state.sources, error: state.error } })}\n\n`
          )
        );
        controller.close();
        return;
      }

      // Poll for new events + heartbeat
      const HEARTBEAT_MS = 15000;
      const POLL_MS = 500;
      const MAX_DURATION_MS = 25 * 60 * 1000; // 25 min max
      const startTime = Date.now();
      let lastHeartbeat = Date.now();

      const poll = async () => {
        while (true) {
          // Check timeout
          if (Date.now() - startTime > MAX_DURATION_MS) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "timeout" })}\n\n`)
            );
            controller.close();
            return;
          }

          // Refresh state reference
          const current = getResearch(id);
          if (!current) {
            controller.close();
            return;
          }

          // Send new events
          while (sentIndex < current.events.length) {
            const event = current.events[sentIndex];
            controller.enqueue(
              encoder.encode(
                `id: ${event.id}\ndata: ${JSON.stringify({ type: event.type, data: event.data, timestamp: event.timestamp })}\n\n`
              )
            );
            sentIndex++;
          }

          // Check completion
          if (current.status === "completed" || current.status === "failed") {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "state", data: { status: current.status, phase: current.phase, finalReport: current.finalReport, sources: current.sources, error: current.error } })}\n\n`
              )
            );
            controller.close();
            return;
          }

          // Heartbeat
          if (Date.now() - lastHeartbeat > HEARTBEAT_MS) {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
            lastHeartbeat = Date.now();
          }

          // Wait before next poll
          await new Promise((r) => setTimeout(r, POLL_MS));
        }
      };

      poll().catch(() => {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
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
