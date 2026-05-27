/**
 * HtmlAdapter
 *
 * Handles HTML sources (text/html).
 * Strips HTML tags to produce plain text, and extracts the <title> and
 * <meta> tags as metadata.
 */

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

import type {
  ExtractionResult,
  IngestSource,
  MediaAdapter,
} from "@protolabsai/types";

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

/**
 * Extract the main article text via Mozilla Readability, dropping page chrome
 * (nav, headers, footers, sidebars, reference lists). Returns null when the
 * page isn't article-like or parsing fails, so the caller can fall back to the
 * tag-stripping path. Real pages wrap chrome in div+class, not semantic tags,
 * so a regex strip alone leaves it in — Readability is what keeps the corpus
 * (and `rh recall`) free of boilerplate.
 */
// Reference/citation/nav chrome that Readability otherwise keeps as article
// body — bibliography lists are the main culprit, and their topically-worded
// citation titles outrank real prose in corpus recall. Removed from the DOM
// before extraction.
const REFERENCE_SELECTORS = [
  "sup.reference", // inline [1] markers
  "ol.references",
  ".references",
  ".reflist",
  ".mw-references-wrap", // Wikipedia bibliography
  ".navbox",
  ".mw-editsection",
  ".citation",
].join(",");

/**
 * Drop residual citation back-reference lines (Wikipedia renders reflist
 * backlinks as `^ a b c …`) that survive DOM cleaning.
 */
function dropCitationLines(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^\s*\^/.test(line))
    .join("\n")
    .trim();
}

function extractReadable(
  html: string,
  url?: string
): { text: string; title?: string } | null {
  try {
    const dom = new JSDOM(html, url ? { url } : undefined);
    const doc = dom.window.document;
    // Strip reference/citation chrome before Readability so the corpus stores
    // article prose, not bibliographies.
    doc.querySelectorAll(REFERENCE_SELECTORS).forEach((el) => el.remove());

    const article = new Readability(doc).parse();
    const text = dropCitationLines(article?.textContent?.trim() ?? "");
    // Require a non-trivial amount of text — short results usually mean
    // Readability bailed (login walls, JS-rendered pages, fragments).
    if (text.length < 200) return null;
    return { text, title: article?.title?.trim() || undefined };
  } catch {
    return null;
  }
}

// ==================== HtmlAdapter ====================

export class HtmlAdapter implements MediaAdapter {
  canHandle(source: IngestSource): boolean {
    const mediaType = source.mediaType ?? "";
    return mediaType.startsWith("text/html");
  }

  async extract(source: IngestSource): Promise<ExtractionResult> {
    const html = await this.readText(source);

    const metaTags = extractMetaTags(html);

    // Prefer Readability's main-content extraction; fall back to tag-stripping
    // for non-article pages or parse failures.
    const readable = extractReadable(
      html,
      source.type === "url" ? source.url : undefined
    );
    const text = readable?.text ?? stripHtml(html);
    const title = readable?.title ?? extractTitle(html);
    const extractedVia = readable ? "readability" : "striphtml";

    const words = text.trim() === "" ? [] : text.trim().split(/\s+/);

    return {
      text,
      metadata: {
        ...(title !== undefined ? { title } : {}),
        metaTags,
        wordCount: words.length,
        extractedVia,
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
