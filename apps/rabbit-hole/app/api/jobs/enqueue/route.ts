/**
 * Job Enqueueing API
 *
 * Bridges between Next.js app and separate Sidequest.js job processor service
 * This endpoint runs in the Next.js context and communicates with job processor
 */

import { NextRequest, NextResponse } from "next/server";

import { enqueueTextExtractionJob } from "@protolabsai/sidequest-utils/server";

interface EnqueueJobRequest {
  jobType: "text-extraction";
  data: {
    fileUid: string;
    canonicalKey: string;
    mediaType: string;
    fileName: string;
  };
}

interface EnqueueJobResponse {
  success: boolean;
  data?: {
    jobId: string;
    queuedAt: string;
  };
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<EnqueueJobResponse>> {
  // Check authentication
  const userId = "local-user";
  const orgId = "local-org";
  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication required to enqueue jobs",
      },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as EnqueueJobRequest;

    console.log(`📤 Enqueueing ${body.jobType} job for ${body.data.fileUid}`);

    // Enqueue job to job processor
    const job = await enqueueTextExtractionJob({
      ...body.data,
      userId,
      orgId: orgId || null,
      workspaceId: "default", // TODO: Get from request or context
    });

    console.log(`✅ Job enqueued: ${job.jobId}`);

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.jobId,
        queuedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Job enqueueing error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to enqueue job",
      },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: "/api/jobs/enqueue",
      description: "Enqueue background processing jobs",
      method: "POST",
      contentType: "application/json",
      authentication: "required",
    },
    usage: {
      method: "POST",
      body: {
        jobType: "text-extraction",
        data: {
          fileUid: "file:document (required)",
          canonicalKey: "by-hash/ab/cd/... (required)",
          mediaType: "application/pdf (required)",
          fileName: "document.pdf (required)",
        },
      },
      response: {
        success: true,
        data: {
          jobId: "job_1234567890_abc123",
          queuedAt: "2025-09-20T03:30:00.000Z",
        },
      },
    },
  });
}
