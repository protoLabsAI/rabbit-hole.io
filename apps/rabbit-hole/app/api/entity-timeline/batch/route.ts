/**
 * Batch Entity Timeline API Route
 *
 * Fetches timeline data for multiple entities in a single request to optimize performance.
 */

import { NextRequest, NextResponse } from "next/server";

import {
  processBatchTimelineRequests,
  type TimelineRequest,
} from "@/lib/shared-timeline-processor";

interface BatchRequestBody {
  requests: TimelineRequest[];
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchRequestBody = await request.json();

    // Basic validation
    if (!body.requests || !Array.isArray(body.requests)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request format - requests array required",
        },
        { status: 400 }
      );
    }

    // Basic request validation
    for (const req of body.requests) {
      if (!req.entityUid || typeof req.entityUid !== "string") {
        return NextResponse.json(
          { success: false, error: "Invalid entityUid in request" },
          { status: 400 }
        );
      }
    }

    // Process batch using shared logic
    const batchResult = await processBatchTimelineRequests(body.requests, {
      maxLimit: 1000,
      defaultLimit: 50,
      validateDates: true,
    });

    return NextResponse.json({
      success: true,
      data: batchResult.results,
      metadata: batchResult.metadata,
    });
  } catch (error) {
    console.error("Batch timeline API error:", error);

    // Handle specific error types
    if (error instanceof Error && error.message.includes("Too many requests")) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
