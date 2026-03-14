/**
 * Job List API Route
 *
 * GET /api/jobs/list?queue=youtube-processing&status=pending&limit=20
 *
 * Lists jobs with optional filtering by queue and status.
 * Useful for monitoring and debugging the job queue.
 */

import { NextRequest, NextResponse } from "next/server";

import { validatePaginationParams, PAGINATION_LIMITS } from "@proto/api-utils";
import type { JobStatus } from "@proto/sidequest-utils";
import { listJobs } from "@proto/sidequest-utils/server";

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = { userId: "local-user" };

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queue = searchParams.get("queue") || undefined;
    const status = searchParams.get("status") as JobStatus | undefined;

    // Validate and normalize pagination with boundaries
    const { pageSize, offset } = validatePaginationParams({
      pageSize:
        searchParams.get("pageSize") || searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    });

    // Fetch jobs from database
    const { jobs, count } = await listJobs({
      queue,
      status,
      limit: pageSize,
      offset,
    });

    // Compute hasMore from result count vs pageSize
    const hasMore = jobs.length === pageSize;

    return NextResponse.json({
      jobs,
      count,
      filters: { queue, status },
      pagination: {
        pageSize,
        offset,
        hasMore,
        maxPageSize: PAGINATION_LIMITS.MAX_PAGE_SIZE,
      },
    });
  } catch (error) {
    console.error("❌ Failed to list jobs:", error);

    return NextResponse.json(
      {
        error: "Failed to list jobs",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
