/**
 * DocxAdapter
 *
 * Handles DOCX sources (application/vnd.openxmlformats-officedocument.wordprocessingml.document).
 * Uses mammoth to convert DOCX to plain text, and extracts metadata including
 * word count, paragraph count, and embedded images count.
 */

import mammoth from "mammoth";

import type {
  ExtractionResult,
  IngestSource,
  MediaAdapter,
} from "@proto/types";

type MammothMessage = {
  type: "warning" | "error";
  message: string;
  error?: unknown;
};

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// ==================== DocxAdapter ====================

export class DocxAdapter implements MediaAdapter {
  canHandle(source: IngestSource): boolean {
    const mediaType = source.mediaType ?? "";
    return mediaType === DOCX_MIME_TYPE;
  }

  async extract(source: IngestSource): Promise<ExtractionResult> {
    const buffer = await this.readBuffer(source);

    let text = "";
    let paragraphCount = 0;
    let embeddedImagesCount = 0;

    try {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;

      // Count paragraphs: split on double-newlines or single newlines separating content
      paragraphCount = this.countParagraphs(text);

      // Count embedded images via mammoth's message output
      embeddedImagesCount = this.countEmbeddedImages(result.messages);
    } catch (err) {
      // Handle corrupted DOCX gracefully — return empty content with error metadata
      return {
        text: "",
        metadata: {
          wordCount: 0,
          paragraphCount: 0,
          embeddedImagesCount: 0,
          mediaType: source.mediaType ?? DOCX_MIME_TYPE,
          ...(source.type === "file" && source.fileName
            ? { fileName: source.fileName }
            : {}),
          error: err instanceof Error ? err.message : "Failed to parse DOCX",
        },
        artifacts: [],
        category: "document",
      };
    }

    const words = text.trim() === "" ? [] : text.trim().split(/\s+/);

    return {
      text,
      metadata: {
        wordCount: words.length,
        paragraphCount,
        embeddedImagesCount,
        mediaType: source.mediaType ?? DOCX_MIME_TYPE,
        ...(source.type === "file" && source.fileName
          ? { fileName: source.fileName }
          : {}),
      },
      artifacts: [],
      category: "document",
    };
  }

  async getMetadata(source: IngestSource): Promise<Record<string, unknown>> {
    const buffer = await this.readBuffer(source);

    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;
      const words = text.trim() === "" ? [] : text.trim().split(/\s+/);
      const paragraphCount = this.countParagraphs(text);
      const embeddedImagesCount = this.countEmbeddedImages(result.messages);

      return {
        wordCount: words.length,
        paragraphCount,
        embeddedImagesCount,
        ...(source.type === "file" ? { byteSize: buffer.length } : {}),
      };
    } catch {
      return {
        ...(source.type === "file" ? { byteSize: buffer.length } : {}),
      };
    }
  }

  // ==================== Private Helpers ====================

  private countParagraphs(text: string): number {
    if (text.trim() === "") return 0;
    // Split on one or more blank lines to identify paragraph blocks
    return text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0).length;
  }

  private countEmbeddedImages(messages: MammothMessage[]): number {
    // mammoth emits warnings for embedded images it cannot convert
    return messages.filter(
      (m) =>
        m.type === "warning" &&
        typeof m.message === "string" &&
        m.message.toLowerCase().includes("image")
    ).length;
  }

  private async readBuffer(source: IngestSource): Promise<Buffer> {
    if (source.type === "file") {
      return source.buffer;
    }
    const response = await fetch(source.url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
