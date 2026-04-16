/**
 * MarkdownAdapter
 *
 * Handles Markdown sources (text/markdown).
 * Parses YAML frontmatter, extracts headings and links as metadata,
 * and strips Markdown syntax to produce plain text.
 */

import type {
  ExtractionResult,
  IngestSource,
  MediaAdapter,
} from "@protolabsai/types";

// ==================== Frontmatter Parsing ====================

interface FrontmatterResult {
  data: Record<string, unknown>;
  content: string;
}

/**
 * Parse YAML-style frontmatter delimited by `---` fences.
 * Handles simple `key: value` pairs only (no nested objects or arrays).
 */
function parseFrontmatter(raw: string): FrontmatterResult {
  const fenceRe = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)([\s\S]*)$/;
  const match = raw.match(fenceRe);

  if (!match) {
    return { data: {}, content: raw };
  }

  const yamlBlock = match[1];
  const body = match[3] ?? "";

  const data: Record<string, unknown> = {};
  for (const line of yamlBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx <= 0) continue;

    const key = line.slice(0, colonIdx).trim();
    const rawValue = line.slice(colonIdx + 1).trim();

    if (!key) continue;

    // Strip surrounding quotes if present
    const value = rawValue.replace(/^["'](.*)["']$/, "$1");
    data[key] = value;
  }

  return { data, content: body };
}

// ==================== Markdown to Plain Text ====================

/**
 * Extract ATX headings (`#`, `##`, …) from Markdown content.
 * Returns an array of heading text values (without the `#` prefix).
 */
function extractHeadings(md: string): string[] {
  const headings: string[] = [];
  for (const line of md.split("\n")) {
    const m = line.match(/^#{1,6}\s+(.+)$/);
    if (m) {
      headings.push(m[1].trim());
    }
  }
  return headings;
}

/**
 * Extract all Markdown links `[text](url)` from content.
 * Returns an array of `{ text, url }` objects.
 */
function extractLinks(md: string): Array<{ text: string; url: string }> {
  const links: Array<{ text: string; url: string }> = [];
  const re = /\[([^\]]*)\]\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    links.push({ text: m[1], url: m[2] });
  }
  return links;
}

/**
 * Strip common Markdown syntax and return plain text.
 */
function stripMarkdown(md: string): string {
  return (
    md
      // Remove fenced code blocks
      .replace(/```[\s\S]*?```/g, "")
      // Remove inline code
      .replace(/`[^`]*`/g, "")
      // Remove images ![alt](url)
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      // Replace links [text](url) with text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Remove ATX headings marker
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italic markers
      .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, "$2")
      // Remove blockquote markers
      .replace(/^>\s*/gm, "")
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // Collapse extra whitespace
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

// ==================== MarkdownAdapter ====================

export class MarkdownAdapter implements MediaAdapter {
  canHandle(source: IngestSource): boolean {
    const mediaType = source.mediaType ?? "";
    return (
      mediaType.startsWith("text/markdown") ||
      mediaType.startsWith("text/x-markdown")
    );
  }

  async extract(source: IngestSource): Promise<ExtractionResult> {
    const raw = await this.readText(source);
    const { data: frontmatter, content: body } = parseFrontmatter(raw);

    const headings = extractHeadings(body);
    const links = extractLinks(body);
    const plainText = stripMarkdown(body);

    const words = plainText.trim() === "" ? [] : plainText.trim().split(/\s+/);

    return {
      text: plainText,
      metadata: {
        frontmatter,
        headings,
        links,
        wordCount: words.length,
        mediaType: source.mediaType ?? "text/markdown",
        ...(source.type === "file" && source.fileName
          ? { fileName: source.fileName }
          : {}),
      },
      artifacts: [],
      category: "document",
    };
  }

  async getMetadata(source: IngestSource): Promise<Record<string, unknown>> {
    const raw = await this.readText(source);
    const { data: frontmatter, content: body } = parseFrontmatter(raw);
    const headings = extractHeadings(body);

    return {
      frontmatter,
      headingCount: headings.length,
      headings,
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
