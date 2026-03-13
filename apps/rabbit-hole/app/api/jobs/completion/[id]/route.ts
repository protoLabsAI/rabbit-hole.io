/**
 * Job Completion Cache API Route
 *
 * GET /api/jobs/completion/[id]
 *
 * Returns cached completion status for jobs that may have been
 * cleaned up by Sidequest. Eliminates 404 errors on completed jobs.
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getJobCompletion } from "@proto/sidequest-utils/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const completion = await getJobCompletion(id);

    if (!completion) {
      return NextResponse.json(
        { error: "Completion not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(completion);
  } catch (error) {
    console.error("Failed to fetch job completion:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch job completion",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
