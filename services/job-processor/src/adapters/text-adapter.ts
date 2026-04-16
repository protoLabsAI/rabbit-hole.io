/**
 * TextAdapter
 *
 * Handles plain-text sources (text/plain).
 * Decodes the buffer as UTF-8 and extracts word count and line count metadata.
 */

import type {
  ExtractionResult,
  IngestSource,
  MediaAdapter,
} from "@protolabsai/types";

export class TextAdapter implements MediaAdapter {
  canHandle(source: IngestSource): boolean {
    const mediaType = source.mediaType ?? "";
    return mediaType.startsWith("text/plain");
  }

  async extract(source: IngestSource): Promise<ExtractionResult> {
    const text = await this.readText(source);
    const lines = text.split("\n");
    const words = text.trim() === "" ? [] : text.trim().split(/\s+/);

    return {
      text,
      metadata: {
        lineCount: lines.length,
        wordCount: words.length,
        mediaType: source.mediaType ?? "text/plain",
        ...(source.type === "file" && source.fileName
          ? { fileName: source.fileName }
          : {}),
      },
      artifacts: [],
      category: "text",
    };
  }

  async getMetadata(source: IngestSource): Promise<Record<string, unknown>> {
    const text = await this.readText(source);
    const lines = text.split("\n");
    const words = text.trim() === "" ? [] : text.trim().split(/\s+/);

    return {
      lineCount: lines.length,
      wordCount: words.length,
      ...(source.type === "file" ? { byteSize: source.buffer.length } : {}),
    };
  }

  private async readText(source: IngestSource): Promise<string> {
    if (source.type === "file") {
      return source.buffer.toString("utf-8");
    }
    const response = await fetch(source.url);
    return response.text();
  }
}
