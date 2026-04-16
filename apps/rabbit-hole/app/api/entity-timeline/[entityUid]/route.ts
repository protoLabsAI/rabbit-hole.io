/**
 * Entity Timeline API - EventTimelineChart Integration
 *
 * Uses clean utilities from @protolabsai/utils/atlas for EventTimelineChart component
 */

import { NextRequest, NextResponse } from "next/server";

import {
  processTimelineRequest,
  type TimelineRequest,
} from "@/lib/shared-timeline-processor";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityUid: string }> }
): Promise<NextResponse> {
  try {
    const { entityUid } = await params;
    const { searchParams } = new URL(request.url);

    // Build timeline request using shared format
    const timelineRequest: TimelineRequest = {
      entityUid,
      timeWindow:
        searchParams.get("from") && searchParams.get("to")
          ? {
              from: searchParams.get("from")!,
              to: searchParams.get("to")!,
            }
          : undefined,
      importance: searchParams.get("importance")?.split(",") || undefined,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : undefined,
    };

    // Process using shared logic
    const result = await processTimelineRequest(timelineRequest, {
      maxLimit: 1000,
      defaultLimit: 100,
      validateDates: true,
    });

    // Handle errors
    if (result.error) {
      const status = result.error.includes("not found")
        ? 404
        : result.error.includes("validation")
          ? 400
          : 500;

      return NextResponse.json({ error: result.error }, { status });
    }

    // Return successful timeline data
    return NextResponse.json({
      entity: {
        uid: result.entityUid,
        name: result.summary?.entity?.name || result.entityUid,
        type: result.summary?.entity?.type || "Entity",
      },
      events: result.events,
      summary: result.summary,
    });
  } catch (error) {
    console.error("Individual timeline API error:", error);
    const status =
      error instanceof Error && error.message.includes("not found") ? 404 : 500;

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Timeline fetch failed",
      },
      { status }
    );
  }
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: "/api/entity-timeline/[entityUid]",
      description:
        "Clean entity timeline with intrinsic dates + relationship events",
      method: "GET",
      parameters: {
        entityUid: "Entity UID (required)",
        from: "Start date filter (YYYY-MM-DD)",
        to: "End date filter (YYYY-MM-DD)",
        importance: "Event importance: critical,major,minor",
        limit: "Max events (default: 100, max: 1000)",
      },
    },
    usage: {
      examples: [
        "/api/entity-timeline/per:donald_trump",
        "/api/entity-timeline/per:alex_jones?importance=critical,major",
        "/api/entity-timeline/org:tesla?from=2003-01-01",
      ],
    },
  });
}
