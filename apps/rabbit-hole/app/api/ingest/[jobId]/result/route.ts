/**
 * GET /api/ingest/[jobId]/result
 *
 * Proxy for job-processor's /ingest/:jobId/result endpoint.
 * Returns the extraction result (text, metadata, artifacts).
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const JOB_PROCESSOR_URL =
  process.env.JOB_PROCESSOR_URL || "http://localhost:8680";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;

  try {
    const response = await fetch(
      `${JOB_PROCESSOR_URL}/ingest/${jobId}/result`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Result not found" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[/api/ingest/result] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch result" },
      { status: 500 }
    );
  }
}
