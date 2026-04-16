/**
 * Job Status API Route
 *
 * GET /api/jobs/status/[id]
 *
 * Returns the current status of a background job.
 * Used for polling job progress from the frontend.
 */

import { NextRequest, NextResponse } from "next/server";

import {
  getJobStatus,
  getJobCompletion,
} from "@protolabsai/sidequest-utils/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = "local-user";

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 1. Check completion cache first (persists after Sidequest cleanup)
    const cached = await getJobCompletion(id);
    if (cached) {
      return NextResponse.json(cached);
    }

    // 2. Fall back to live Sidequest status
    const job = await getJobStatus(id);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("Failed to fetch job status:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch job status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
