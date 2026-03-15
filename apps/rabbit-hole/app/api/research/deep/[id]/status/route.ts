/**
 * Deep Research Status — Polling Fallback
 *
 * GET /api/research/deep/:id/status
 * Returns current research state for clients that can't use SSE.
 */

import { NextRequest, NextResponse } from "next/server";

import { getResearch } from "../../research-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const state = getResearch(id);

  if (!state) {
    return NextResponse.json(
      { success: false, error: "Research not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: state.id,
      query: state.query,
      status: state.status,
      phase: state.phase,
      phaseDetail: state.phaseDetail,
      supervisorIteration: state.supervisorIteration,
      maxIterations: state.maxIterations,
      notesCount: state.notes.length,
      sourcesCount: state.sources.length,
      eventCount: state.events.length,
      finalReport: state.status === "completed" ? state.finalReport : null,
      sources: state.sources,
      error: state.error,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      elapsed: Date.now() - state.startedAt,
    },
  });
}
