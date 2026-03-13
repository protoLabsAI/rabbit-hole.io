/**
 * Text Extraction Job
 *
 * Handles text extraction from various file types (TXT, MD, HTML)
 * Updates file processing state in Neo4j
 */

import { Job } from "sidequest";

import type { TextExtractionJobData } from "@proto/sidequest-utils";
import { MinioService } from "@proto/utils/storage";

export class TextExtractionJob extends Job {
  private minioService = new MinioService();

  async run(data: TextExtractionJobData) {
    const { fileUid, canonicalKey, mediaType, fileName } = data;

    console.log(`🔍 Starting text extraction for ${fileUid} (${fileName})`);

    try {
      // Update processing state to 'processing'
      await this.updateProcessingState(fileUid, "processing");

      // Download file from MinIO
      const fileBuffer = await this.downloadFile(canonicalKey);

      // Extract text based on file type
      const extractedText = await this.extractText(
        fileBuffer,
        mediaType,
        fileName
      );

      // Update Neo4j with extracted content
      await this.updateFileWithExtractedText(fileUid, extractedText);

      // Mark as processed
      await this.updateProcessingState(fileUid, "processed", undefined, {
        text: extractedText,
        extractedAt: new Date().toISOString(),
      });

      console.log(`✅ Text extraction completed for ${fileUid}`);

      return {
        success: true,
        fileUid,
        textLength: extractedText.length,
        extractedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`❌ Text extraction failed for ${fileUid}:`, error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await this.updateProcessingState(fileUid, "failed", errorMessage);

      throw error;
    }
  }

  private async downloadFile(canonicalKey: string): Promise<Buffer> {
    return await this.minioService.downloadFile(canonicalKey);
  }

  private async extractText(
    buffer: Buffer,
    mediaType: string,
    _fileName: string
  ): Promise<string> {
    switch (mediaType) {
      case "application/pdf":
        throw new Error(
          "PDF extraction not yet implemented. Use dedicated PDF processing service."
        );

      case "text/plain":
      case "text/markdown":
        return buffer.toString("utf-8");

      case "text/html":
        // Basic HTML text extraction (remove tags)
        return buffer
          .toString("utf-8")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      default:
        // Try as plain text fallback
        if (mediaType.startsWith("text/")) {
          return buffer.toString("utf-8");
        }
        throw new Error(
          `Unsupported file type for text extraction: ${mediaType}`
        );
    }
  }

  private async updateProcessingState(
    fileUid: string,
    state: string,
    error?: string,
    extractedData?: unknown
  ) {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/files/update-processing-state`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add auth headers if needed
        },
        body: JSON.stringify({
          fileUid,
          processingState: state,
          processingError: error,
          extractedData,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update processing state: ${response.statusText}`
      );
    }
  }

  private async updateFileWithExtractedText(
    _fileUid: string,
    _extractedText: string
  ) {
    // This will be handled by the updateProcessingState call with extractedData
    // Neo4j update happens in the API endpoint
  }
}
