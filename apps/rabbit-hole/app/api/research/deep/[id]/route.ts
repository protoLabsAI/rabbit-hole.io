/**
 * Deep Research SSE Stream + Cancel
 *
 * GET  /api/research/deep/:id — Stream research progress as SSE
 * DELETE /api/research/deep/:id — Cancel a running research job
 *
 * Heartbeat every 15s. Supports reconnection via Last-Event-ID.
 */

import { NextRequest, NextResponse } from "next/server";

import { getResearch, cancelResearch } from "../research-store";

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

      // If already complete/failed/cancelled, send final state and close
      if (state.status !== "running") {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "state",
              data: {
                status: state.status,
                phase: state.phase,
                finalReport: state.finalReport,
                sources: state.sources,
                findings: state.findings,
                dimensions: state.dimensions,
                brief: state.brief,
                searchCount: state.searchCount,
                error: state.error,
              },
            })}\n\n`
          )
        );
        controller.close();
        return;
      }

      // Poll for new events + heartbeat
      const HEARTBEAT_MS = 15000;
      const POLL_MS = 300;
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

          // Check completion (including cancelled)
          if (current.status !== "running") {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "state",
                  data: {
                    status: current.status,
                    phase: current.phase,
                    finalReport: current.finalReport,
                    sources: current.sources,
                    findings: current.findings,
                    dimensions: current.dimensions,
                    brief: current.brief,
                    searchCount: current.searchCount,
                    error: current.error,
                  },
                })}\n\n`
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cancelled = cancelResearch(id);

  if (!cancelled) {
    const state = getResearch(id);
    if (!state) {
      return NextResponse.json(
        { success: false, error: "Research not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: `Cannot cancel — status is ${state.status}`,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
