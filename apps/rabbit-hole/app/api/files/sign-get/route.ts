/**
 * Sign GET - Generate Signed Download URLs
 *
 * Returns presigned URLs for downloading files from object storage.
 */

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";

import { withAuthAndLogging, verifyFileAccess } from "@proto/auth";

import {
  getObjectStoreConfig,
  validateConfig,
} from "../../../../../../config/object-store.config";

interface SignGetRequest {
  canonicalKey: string;
  filename?: string;
}

interface SignGetResponse {
  success: boolean;
  data?: {
    downloadUrl: string;
    expiresAt: string;
    filename?: string;
  };
  error?: string;
}

export const POST = withAuthAndLogging("generate signed download URL")(async (
  request: NextRequest,
  { userId }
): Promise<NextResponse<SignGetResponse>> => {
  try {
    const { orgId } = { orgId: null as string | null };
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

    const body: SignGetRequest = await request.json();

    // Validate request
    if (!body.canonicalKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Canonical key is required",
        },
        { status: 400 }
      );
    }

    // Verify access
    const accessCheck = await verifyFileAccess(
      userId,
      orgId || null,
      body.canonicalKey
    );

    if (!accessCheck.allowed) {
      console.warn(
        `🚫 Access denied: ${userId} attempted to download ${body.canonicalKey}`
      );

      return NextResponse.json(
        {
          success: false,
          error: accessCheck.reason || "Access denied",
        },
        { status: 403 }
      );
    }

    console.log(
      `✅ Access granted: ${userId} downloading ${body.canonicalKey}`
    );

    // Initialize S3/MinIO client
    const s3Client = new S3Client({
      endpoint: config.connection.endpoint,
      region: config.connection.region,
      credentials: {
        accessKeyId: config.connection.accessKeyId!,
        secretAccessKey: config.connection.secretAccessKey!,
      },
      forcePathStyle: true, // Required for MinIO
    });

    // Generate presigned GET URL
    const command = new GetObjectCommand({
      Bucket: config.buckets.evidenceRaw,
      Key: body.canonicalKey,
      ResponseContentDisposition: body.filename
        ? `attachment; filename="${body.filename}"`
        : undefined,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: config.security.signedUrlExpiry,
    });

    const expiresAt = new Date(
      Date.now() + config.security.signedUrlExpiry * 1000
    ).toISOString();

    console.log(`✅ Generated download URL for ${body.canonicalKey}`);
    console.log(`⏰ Expires at: ${expiresAt}`);

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl,
        expiresAt,
        filename: body.filename || accessCheck.file?.name,
      },
    });
  } catch (error) {
    console.error("Sign GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate download URL",
      },
      { status: 500 }
    );
  }
});

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: "/api/files/sign-get",
      description: "Generate presigned download URLs for files",
      process: [
        "1. Receive canonical key from client",
        "2. Validate key exists in storage",
        "3. Generate presigned GET URL with expiry",
        "4. Return URL for browser download",
      ],
    },
    usage: {
      method: "POST",
      contentType: "application/json",
      body: {
        canonicalKey: "by-hash/sha256/aa/bb/aabbcc... (required)",
        filename: "original-filename.pdf (optional, for download name)",
      },
    },
    example: {
      canonicalKey:
        "by-hash/sha256/f1/a2/f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
      filename: "document.pdf",
    },
  });
}
