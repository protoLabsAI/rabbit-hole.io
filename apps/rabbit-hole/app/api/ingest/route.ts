/**
 * POST /api/ingest
 *
 * Proxy for job-processor's /ingest endpoint.
 * Accepts multipart form data (file + metadata) or JSON (URL source).
 */

import { NextRequest, NextResponse } from "next/server";

import { generateSecureId } from "@proto/utils";

const JOB_PROCESSOR_URL =
  process.env.JOB_PROCESSOR_URL || "http://localhost:8680";

export async function POST(req: NextRequest) {
<<<<<<< HEAD
  const userId = "local-user";
=======
  const { userId } = { userId: "local-user" };
>>>>>>> origin/main
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";
  const jobId = generateSecureId();

  try {
    if (contentType.includes("multipart/form-data")) {
      // File upload — forward form data
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      const jobData = {
        jobId,
        request: {
          source: {
            type: "file" as const,
            buffer: buffer.toString("base64"),
            mediaType: file.type || "application/octet-stream",
            fileName: file.name,
          },
          workspaceId: formData.get("workspaceId")?.toString(),
          requestedBy: userId,
          metadata: {
            originalName: file.name,
            size: file.size,
          },
        },
      };

      const response = await fetch(`${JOB_PROCESSOR_URL}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData),
      });

      if (!response.ok) {
        const text = await response.text();
        return NextResponse.json(
          { error: `Job processor error: ${text}` },
          { status: response.status }
        );
      }

      return NextResponse.json(
        { success: true, jobId, queue: "media-ingestion" },
        { status: 202 }
      );
    } else {
      // JSON body — URL source
      const body = await req.json();
      const { url, workspaceId } = body;

      if (!url) {
        return NextResponse.json({ error: "No url provided" }, { status: 400 });
      }

      const jobData = {
        jobId,
        request: {
          source: {
            type: "url" as const,
            url,
          },
          workspaceId,
          requestedBy: userId,
        },
      };

      const response = await fetch(`${JOB_PROCESSOR_URL}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData),
      });

      if (!response.ok) {
        const text = await response.text();
        return NextResponse.json(
          { error: `Job processor error: ${text}` },
          { status: response.status }
        );
      }

      return NextResponse.json(
        { success: true, jobId, queue: "media-ingestion" },
        { status: 202 }
      );
    }
  } catch (error) {
    console.error("[/api/ingest] Error:", error);
    return NextResponse.json(
      { error: "Failed to enqueue ingestion job" },
      { status: 500 }
    );
  }
}
