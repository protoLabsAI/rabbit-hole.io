/**
 * HtmlAdapter
 *
 * Handles HTML sources (text/html).
 * Strips HTML tags to produce plain text, and extracts the <title> and
 * <meta> tags as metadata.
 */

import type {
  ExtractionResult,
  IngestSource,
  MediaAdapter,
} from "@proto/types";

// ==================== HTML Utilities ====================

/**
 * Extract the content of the `<title>` element, if present.
 */
function extractTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1].trim()) : undefined;
}

/**
 * Extract all `<meta>` tag attributes as a flat key→value map.
 * Captures both `name/content` and `property/content` pairs.
 */
function extractMetaTags(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const re = /<meta\s([^>]+)>/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html)) !== null) {
    const attrs = m[1];

    const nameM = attrs.match(/(?:name|property)\s*=\s*["']([^"']*)["']/i);
    const contentM = attrs.match(/content\s*=\s*["']([^"']*)["']/i);

    if (nameM && contentM) {
      meta[nameM[1]] = contentM[1];
    }
  }

  return meta;
}

/**
 * Decode common HTML entities.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(parseInt(code, 10))
    );
}

/**
 * Strip all HTML tags and return plain text with normalised whitespace.
 */
function stripHtml(html: string): string {
  return decodeEntities(
    html
      // Remove <script> and <style> blocks entirely
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      // Replace block-level elements with newlines for readability
      .replace(
        /<\/(p|div|li|h[1-6]|br|tr|td|th|blockquote|pre|section|article|header|footer|main|nav|aside)[^>]*>/gi,
        "\n"
      )
      // Remove remaining tags
      .replace(/<[^>]+>/g, " ")
      // Normalise whitespace
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

// ==================== HtmlAdapter ====================

export class HtmlAdapter implements MediaAdapter {
  canHandle(source: IngestSource): boolean {
    const mediaType = source.mediaType ?? "";
    return mediaType.startsWith("text/html");
  }

  async extract(source: IngestSource): Promise<ExtractionResult> {
    const html = await this.readText(source);

    const title = extractTitle(html);
    const metaTags = extractMetaTags(html);
    const text = stripHtml(html);

    const words = text.trim() === "" ? [] : text.trim().split(/\s+/);

    return {
      text,
      metadata: {
        ...(title !== undefined ? { title } : {}),
        metaTags,
        wordCount: words.length,
        mediaType: source.mediaType ?? "text/html",
        ...(source.type === "file" && source.fileName
          ? { fileName: source.fileName }
          : {}),
      },
      artifacts: [],
      category: "document",
    };
  }

  async getMetadata(source: IngestSource): Promise<Record<string, unknown>> {
    const html = await this.readText(source);
    const title = extractTitle(html);
    const metaTags = extractMetaTags(html);

    return {
      ...(title !== undefined ? { title } : {}),
      metaTags,
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
