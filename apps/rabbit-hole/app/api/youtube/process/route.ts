/**
 * YouTube Processing API
 * Re-enabled with direct Python service integration
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuthAndLogging } from "@proto/auth";

export const dynamic = "force-dynamic";

const YOUTUBE_SERVICE_URL =
  process.env.YOUTUBE_PROCESSOR_URL || "http://localhost:8001";

interface ProcessYouTubeRequest {
  url: string;
  workspaceId: string;
}

export const POST = withAuthAndLogging("process YouTube video")(async (
  request: NextRequest,
  { userId }: { userId: string }
): Promise<NextResponse> => {
  try {
<<<<<<< HEAD
    const orgId = "local-org";
    const user = { id: "local-user", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "" } as any;
=======
    const { orgId } = { orgId: null as string | null };
    const user = {
      id: "local-user",
      firstName: "Local",
      lastName: "User",
      username: "local-user",
      fullName: "Local User",
      emailAddresses: [{ emailAddress: "local@localhost" }],
      publicMetadata: { tier: "pro" },
      privateMetadata: { stats: {} },
    };
>>>>>>> origin/main
    const body: ProcessYouTubeRequest = await request.json();

    // Validate request
    if (!body.url) {
      return NextResponse.json(
        {
          success: false,
          error: "YouTube URL is required",
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

    // Validate YouTube URL
    const isYouTubeUrl =
      body.url.includes("youtube.com") || body.url.includes("youtu.be");

    if (!isYouTubeUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid YouTube URL",
        },
        { status: 400 }
      );
    }

    // Determine quality (can be extended with tier logic)
    const quality = "720p";

    console.log(
      `Processing YouTube video: ${body.url} at ${quality} for ${userId}`
    );

    // Proxy to Python service
    const response = await fetch(`${YOUTUBE_SERVICE_URL}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: body.url,
        quality,
        user_id: userId,
        org_id: orgId || null,
        workspace_id: body.workspaceId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Python service error:", errorData);
      return NextResponse.json(
        {
          success: false,
          error: errorData.detail || "Processing failed",
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    console.log(`Processing complete for ${userId}`);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("YouTube processing error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to process video",
      },
      { status: 500 }
    );
  }
});

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      endpoint: "POST /api/youtube/process",
      description: "Process YouTube video",
      parameters: {
        url: "YouTube video URL",
        workspaceId: "Target workspace ID",
      },
    },
    { status: 200 }
  );
}

/* DISABLED CODE - PRESERVED FOR RE-ENABLING
import { withAuthAndLogging } from "@proto/api-utils";
import { getUserTier } from "@proto/auth";
import { enqueueYouTubeProcessing } from "../../../../services/job-processor/jobs";

interface ProcessYouTubeRequest {
  url: string;
  workspaceId: string;
}

interface ProcessYouTubeResponse {
  success: boolean;
  jobId?: string;
  quality?: string;
  message?: string;
  error?: string;
}

export const POST = withAuthAndLogging("enqueue YouTube processing")(async (
  request: NextRequest,
  { userId }: { userId: string }
): Promise<NextResponse<ProcessYouTubeResponse>> => {
  try {
<<<<<<< HEAD
    const orgId = "local-org";
=======
    const { orgId } = { orgId: null as string | null };
>>>>>>> origin/main
    const body: ProcessYouTubeRequest = await request.json();

    // 1. Validate request
    if (!body.url) {
      return NextResponse.json(
        {
          success: false,
          error: "YouTube URL is required",
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

    // 2. Validate YouTube URL
    const isYouTubeUrl =
      body.url.includes("youtube.com") || body.url.includes("youtu.be");

    if (!isYouTubeUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid YouTube URL",
        },
        { status: 400 }
      );
    }

    // 3. Determine quality based on user tier
<<<<<<< HEAD
    const user = { id: "local-user", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "" } as any;
=======
    const user = { id: "local-user", firstName: "Local", lastName: "User", username: "local-user", fullName: "Local User", emailAddresses: [{ emailAddress: "local@localhost" }], publicMetadata: { tier: "pro" }, privateMetadata: { stats: {} } };
>>>>>>> origin/main
    const tier = getUserTier(user);
    const quality = tier === "free" ? "720p" : "1080p";

    console.log(
      `🎥 Enqueueing YouTube video: ${body.url} at ${quality} for ${userId}`
    );

    // 4. TODO: Check storage quota before processing
    // const currentUsage = await checkStorageUsage(userId, orgId);
    // if (currentUsage > tierLimit) { return error }

    // 5. Enqueue job
    const job = await enqueueYouTubeProcessing({
      url: body.url,
      quality: quality as "720p" | "1080p",
      userId,
      orgId: orgId || null,
      workspaceId: body.workspaceId,
    });

    console.log(`✅ Job enqueued: ${job.id} at ${quality}`);

    return NextResponse.json({
      success: true,
      jobId: String(job.id),
      quality,
      message: `Video processing queued at ${quality}`,
    });
  } catch (error) {
    console.error("YouTube processing enqueue error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to enqueue video processing",
      },
      { status: 500 }
    );
  }
});

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      endpoint: "POST /api/youtube/process",
      description: "Enqueue YouTube video processing",
      parameters: {
        url: "YouTube video URL",
        workspaceId: "Target workspace ID",
      },
      quality: {
        free: "720p",
        pro: "1080p",
        enterprise: "1080p",
      },
    },
    { status: 200 }
  );
}
END DISABLED CODE */
