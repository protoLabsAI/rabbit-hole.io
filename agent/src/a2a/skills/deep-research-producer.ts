/**
 * Deep Research Producer — A2A skill: "deep_research"
 *
 * Drives the rabbit-hole.io research pipeline via its HTTP API:
 *   POST /api/research/deep  → { researchId }
 *   GET  /api/research/deep/:id  → SSE stream of research events
 *   DELETE /api/research/deep/:id  → cancel
 *
 * Event mapping:
 *   report.chunk        → ctx.pushText(data.text)   (streams report as it's written)
 *   state (completed)   → ctx.finish()
 *   state (failed)      → ctx.fail(...)
 *   state (cancelled)   → ctx.fail(...)
 *   timeout             → ctx.fail(...)
 *
 * Cancel: when ctx.signal fires, the pending fetch aborts automatically.
 * An additional DELETE request is sent to cancel the server-side job.
 *
 * Env:
 *   RABBIT_HOLE_URL — Next.js app base URL (default http://localhost:3000)
 */

import type { ProducerFn } from "../store/task-store.js";

export const deepResearchProducer: ProducerFn = async (ctx, input) => {
  const base = (
    process.env["RABBIT_HOLE_URL"] ?? "http://localhost:3000"
  ).replace(/\/+$/, "");

  // ── Step 1: Start the research job ───────────────────────────────────
  let researchId: string;
  try {
    const startRes = await fetch(`${base}/api/research/deep`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: input, mode: "deep-research" }),
      signal: ctx.signal,
    });

    if (!startRes.ok) {
      const body = await startRes.text().catch(() => startRes.statusText);
      ctx.fail({
        code: -32603,
        message: `Failed to start research: HTTP ${startRes.status} — ${body}`,
      });
      return;
    }

    const startData = (await startRes.json()) as { researchId?: string };
    if (!startData.researchId) {
      ctx.fail({
        code: -32603,
        message: "Research API did not return a researchId",
      });
      return;
    }
    researchId = startData.researchId;
  } catch (err) {
    if (ctx.signal.aborted) return;
    ctx.fail({
      code: -32603,
      message: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  // ── Cancel hook: DELETE the server-side job when signal fires ────────
  const cancelServerJob = () => {
    void fetch(`${base}/api/research/deep/${researchId}`, {
      method: "DELETE",
    }).catch(() => {
      // Best-effort — ignore errors on cancel
    });
  };

  ctx.signal.addEventListener("abort", cancelServerJob, { once: true });

  // ── Step 2: Stream SSE events ─────────────────────────────────────────
  try {
    const sseRes = await fetch(`${base}/api/research/deep/${researchId}`, {
      headers: { Accept: "text/event-stream" },
      signal: ctx.signal,
    });

    if (!sseRes.ok) {
      ctx.fail({
        code: -32603,
        message: `SSE stream failed: HTTP ${sseRes.status}`,
      });
      return;
    }

    const reader = sseRes.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let finished = false;

    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const payload = line.slice(6).trim();
        if (!payload) continue;

        let event: { type: string; data?: unknown };
        try {
          event = JSON.parse(payload) as { type: string; data?: unknown };
        } catch {
          continue;
        }

        finished = handleSseEvent(event, ctx);
        if (finished) break;
      }
    }

    // SSE closed without a terminal event — treat as completion if we have content
    if (!finished && !ctx.signal.aborted) {
      ctx.finish();
    }
  } catch (err) {
    if (ctx.signal.aborted) return;
    ctx.fail({
      code: -32603,
      message: err instanceof Error ? err.message : String(err),
    });
  } finally {
    ctx.signal.removeEventListener("abort", cancelServerJob);
  }
};

// ── SSE event handler ────────────────────────────────────────────────

interface ReportChunkData {
  text: string;
}
interface StateData {
  status: "completed" | "failed" | "cancelled" | "running";
  error?: string | null;
  finalReport?: string;
}

/**
 * Handles one parsed SSE event.
 * Returns true when a terminal event is received (finished or failed).
 */
function handleSseEvent(
  event: { type: string; data?: unknown },
  ctx: {
    pushText: (chunk: string) => void;
    finish: () => void;
    fail: (error: { code: number; message: string }) => void;
    signal: AbortSignal;
  }
): boolean {
  if (ctx.signal.aborted) return true;

  switch (event.type) {
    case "report.chunk": {
      const d = event.data as ReportChunkData | undefined;
      if (d?.text) ctx.pushText(d.text);
      return false;
    }

    case "state": {
      const d = event.data as StateData | undefined;
      if (!d) return false;

      if (d.status === "completed") {
        ctx.finish();
        return true;
      }
      if (d.status === "failed") {
        ctx.fail({
          code: -32603,
          message: d.error ?? "Deep research failed",
        });
        return true;
      }
      if (d.status === "cancelled") {
        ctx.fail({
          code: -32603,
          message: "Research was cancelled before completing",
        });
        return true;
      }
      return false;
    }

    case "timeout": {
      ctx.fail({ code: -32603, message: "Research timed out" });
      return true;
    }

    case "research.error": {
      const d = event.data as { message?: string } | undefined;
      ctx.fail({
        code: -32603,
        message: d?.message ?? "Research encountered an error",
      });
      return true;
    }

    default:
      return false;
  }
}
