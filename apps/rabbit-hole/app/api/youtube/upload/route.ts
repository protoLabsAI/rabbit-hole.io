/**
 * YouTube Upload API
 * Direct video file upload to Python service
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuthAndLogging } from "@proto/auth";

export const dynamic = "force-dynamic";

const YOUTUBE_SERVICE_URL =
  process.env.YOUTUBE_PROCESSOR_URL || "http://localhost:8001";

export const POST = withAuthAndLogging("upload video file")(async (
  request: NextRequest,
  { userId }: { userId: string }
): Promise<NextResponse> => {
  try {
<<<<<<< HEAD
    const orgId = "local-org";
=======
    const { orgId } = { orgId: null as string | null };
>>>>>>> origin/main

    // Get multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const workspaceId = formData.get("workspaceId") as string | null;

    // Validate
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "Video file is required",
        },
        { status: 400 }
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        {
          success: false,
          error: "Workspace ID is required",
        },
        { status: 400 }
      );
    }

    console.log(
      `Uploading video: ${file.name} (${file.size} bytes) for ${userId}`
    );

    // Prepare form data for Python service
    const pythonFormData = new FormData();
    pythonFormData.append("file", file);
    pythonFormData.append("user_id", userId);
    if (orgId) pythonFormData.append("org_id", orgId);
    pythonFormData.append("workspace_id", workspaceId);

    // Proxy to Python service
    const response = await fetch(`${YOUTUBE_SERVICE_URL}/upload`, {
      method: "POST",
      body: pythonFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Python service upload error:", errorData);
      return NextResponse.json(
        {
          success: false,
          error: errorData.detail || "Upload failed",
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    console.log(`Upload complete for ${userId}`);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to upload video",
      },
      { status: 500 }
    );
  }
});

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      endpoint: "POST /api/youtube/upload",
      description: "Upload video file directly",
      parameters: {
        file: "Video file (multipart/form-data)",
        workspaceId: "Target workspace ID",
      },
      supportedFormats: ["mp4", "webm", "mkv", "mov"],
    },
    { status: 200 }
  );
}
