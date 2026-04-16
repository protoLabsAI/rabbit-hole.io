/**
 * File Upload - Signed PUT URL Generation
 *
 * Generates presigned URLs for uploading files to evidence-temp bucket.
 * Files are uploaded to temporary storage pending hash verification.
 */

import { randomUUID } from "crypto";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";

import {
  withAuthAndLogging,
  enforceFileSizeLimit,
  enforceStorageLimit,
  TierLimitError,
} from "@protolabsai/auth";

import {
  getObjectStoreConfig,
  isValidContentHash,
  validateConfig,
} from "../../../../../../config/object-store.config";

interface SignPutRequest {
  contentHash: string;
  filename?: string;
  mediaType: string;
  sourceUrl?: string;
  fileSize: number;
  workspaceId: string;
}

interface SignPutResponse {
  success: boolean;
  data?: {
    uploadUrl: string;
    tempKey: string;
    uploadId: string;
    expiresAt: string;
    requiredHeaders?: Record<string, string>;
  };
  error?: string;
}

export const POST = withAuthAndLogging("generate signed upload URL")(async (
  request: NextRequest,
  { userId }
): Promise<NextResponse<SignPutResponse>> => {
  try {
    // Get orgId from Clerk auth context
    const orgId = "local-org";

    const config = getObjectStoreConfig();
    const validation = validateConfig(config);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: `Object store configuration invalid: ${validation.errors.join(", ")}`,
        },
        { status: 500 }
      );
    }

    const body: SignPutRequest = await request.json();

    // Validate request
    if (!body.contentHash || !isValidContentHash(body.contentHash)) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid content hash (SHA256) is required",
        },
        { status: 400 }
      );
    }

    if (!body.mediaType || !body.mediaType.includes("/")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Valid MIME type is required (e.g., video/mp4, application/pdf)",
        },
        { status: 400 }
      );
    }

    if (!body.fileSize || body.fileSize <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid file size (bytes) is required",
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

    // TIER ENFORCEMENT: Check file size and storage limits
    // Stub user object for tier enforcement (Clerk removed)
    const stubUser = { id: userId, publicMetadata: {}, emailAddresses: [] };
    const clerkOrgId = orgId || "public";

    try {
      // Check single file size limit
      await enforceFileSizeLimit(stubUser, body.fileSize);

      // Check total storage limit
      await enforceStorageLimit(stubUser, clerkOrgId, body.fileSize);
    } catch (err) {
      if (err instanceof TierLimitError) {
        return NextResponse.json(
          {
            success: false,
            ...err.toJSON(),
          },
          { status: 402 } // Payment Required
        );
      }
      throw err;
    }

    // Generate temporary upload key
    const uploadId = randomUUID();
    const tempKey = `temp/${uploadId}`;

    // Calculate expiry
    const expiresAt = new Date(
      Date.now() + config.security.signedUrlExpiry * 1000
    );

    // Generate presigned URL based on provider
    let uploadUrl: string;
    let requiredHeaders: Record<string, string> | undefined;

    switch (config.provider) {
      case "minio":
      case "s3": {
        // Initialize S3 client for MinIO/S3
        const s3Client = new S3Client({
          endpoint: config.connection.endpoint,
          region: config.connection.region || "us-east-1",
          credentials: {
            accessKeyId: config.connection.accessKeyId!,
            secretAccessKey: config.connection.secretAccessKey!,
          },
          forcePathStyle: true, // Required for MinIO
        });

        // Create PUT command with metadata
        const command = new PutObjectCommand({
          Bucket: config.buckets.evidenceTemp,
          Key: tempKey,
          ContentType: body.mediaType,
          Metadata: {
            "original-filename": body.filename || "unknown",
            "source-url": body.sourceUrl || "direct-upload",
            "content-hash": body.contentHash,
            "uploaded-by": userId,
            "workspace-id": body.workspaceId,
            "org-id": clerkOrgId,
          },
        });

        // Generate presigned URL
        uploadUrl = await getSignedUrl(s3Client, command, {
          expiresIn: config.security.signedUrlExpiry,
        });

        // Headers are included in presigned URL, but provide for reference
        requiredHeaders = {
          "Content-Type": body.mediaType,
        };
        break;
      }

      case "gcs":
        // Google Cloud Storage presigned URL
        uploadUrl = `https://storage.googleapis.com/${config.buckets.evidenceTemp}/${tempKey}`;
        break;

      case "ipfs":
        // IPFS upload would be different - direct to IPFS gateway
        uploadUrl = `${config.connection.endpoint}/api/v0/add`;
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported storage provider: ${config.provider}`,
          },
          { status: 500 }
        );
    }

    console.log(`📤 Generated signed PUT URL for ${body.filename || "file"}`);
    console.log(`🔑 Upload ID: ${uploadId}`);
    console.log(`⏰ Expires: ${expiresAt.toISOString()}`);
    console.log(`🔗 URL: ${uploadUrl.substring(0, 100)}...`);

    return NextResponse.json({
      success: true,
      data: {
        uploadUrl,
        tempKey,
        uploadId,
        expiresAt: expiresAt.toISOString(),
        requiredHeaders,
      },
    });
  } catch (error) {
    console.error("Sign PUT error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate signed URL",
      },
      { status: 500 }
    );
  }
});

export async function GET(): Promise<NextResponse> {
  const config = getObjectStoreConfig();

  return NextResponse.json({
    success: true,
    info: {
      endpoint: "/api/files/sign-put",
      description: "Generate presigned PUT URLs for file uploads",
      provider: config.provider,
      buckets: config.buckets,
      maxUploadSize: config.security.maxUploadSize,
      signedUrlExpiry: config.security.signedUrlExpiry,
    },
    usage: {
      method: "POST",
      contentType: "application/json",
      body: {
        contentHash: "sha256-abc123... (required)",
        mediaType: "video/mp4 (required)",
        filename: "optional-filename.mp4 (optional)",
        sourceUrl: "https://example.com/source (optional)",
      },
    },
    example: {
      contentHash:
        "sha256-f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
      mediaType: "application/pdf",
      filename: "doj-press-release.pdf",
      sourceUrl: "https://justice.gov/opa/pr/after-two-day-manhunt",
    },
  });
}
