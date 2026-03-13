/**
 * File Metadata Processing API
 *
 * Processes uploaded files and extracts metadata including suggested entity IDs.
 * Integrates with @proto/utils file processing utilities.
 */

import { NextRequest, NextResponse } from "next/server";

import {
  processFileMetadata,
  type FileProcessingResult,
} from "@proto/utils/file-processing";

import { withAuthAndLogging } from "../../../lib/auth-middleware";

interface ProcessMetadataResponse {
  success: boolean;
  data?: FileProcessingResult;
  error?: string;
}

export const POST = withAuthAndLogging("process file metadata")(async (
  request: NextRequest
): Promise<NextResponse<ProcessMetadataResponse>> => {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No file provided",
        },
        { status: 400 }
      );
    }

    console.log(
      `📎 Processing metadata for file: ${file.name} (${file.size} bytes)`
    );

    // Process file metadata using utility package
    const options = {
      computeHash: true,
      generateEntityId: true,
    };

    const result = await processFileMetadata(file, options);

    console.log(`✅ File metadata processed: ${result.suggestedEntityId}`);
    console.log(`📏 Size: ${result.sizeFormatted}, Type: ${result.mediaType}`);
    console.log(
      `✔️ Valid: ${result.isValid}, Errors: ${result.validationErrors.length}`
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("File metadata processing error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process file metadata",
      },
      { status: 500 }
    );
  }
});

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: "/api/files/process-metadata",
      description: "Process file metadata and generate entity identifiers",
      method: "POST",
      contentType: "multipart/form-data",
      authentication: "required",
    },
    usage: {
      method: "POST",
      body: 'FormData with "file" field containing uploaded file',
      response: {
        success: true,
        data: {
          filename: "original-filename.pdf",
          size: 1048576,
          sizeFormatted: "1.0 MB",
          mediaType: "application/pdf",
          suggestedEntityId: "file:original_filename",
          contentHash: "sha256-abc123...",
          isValid: true,
          validationErrors: [],
          lastModified: "2025-09-20T03:30:00.000Z",
        },
      },
    },
    limits: {
      maxFileSize: "100 MB",
      allowedTypes: [
        "application/pdf",
        "image/jpeg",
        "text/plain",
        "(and more - see getAllowedFileExtensions())",
      ],
    },
  });
}
