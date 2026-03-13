/**
 * YouTube Batch Processing API - TEMPORARILY DISABLED
 *
 * TODO: Re-enable when job processor is ready for production
 * See: handoffs/2025-10-11_YOUTUBE_ROUTES_DISABLED.md
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "YouTube batch processing temporarily disabled",
      message: "Feature under development - coming soon",
    },
    { status: 503 }
  );
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: "YouTube batch processing temporarily disabled",
      message: "Feature under development - coming soon",
    },
    { status: 503 }
  );
}

/* DISABLED CODE - PRESERVED FOR RE-ENABLING
import { auth, currentUser } from "@clerk/nextjs/server";
import { withAuthAndLogging } from "@proto/api-utils";
import { getUserTier } from "@proto/auth";
import { enqueueYouTubeProcessing } from "../../../../services/job-processor/jobs";

interface BatchProcessRequest {
  urls: string[];
  workspaceId: string;
}

interface BatchProcessResponse {
  success: boolean;
  jobIds?: string[];
  quality?: string;
  count?: number;
  message?: string;
  error?: string;
}

export const POST = withAuthAndLogging("enqueue YouTube batch processing")(
  async (
    request: NextRequest,
    { userId }: { userId: string }
  ): Promise<NextResponse<BatchProcessResponse>> => {
    try {
      const { orgId } = await auth();
      const body: BatchProcessRequest = await request.json();

      // 1. Validate request
      if (!body.urls || !Array.isArray(body.urls) || body.urls.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "At least one YouTube URL is required",
          },
          { status: 400 }
        );
      }

      if (!body.workspaceId) {
        return NextResponse.json(
          {
            success: false,
            error: "Workspace ID is required",
          },
          { status: 400 }
        );
      }

      // 2. Enforce batch size limit
      const MAX_BATCH_SIZE = 50;
      if (body.urls.length > MAX_BATCH_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} videos`,
          },
          { status: 400 }
        );
      }

      // 3. Validate all URLs
      const invalidUrls = body.urls.filter(
        (url) => !url.includes("youtube.com") && !url.includes("youtu.be")
      );

      if (invalidUrls.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid YouTube URLs detected",
            invalidUrls,
          },
          { status: 400 }
        );
      }

      // 4. Determine quality based on user tier
      const user = await currentUser();
      const tier = getUserTier(user);
      const quality = tier === "free" ? "720p" : "1080p";

      console.log(
        `🎥 Batch processing ${body.urls.length} videos at ${quality} for ${userId}`
      );

      // 4. Enqueue all jobs
      const jobs = await Promise.all(
        body.urls.map((url) =>
          enqueueYouTubeProcessing({
            url,
            quality: quality as "720p" | "1080p",
            userId,
            orgId: orgId || null,
            workspaceId: body.workspaceId,
          })
        )
      );

      const jobIds = jobs.map((job: any) => String(job.id));

      console.log(`✅ Batch enqueued: ${jobIds.length} jobs at ${quality}`);

      return NextResponse.json({
        success: true,
        jobIds,
        quality,
        count: jobIds.length,
        message: `${jobIds.length} videos queued for processing at ${quality}`,
      });
    } catch (error) {
      console.error("YouTube batch processing error:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to enqueue batch processing",
        },
        { status: 500 }
      );
    }
  }
);

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      endpoint: "POST /api/youtube/batch",
      description: "Batch process YouTube videos",
      parameters: {
        urls: "Array of YouTube video URLs",
        workspaceId: "Target workspace ID",
      },
      limits: {
        maxBatchSize: 50,
      },
    },
    { status: 200 }
  );
}
END DISABLED CODE */
