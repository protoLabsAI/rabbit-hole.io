/**
 * File Processing State Management API
 *
 * Updates file processing states and handles state transitions for uploaded files.
 * Used by background processing systems for OCR, text extraction, thumbnails, etc.
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuthAndLogging } from "@proto/auth";
import { getGlobalNeo4jClient } from "@proto/database";
import {
  ProcessingStateUpdateSchema,
  safeValidate,
  type FileProcessingState,
} from "@proto/types";

// FileProcessingState type is imported from @proto/types

interface UpdateProcessingStateRequest {
  fileUid: string;
  processingState: FileProcessingState;
  processingError?: string;
  extractedData?: {
    text?: string;
    thumbnailUrl?: string;
    metadata?: Record<string, any>;
  };
}

interface UpdateProcessingStateResponse {
  success: boolean;
  data?: {
    fileUid: string;
    previousState: string;
    newState: FileProcessingState;
    updatedAt: string;
  };
  error?: string;
}

export const POST = withAuthAndLogging("update file processing state")(async (
  request: NextRequest
): Promise<NextResponse<UpdateProcessingStateResponse>> => {
  const client = getGlobalNeo4jClient();

  try {
    const body = await request.json();

    // Validate request data with Zod schema
    const validation = safeValidate(ProcessingStateUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid request data: ${validation.error}`,
        },
        { status: 400 }
      );
    }

    const { fileUid, processingState, processingError, extractedData } =
      validation.data;

    console.log(
      `📝 Updating file processing state: ${fileUid} → ${processingState}`
    );

    // Get current file state
    const getCurrentStateQuery = `
      MATCH (f:File {uid: $fileUid})
      RETURN f.processingState as currentState, f
    `;

    const currentResult = await client.executeWrite(getCurrentStateQuery, {
      fileUid,
    });

    if (currentResult.records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "File not found",
        },
        { status: 404 }
      );
    }

    const currentState =
      currentResult.records[0].get("currentState") || "unprocessed";
    const currentTime = new Date().toISOString();

    // Build update properties based on state
    const updateProps: Record<string, any> = {
      processingState,
      updatedAt: currentTime,
    };

    // Set state-specific timestamps
    switch (processingState) {
      case "queued":
        updateProps.queuedAt = currentTime;
        break;
      case "processing":
        // Keep queuedAt, don't overwrite
        break;
      case "processed":
        updateProps.processedAt = currentTime;
        updateProps.processingError = null; // Clear any previous errors
        break;
      case "failed":
        updateProps.processingError = processingError || "Processing failed";
        break;
    }

    // Add extracted data if provided
    if (extractedData) {
      if (extractedData.text) updateProps.extractedText = extractedData.text;
      if (extractedData.thumbnailUrl)
        updateProps.thumbnailUrl = extractedData.thumbnailUrl;
      if (extractedData.metadata)
        updateProps.processingMetadata = extractedData.metadata;
    }

    // Update file entity
    const updateQuery = `
      MATCH (f:File {uid: $fileUid})
      SET f += $updateProps
      RETURN f
    `;

    const result = await client.executeWrite(updateQuery, {
      fileUid,
      updateProps,
    });

    if (result.records.length === 0) {
      throw new Error("Failed to update file processing state");
    }

    console.log(
      `✅ File processing state updated: ${fileUid} (${currentState} → ${processingState})`
    );

    return NextResponse.json({
      success: true,
      data: {
        fileUid,
        previousState: currentState,
        newState: processingState,
        updatedAt: currentTime,
      },
    });
  } catch (error) {
    console.error("File processing state update error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update processing state",
      },
      { status: 500 }
    );
  }
});

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: "/api/files/update-processing-state",
      description:
        "Update file processing states for background processing workflows",
      method: "POST",
      contentType: "application/json",
      authentication: "required",
    },
    usage: {
      method: "POST",
      body: {
        fileUid: "file:document (required)",
        processingState: "queued | processing | processed | failed (required)",
        processingError: "Error message (optional, for failed state)",
        extractedData: {
          text: "Extracted text content (optional)",
          thumbnailUrl: "URL to generated thumbnail (optional)",
          metadata: "Additional processing metadata (optional)",
        },
      },
      response: {
        success: true,
        data: {
          fileUid: "file:document",
          previousState: "unprocessed",
          newState: "queued",
          updatedAt: "2025-09-20T03:30:00.000Z",
        },
      },
    },
    states: {
      unprocessed: "File uploaded but no processing started",
      queued: "File queued for processing",
      processing: "File currently being processed",
      processed: "File processing completed successfully",
      failed: "File processing failed with error",
    },
    workflow: [
      "1. File uploaded → unprocessed",
      "2. Background system picks up file → queued",
      "3. Processing starts → processing",
      "4. Processing completes → processed | failed",
    ],
  });
}
