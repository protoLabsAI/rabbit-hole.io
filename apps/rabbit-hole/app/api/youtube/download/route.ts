/**
 * YouTube File Download API
 * Streams video + audio files from MinIO as ephemeral ZIP
 */

import { Readable } from "stream";

import archiver from "archiver";
import { Client as MinIOClient } from "minio";
import { NextRequest, NextResponse } from "next/server";

import { withAuthAndLogging } from "@proto/auth";

import {
  getObjectStoreConfig,
  validateConfig,
} from "../../../../../../config/object-store.config";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for large files

/**
 * Wraps MinIO operations with timeout to prevent hanging
 */
const getObjectWithTimeout = async (
  client: MinIOClient,
  bucket: string,
  key: string,
  timeoutMs: number = 30000
): Promise<Readable> => {
  return Promise.race([
    client.getObject(bucket, key),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("MinIO operation timeout")), timeoutMs)
    ),
  ]);
};

interface DownloadRequest {
  videoKey: string; // e.g., "youtube/org_123/abc123/video.mp4"
  audioKey?: string; // e.g., "youtube/org_123/abc123/audio.mp3" (optional, audio gracefully omitted if unavailable)
  transcriptKey?: string; // e.g., "org_123/transcripts/abc123.txt" (optional)
  transcript?: { text: string }; // Inline transcript data (alternative to transcriptKey)
  videoId: string; // Used for filename
  title?: string; // Optional friendly name
}

interface DownloadResponse {
  success: boolean;
  error?: string;
}

export const POST = withAuthAndLogging("download YouTube files")(async (
  request: NextRequest,
  { userId }: { userId: string }
): Promise<NextResponse> => {
  try {
<<<<<<< HEAD
    const orgId = "local-org";
=======
    const { orgId } = { orgId: null as string | null };
>>>>>>> origin/main
    const body: DownloadRequest = await request.json();

    // Validate request - check for presence and non-empty strings
    if (!body.videoKey?.trim() || !body.videoId?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or empty required fields: videoKey, videoId",
        },
        { status: 400 }
      );
    }

    // Verify canonical keys match user's org
    const expectedPrefix = `youtube/${orgId || "personal"}/`;
    if (!body.videoKey.startsWith(expectedPrefix)) {
      console.warn(
        `🚫 Access denied: ${userId} attempted to download ${body.videoKey}`
      );
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    if (body.audioKey && !body.audioKey.startsWith(expectedPrefix)) {
      console.warn(
        `🚫 Access denied: ${userId} attempted to download audio ${body.audioKey}`
      );
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Get object store config
    const config = getObjectStoreConfig();
    const validation = validateConfig(config);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: `Storage configuration invalid: ${validation.errors.join(", ")}`,
        },
        { status: 500 }
      );
    }

    // Initialize MinIO client
    // Parse endpoint to extract host and port
    const endpointUrl = config.connection.endpoint;
    if (!endpointUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Object store endpoint is not configured",
        },
        { status: 500 }
      );
    }

    const isSSL = endpointUrl.startsWith("https");
    const cleanEndpoint = endpointUrl.replace(/^https?:\/\//, "");
    const [host, portStr] = cleanEndpoint.split(":");
    const port = portStr ? parseInt(portStr, 10) : isSSL ? 443 : 80;

    // Validate parsed endpoint values
    if (!host || isNaN(port) || port < 1 || port > 65535) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid object store endpoint configuration",
        },
        { status: 500 }
      );
    }

    const accessKey = config.connection.accessKeyId;
    const secretKey = config.connection.secretAccessKey;
    if (!accessKey?.trim() || !secretKey?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Object store credentials are not configured",
        },
        { status: 500 }
      );
    }

    const minioClient = new MinIOClient({
      endPoint: host,
      port: port,
      useSSL: isSSL,
      accessKey: accessKey,
      secretKey: secretKey,
    });

    console.log(`📦 Creating ZIP for ${userId}: ${body.videoId}`);

    // Generate filename with improved sanitization
    const sanitizedTitle = body.title
      ? body.title
          .replace(/[^a-z0-9]/gi, "_")
          .replace(/_+/g, "_") // Collapse multiple underscores
          .replace(/^_+|_+$/g, "") // Remove leading/trailing underscores
          .substring(0, 50)
      : null;
    const zipFilename =
      sanitizedTitle && sanitizedTitle.length > 0
        ? `${sanitizedTitle}_${body.videoId}.zip`
        : `youtube_${body.videoId}.zip`;

    // Set response headers for download
    const headers = new Headers({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      // Metadata headers for client to know what's included in the ZIP
      "X-Archive-Contains-Video": "true",
      "X-Archive-Contains-Audio": body.audioKey ? "true" : "false",
      "X-Archive-Contains-Transcript":
        body.transcriptKey || body.transcript ? "true" : "false",
    });

    // Create ZIP archive
    const archive = archiver("zip", {
      zlib: { level: 0 }, // No compression for video files (already compressed)
    });

    // Handle archiver errors
    // Note: These errors are typically caught during archive setup before streaming.
    // If an error occurs after streaming starts (line 240), the client will receive
    // a truncated ZIP file. Throwing here ensures early failures are caught.
    archive.on("error", (err) => {
      console.error("❌ Archiver error:", err);
      throw err;
    });

    // Add files to archive before streaming
    try {
      const videoStream = await getObjectWithTimeout(
        minioClient,
        config.buckets.evidenceRaw,
        body.videoKey,
        30000
      );
      const videoFilename = `${body.videoId}.mp4`;
      archive.append(videoStream, { name: videoFilename });
      console.log(`✅ Added video to ZIP: ${videoFilename}`);
    } catch (error) {
      console.error(`❌ Failed to fetch video: ${body.videoKey}`, error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Video file not found",
        },
        { status: 404 }
      );
    }

    // Stream audio file from MinIO into ZIP (optional)
    if (body.audioKey) {
      try {
        const audioStream = await getObjectWithTimeout(
          minioClient,
          config.buckets.evidenceRaw,
          body.audioKey,
          30000
        );
        const audioFilename = `${body.videoId}.mp3`;
        archive.append(audioStream, { name: audioFilename });
        console.log(`✅ Added audio to ZIP: ${audioFilename}`);
      } catch (error) {
        console.error(`❌ Failed to fetch audio: ${body.audioKey}`, error);
        // Continue without audio if it fails
        console.warn(
          `⚠️ Skipping audio file due to: ${error instanceof Error ? error.message : "unknown error"}`
        );
      }
    } else {
      console.log(`ℹ️ No audio file requested`);
    }

    // Add transcript to ZIP (optional - from MinIO key or inline data)
    if (body.transcriptKey) {
      try {
        const transcriptStream = await getObjectWithTimeout(
          minioClient,
          config.buckets.evidenceRaw,
          body.transcriptKey,
          15000
        );
        const transcriptFilename = `${body.videoId}_transcript.txt`;
        archive.append(transcriptStream, { name: transcriptFilename });
        console.log(`✅ Added transcript to ZIP: ${transcriptFilename}`);
      } catch (error) {
        console.error(
          `❌ Failed to fetch transcript: ${body.transcriptKey}`,
          error
        );
        console.warn(
          `⚠️ Skipping transcript file due to: ${error instanceof Error ? error.message : "unknown error"}`
        );
      }
    } else if (body.transcript?.text) {
      // Inline transcript data
      const transcriptFilename = `${body.videoId}_transcript.txt`;
      archive.append(body.transcript.text, { name: transcriptFilename });
      console.log(`✅ Added inline transcript to ZIP: ${transcriptFilename}`);
    } else {
      console.log(`ℹ️ No transcript requested`);
    }

    // Finalize archive (DON'T await - let it stream)
    archive.finalize();

    console.log(`✅ ZIP stream initiated for ${userId}`);

    // Convert archiver stream to web stream for Next.js
    // archiver returns a Node.js Readable stream, which Readable.toWeb() accepts directly
    const readableStream = Readable.toWeb(
      archive as Readable
    ) as ReadableStream;

    return new NextResponse(readableStream, {
      headers,
      status: 200,
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Download failed",
      },
      { status: 500 }
    );
  }
});

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      endpoint: "POST /api/youtube/download",
      description: "Download processed YouTube files as ZIP",
      parameters: {
        videoKey: "Canonical key for video file",
        audioKey: "Canonical key for audio file",
        videoId: "YouTube video ID (for filename)",
        title: "Optional: Video title for friendly filename",
      },
    },
    { status: 200 }
  );
}
