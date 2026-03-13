/**
 * File Upload Service
 *
 * Handles complete file upload workflow: metadata → sign-put → upload → promote → entity creation
 */

import {
  SignPutRequestSchema,
  SignPutResponseDataSchema,
  PromoteRequestSchema,
  PromoteResponseDataSchema,
  AtlasCrudFileEntityDataSchema,
  safeValidate,
  type FileProcessingState,
} from "@proto/types";
import type { FileProcessingResult } from "@proto/utils/file-processing";
// Job enqueueing via API call - no direct imports to avoid bundling server-only modules

export interface UploadProgressCallback {
  (progress: number): void;
}

export interface FileUploadResult {
  success: boolean;
  data?: {
    fileEntity: {
      uid: string;
      name: string;
      size: number;
      mediaType: string;
      contentHash: string;
      canonicalKey: string;
      aliases: string[];
      processingState: FileProcessingState;
      queuedAt?: string;
    };
    uploadId: string;
  };
  error?: string;
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

interface PromoteResponse {
  success: boolean;
  data?: {
    canonicalKey: string;
    aliases: string[];
    derivations: string[];
    ownership: {
      uploadedBy: string;
      workspaceId: string;
      orgId: string;
    };
  };
  error?: string;
}

export class FileUploadService {
  /**
   * Complete file upload workflow
   */
  async uploadFile(
    file: File,
    metadata: FileProcessingResult,
    workspaceId: string,
    onProgress?: UploadProgressCallback
  ): Promise<FileUploadResult> {
    try {
      onProgress?.(10);

      // Step 1: Get signed PUT URL
      const signResponse = await this.getSignedPutUrl(
        file,
        metadata,
        workspaceId
      );
      if (!signResponse.success || !signResponse.data) {
        return {
          success: false,
          error: signResponse.error || "Failed to get upload URL",
        };
      }

      onProgress?.(20);

      // Step 2: Upload file to MinIO
      await this.uploadToStorage(file, signResponse.data, onProgress);

      onProgress?.(80);

      // Step 3: Promote file to permanent storage
      const promoteResponse = await this.promoteFile(
        signResponse.data.tempKey,
        metadata.contentHash ?? "",
        metadata.originalFilename
      );

      if (!promoteResponse.success || !promoteResponse.data) {
        return {
          success: false,
          error: promoteResponse.error || "Failed to promote file",
        };
      }

      onProgress?.(90);

      // Step 4: Create file entity in knowledge graph
      const fileEntity = await this.createFileEntity(
        metadata,
        promoteResponse.data,
        signResponse.data.uploadId
      );

      onProgress?.(100);

      return {
        success: true,
        data: {
          fileEntity,
          uploadId: signResponse.data.uploadId,
        },
      };
    } catch (error) {
      console.error("File upload workflow error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  /**
   * Step 1: Get signed PUT URL from API
   */
  private async getSignedPutUrl(
    file: File,
    metadata: FileProcessingResult,
    workspaceId: string
  ): Promise<SignPutResponse> {
    if (!metadata.contentHash) {
      throw new Error("Content hash is required for file upload");
    }

    // Validate request data
    const requestData = {
      contentHash: metadata.contentHash,
      mediaType: metadata.mediaType,
      filename: metadata.originalFilename,
      sourceUrl: "file-upload-dialog",
      fileSize: file.size,
      workspaceId,
    };

    const requestValidation = safeValidate(SignPutRequestSchema, requestData);
    if (!requestValidation.success) {
      throw new Error(`Invalid sign-put request: ${requestValidation.error}`);
    }

    const response = await fetch("/api/files/sign-put", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestValidation.data),
    });

    const result = await response.json();

    // Validate response data if successful
    if (result.success && result.data) {
      const responseValidation = safeValidate(
        SignPutResponseDataSchema,
        result.data
      );
      if (!responseValidation.success) {
        throw new Error(
          `Invalid sign-put response: ${responseValidation.error}`
        );
      }
      result.data = responseValidation.data;
    }

    return result;
  }

  /**
   * Step 2: Upload file to MinIO using signed URL
   */
  private async uploadToStorage(
    file: File,
    signData: NonNullable<SignPutResponse["data"]>,
    onProgress?: UploadProgressCallback
  ): Promise<void> {
    const { uploadUrl, requiredHeaders } = signData;

    // Create XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = 20 + Math.round((event.loaded / event.total) * 60); // 20-80% range
          onProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(
            new Error(
              `Upload failed with status ${xhr.status}: ${xhr.statusText}`
            )
          );
        }
      };

      xhr.onerror = () => {
        reject(new Error("Upload request failed"));
      };

      xhr.ontimeout = () => {
        reject(new Error("Upload request timed out"));
      };

      // Configure request
      xhr.open("PUT", uploadUrl);
      xhr.timeout = 300000; // 5 minute timeout

      // Set required headers
      if (requiredHeaders) {
        Object.entries(requiredHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }

      // Start upload
      xhr.send(file);
    });
  }

  /**
   * Step 3: Promote file from temp to permanent storage
   */
  private async promoteFile(
    tempKey: string,
    expectedHash: string,
    originalFilename?: string
  ): Promise<PromoteResponse> {
    // Validate request data
    const requestData = {
      tempKey,
      expectedHash,
      originalFilename,
      sourceUrl: "file-upload-dialog",
      capturedAt: new Date().toISOString(),
    };

    const requestValidation = safeValidate(PromoteRequestSchema, requestData);
    if (!requestValidation.success) {
      throw new Error(`Invalid promote request: ${requestValidation.error}`);
    }

    const response = await fetch("/api/files/promote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestValidation.data),
    });

    const result = await response.json();

    // Validate response data if successful
    if (result.success && result.data) {
      const responseValidation = safeValidate(
        PromoteResponseDataSchema,
        result.data
      );
      if (!responseValidation.success) {
        throw new Error(
          `Invalid promote response: ${responseValidation.error}`
        );
      }
      result.data = responseValidation.data;
    }

    return result;
  }

  /**
   * Step 4: Create file entity in knowledge graph
   */
  private async createFileEntity(
    metadata: FileProcessingResult,
    promoteData: NonNullable<PromoteResponse["data"]>,
    uploadId: string
  ) {
    const { uploadedBy, workspaceId, orgId } = promoteData.ownership;
    // Determine processing state and tags based on file type
    const processingState: FileProcessingState = "unprocessed";
    const currentTime = new Date().toISOString();

    // Add file type tags for processing pipeline
    const fileTypeTags = this.getFileTypeTags(metadata.mediaType);

    const entityData = {
      id: metadata.suggestedEntityId,
      label: metadata.filename,
      entityType: "file" as const,
      tags: ["uploaded", "file_upload_dialog", ...fileTypeTags],
      // Store file-specific properties
      size: metadata.size,
      mediaType: metadata.mediaType,
      contentHash: metadata.contentHash,
      canonicalKey: promoteData.canonicalKey,
      aliases: promoteData.aliases,
      uploadId,
      uploadedAt: currentTime,
      // Processing state tracking
      processingState,
      queuedAt: undefined,
      processedAt: undefined,
      processingError: undefined,
      // Ownership and access control
      uploadedBy,
      workspaceId,
      orgId,
      accessLevel: "workspace" as const,
    };

    // Validate entity data before sending
    const entityValidation = safeValidate(
      AtlasCrudFileEntityDataSchema,
      entityData
    );
    if (!entityValidation.success) {
      throw new Error(`Invalid file entity data: ${entityValidation.error}`);
    }

    const response = await fetch("/api/atlas-crud", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "add-entity",
        data: entityValidation.data,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create file entity: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to create file entity");
    }

    // Enqueue text extraction job for eligible file types
    if (this.isTextExtractionEligible(metadata.mediaType)) {
      try {
        await this.enqueueTextExtraction({
          fileUid: metadata.suggestedEntityId,
          canonicalKey: promoteData.canonicalKey,
          mediaType: metadata.mediaType,
          fileName: metadata.filename,
        });

        console.log(
          `🎯 Enqueued text extraction job for ${metadata.suggestedEntityId}`
        );
      } catch (jobError) {
        // Don't fail the upload if job enqueueing fails
        console.warn(`⚠️ Failed to enqueue text extraction job:`, jobError);
      }
    }

    return {
      uid: metadata.suggestedEntityId,
      name: metadata.filename,
      size: metadata.size,
      mediaType: metadata.mediaType,
      contentHash: metadata.contentHash ?? "",
      canonicalKey: promoteData.canonicalKey,
      aliases: promoteData.aliases,
      processingState,
      queuedAt: undefined,
    };
  }

  /**
   * Enqueue text extraction job via API call
   */
  private async enqueueTextExtraction(jobData: {
    fileUid: string;
    canonicalKey: string;
    mediaType: string;
    fileName: string;
  }) {
    const response = await fetch("/api/jobs/enqueue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobType: "text-extraction",
        data: jobData,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to enqueue job: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Check if file type is eligible for text extraction
   */
  private isTextExtractionEligible(mediaType: string): boolean {
    const textExtractionTypes = [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "text/html",
      "text/csv",
      "application/json",
      "text/xml",
      "application/xml",
    ];

    return (
      textExtractionTypes.includes(mediaType) || mediaType.startsWith("text/")
    );
  }

  /**
   * Get file type tags for processing pipeline classification
   */
  private getFileTypeTags(mediaType: string): string[] {
    const tags: string[] = [];

    if (mediaType.startsWith("image/")) {
      tags.push("image", "needs_thumbnail", "needs_ocr");
    } else if (mediaType.startsWith("video/")) {
      tags.push("video", "needs_thumbnail", "needs_transcription");
    } else if (mediaType.startsWith("audio/")) {
      tags.push("audio", "needs_transcription");
    } else if (mediaType === "application/pdf") {
      tags.push("document", "pdf", "needs_text_extraction", "needs_ocr");
    } else if (mediaType.includes("word") || mediaType.includes("document")) {
      tags.push("document", "needs_text_extraction");
    } else if (mediaType.startsWith("text/")) {
      tags.push("text", "needs_text_extraction");
    } else if (
      mediaType.includes("spreadsheet") ||
      mediaType.includes("excel")
    ) {
      tags.push("spreadsheet", "needs_data_extraction");
    } else if (
      mediaType.includes("presentation") ||
      mediaType.includes("powerpoint")
    ) {
      tags.push("presentation", "needs_text_extraction", "needs_thumbnail");
    } else if (
      mediaType.startsWith("application/zip") ||
      mediaType.includes("archive")
    ) {
      tags.push("archive", "needs_extraction");
    }

    return tags;
  }
}

// Singleton instance
export const fileUploadService = new FileUploadService();
