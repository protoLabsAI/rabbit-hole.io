/**
 * YouTube Download URL API
 * Download video from generic URL via Python service
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuthAndLogging } from "@proto/auth";
import { youtubeProcessorConfig } from "@proto/llm-tools";

export const dynamic = "force-dynamic";

// Request body from client (only contains url and workspaceId)
interface DownloadURLBody {
  url: string;
  workspaceId: string;
}

export const POST = withAuthAndLogging("download video from URL")(async (
  request: NextRequest,
  { userId }: { userId: string }
): Promise<NextResponse> => {
  try {
<<<<<<< HEAD
    const orgId = "local-org";
=======
    const { orgId } = { orgId: null as string | null };
>>>>>>> origin/main
    const body: DownloadURLBody = await request.json();

    // Validate URL presence and type
    if (!body.url || typeof body.url !== "string" || !body.url.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Video URL is required and must be a non-empty string",
        },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      const parsedUrl = new URL(body.url.trim());
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return NextResponse.json(
          {
            success: false,
            error: "URL must use http or https protocol",
          },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid URL format",
        },
        { status: 400 }
      );
    }

    // Validate workspace ID
    if (
      !body.workspaceId ||
      typeof body.workspaceId !== "string" ||
      !body.workspaceId.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Workspace ID is required",
        },
        { status: 400 }
      );
    }

    console.log(`Downloading video from: ${body.url} for ${userId}`);

    // Proxy to Python service with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const response = await fetch(
        youtubeProcessorConfig.getDownloadUrlEndpoint(),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            url: body.url,
            user_id: userId,
            org_id: orgId || null,
            workspace_id: body.workspaceId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Python service download error:", errorData);
        return NextResponse.json(
          {
            success: false,
            error: errorData.detail || "Download failed",
          },
          { status: response.status }
        );
      }

      const result = await response.json();

      console.log(`Download complete for ${userId}`);

      return NextResponse.json(result, { status: 200 });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Download request timed out");
      return NextResponse.json(
        {
          success: false,
          error: "Request timed out after 60 seconds",
        },
        { status: 504 }
      );
    }

    console.error("Video download error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to download video",
      },
      { status: 500 }
    );
  }
});

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      endpoint: "POST /api/youtube/download-url",
      description: "Download video from generic URL",
      parameters: {
        url: "Video URL (must end with .mp4, .webm, .mkv, .mov, .avi, .flv, or .m4v)",
        workspaceId: "Target workspace ID",
      },
    },
    { status: 200 }
  );
}
