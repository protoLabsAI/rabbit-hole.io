/**
 * YouTube Job Enqueueing API Route
 *
 * POST /api/jobs/enqueue-youtube
 *
 * Enqueues a YouTube processing job to the background queue.
 * Returns immediately with job ID for status tracking.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { enqueueYouTubeJob } from "@proto/sidequest-utils/server";

// Request validation schema
const EnqueueYouTubeSchema = z.object({
  url: z.string().url("Invalid YouTube URL"),
  quality: z.enum(["720p", "1080p"]).default("720p"),
  workspaceId: z.string().min(1, "Workspace ID required"),
  // Transcription options
  includeTranscript: z.boolean().optional(),
  transcriptionProvider: z.enum(["groq", "openai", "local"]).optional(),
  transcriptionLanguage: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const userId = "local-user";
    const orgId = "local-org";

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = EnqueueYouTubeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      url,
      quality,
      workspaceId,
      includeTranscript,
      transcriptionProvider,
      transcriptionLanguage,
    } = validation.data;

    // Enqueue job
    const job = await enqueueYouTubeJob({
      url,
      quality,
      userId,
      orgId: orgId || null,
      workspaceId,
      includeTranscript,
      transcriptionProvider,
      transcriptionLanguage,
    });

    console.log(
      `📤 Enqueued YouTube job ${job.jobId} for ${url}${includeTranscript ? " (with transcription)" : ""}`
    );

    return NextResponse.json(
      {
        success: true,
        jobId: job.jobId,
        status: "enqueued",
        message: "YouTube processing job enqueued successfully",
        data: {
          url,
          quality,
          workspaceId,
        },
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("❌ Failed to enqueue YouTube job:", error);

    return NextResponse.json(
      {
        error: "Failed to enqueue job",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
