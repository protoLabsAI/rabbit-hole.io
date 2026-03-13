/**
 * PdfAdapter
 *
 * Handles PDF sources (application/pdf).
 * Extracts text from all pages using unpdf's extractText, preserving per-page
 * boundaries as artifacts. Extracts PDF metadata (title, author, page count,
 * dates, producer) via getMeta. Supports layout-aware extraction mode for
 * complex documents. Handles encrypted/password-protected PDFs gracefully.
 */

import { extractText, getDocumentProxy, getMeta } from "unpdf";

import type {
  ExtractionResult,
  IngestSource,
  MediaAdapter,
} from "@proto/types";

// ==================== PdfAdapter ====================

export class PdfAdapter implements MediaAdapter {
  canHandle(source: IngestSource): boolean {
    const mediaType = source.mediaType ?? "";
    return mediaType.startsWith("application/pdf");
  }

  async extract(source: IngestSource): Promise<ExtractionResult> {
    const buffer = await this.readBuffer(source);

    let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
    try {
      pdf = await getDocumentProxy(new Uint8Array(buffer));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Surface encrypted / password-protected PDF errors clearly
      if (
        message.toLowerCase().includes("password") ||
        message.toLowerCase().includes("encrypted")
      ) {
        throw new Error(
          `PDF is encrypted or password-protected and cannot be processed: ${message}`
        );
      }
      throw new Error(`Failed to open PDF: ${message}`);
    }

    // Extract per-page text (layout-aware mode preserves spatial ordering)
    let totalPages: number;
    let pageTexts: string[];
    try {
      const result = await extractText(pdf, { mergePages: false });
      totalPages = result.totalPages;
      pageTexts = result.text as string[];
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to extract text from PDF: ${message}`);
    }

    // Merge all pages into a single string with clear page boundaries
    const fullText = pageTexts
      .map((t, i) => `[Page ${i + 1}]\n${t}`)
      .join("\n\n");

    // Extract metadata
    let pdfInfo: Record<string, unknown> = {};
    try {
      const { info } = await getMeta(pdf, { parseDates: true });
      pdfInfo = (info as Record<string, unknown>) ?? {};
    } catch {
      // Metadata extraction is best-effort; continue without it
    }

    const words = fullText.trim() === "" ? [] : fullText.trim().split(/\s+/);

    const metadata: Record<string, unknown> = {
      pageCount: totalPages,
      wordCount: words.length,
      mediaType: source.mediaType ?? "application/pdf",
      ...(source.type === "file" && source.fileName
        ? { fileName: source.fileName }
        : {}),
    };

    // Promote well-known PDF info fields into metadata
    if (pdfInfo["Title"]) metadata["title"] = pdfInfo["Title"];
    if (pdfInfo["Author"]) metadata["author"] = pdfInfo["Author"];
    if (pdfInfo["Producer"]) metadata["producer"] = pdfInfo["Producer"];
    if (pdfInfo["Creator"]) metadata["creator"] = pdfInfo["Creator"];
    if (pdfInfo["CreationDate"])
      metadata["creationDate"] =
        pdfInfo["CreationDate"] instanceof Date
          ? pdfInfo["CreationDate"].toISOString()
          : pdfInfo["CreationDate"];
    if (pdfInfo["ModDate"])
      metadata["modDate"] =
        pdfInfo["ModDate"] instanceof Date
          ? pdfInfo["ModDate"].toISOString()
          : pdfInfo["ModDate"];

    // Per-page artifacts — one entry per page so downstream consumers can
    // reference individual pages. The url field is left undefined until the
    // artifact is persisted to storage by the job runner.
    const artifacts = pageTexts.map((pageText, i) => ({
      key: `page-${i + 1}`,
      mediaType: "text/plain",
      label: `Page ${i + 1} (${pageText.trim().split(/\s+/).length} words)`,
    }));

    return {
      text: fullText,
      metadata,
      artifacts,
      category: "document",
    };
  }

  async getMetadata(source: IngestSource): Promise<Record<string, unknown>> {
    const buffer = await this.readBuffer(source);

    let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
    try {
      pdf = await getDocumentProxy(new Uint8Array(buffer));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.toLowerCase().includes("password") ||
        message.toLowerCase().includes("encrypted")
      ) {
        throw new Error(`PDF is encrypted or password-protected: ${message}`);
      }
      throw new Error(`Failed to open PDF: ${message}`);
    }

    const result = await extractText(pdf, { mergePages: true });
    const totalPages = result.totalPages;

    let pdfInfo: Record<string, unknown> = {};
    try {
      const { info } = await getMeta(pdf, { parseDates: true });
      pdfInfo = (info as Record<string, unknown>) ?? {};
    } catch {
      // Best-effort
    }

    const meta: Record<string, unknown> = {
      pageCount: totalPages,
      ...(source.type === "file" ? { byteSize: buffer.length } : {}),
    };

    if (pdfInfo["Title"]) meta["title"] = pdfInfo["Title"];
    if (pdfInfo["Author"]) meta["author"] = pdfInfo["Author"];
    if (pdfInfo["Producer"]) meta["producer"] = pdfInfo["Producer"];
    if (pdfInfo["Creator"]) meta["creator"] = pdfInfo["Creator"];
    if (pdfInfo["CreationDate"])
      meta["creationDate"] =
        pdfInfo["CreationDate"] instanceof Date
          ? pdfInfo["CreationDate"].toISOString()
          : pdfInfo["CreationDate"];
    if (pdfInfo["ModDate"])
      meta["modDate"] =
        pdfInfo["ModDate"] instanceof Date
          ? pdfInfo["ModDate"].toISOString()
          : pdfInfo["ModDate"];

    return meta;
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
