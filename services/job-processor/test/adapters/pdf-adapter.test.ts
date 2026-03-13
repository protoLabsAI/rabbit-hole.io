/**
 * Integration tests for PdfAdapter.
 *
 * Tests the full pipeline: Buffer → PdfAdapter → ExtractionResult.
 * Uses a programmatically generated minimal PDF fixture.
 */

import { describe, expect, it } from "vitest";

import type { FileSource } from "@proto/types";

import { PdfAdapter } from "../../src/adapters/pdf-adapter.js";
import {
  CORRUPT_PDF_BUFFER,
  buildMinimalPdf,
} from "../helpers/binary-fixtures.js";

const DOCX_MIME = "application/pdf";

function makePdfSource(buffer: Buffer, fileName?: string): FileSource {
  return {
    type: "file",
    buffer,
    mediaType: "application/pdf",
    ...(fileName ? { fileName } : {}),
  };
}

// ==================== canHandle ====================

describe("PdfAdapter.canHandle", () => {
  const adapter = new PdfAdapter();

  it("returns true for application/pdf", () => {
    expect(adapter.canHandle(makePdfSource(Buffer.alloc(4)))).toBe(true);
  });

  it("returns true for application/pdf with charset parameter", () => {
    const source: FileSource = {
      type: "file",
      buffer: Buffer.alloc(4),
      mediaType: "application/pdf; charset=utf-8",
    };
    expect(adapter.canHandle(source)).toBe(true);
  });

  it("returns false for text/plain", () => {
    const source: FileSource = {
      type: "file",
      buffer: Buffer.alloc(4),
      mediaType: "text/plain",
    };
    expect(adapter.canHandle(source)).toBe(false);
  });

  it("returns false for application/vnd.openxmlformats-officedocument.wordprocessingml.document", () => {
    const source: FileSource = {
      type: "file",
      buffer: Buffer.alloc(4),
      mediaType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
    expect(adapter.canHandle(source)).toBe(false);
  });

  it("returns false for image/png", () => {
    const source: FileSource = {
      type: "file",
      buffer: Buffer.alloc(4),
      mediaType: "image/png",
    };
    expect(adapter.canHandle(source)).toBe(false);
  });
});

// ==================== extract — happy path ====================

describe("PdfAdapter.extract (happy path)", () => {
  const adapter = new PdfAdapter();

  it("returns an ExtractionResult with required fields", async () => {
    const pdf = buildMinimalPdf();
    const result = await adapter.extract(makePdfSource(pdf));

    expect(result).toHaveProperty("text");
    expect(result).toHaveProperty("metadata");
    expect(result).toHaveProperty("artifacts");
    expect(result).toHaveProperty("category");
  });

  it("sets category to 'document'", async () => {
    const pdf = buildMinimalPdf();
    const result = await adapter.extract(makePdfSource(pdf));
    expect(result.category).toBe("document");
  });

  it("reports at least one page in metadata", async () => {
    const pdf = buildMinimalPdf();
    const result = await adapter.extract(makePdfSource(pdf));
    expect(result.metadata.pageCount).toBeGreaterThanOrEqual(1);
  });

  it("returns one artifact per page", async () => {
    const pdf = buildMinimalPdf();
    const result = await adapter.extract(makePdfSource(pdf));
    expect(result.artifacts.length).toBe(result.metadata.pageCount);
  });

  it("artifact keys follow the 'page-N' convention", async () => {
    const pdf = buildMinimalPdf();
    const result = await adapter.extract(makePdfSource(pdf));
    for (let i = 0; i < result.artifacts.length; i++) {
      expect(result.artifacts[i]!.key).toBe(`page-${i + 1}`);
    }
  });

  it("artifact mediaType is text/plain", async () => {
    const pdf = buildMinimalPdf();
    const result = await adapter.extract(makePdfSource(pdf));
    for (const artifact of result.artifacts) {
      expect(artifact.mediaType).toBe("text/plain");
    }
  });

  it("includes wordCount in metadata", async () => {
    const pdf = buildMinimalPdf();
    const result = await adapter.extract(makePdfSource(pdf));
    expect(typeof result.metadata.wordCount).toBe("number");
  });

  it("includes mediaType in metadata", async () => {
    const pdf = buildMinimalPdf();
    const result = await adapter.extract(makePdfSource(pdf));
    expect(result.metadata.mediaType).toBe("application/pdf");
  });
});

// ==================== extract — metadata extraction ====================

describe("PdfAdapter.extract (metadata)", () => {
  const adapter = new PdfAdapter();

  it("includes fileName in metadata when provided", async () => {
    const pdf = buildMinimalPdf();
    const result = await adapter.extract(
      makePdfSource(pdf, "test-document.pdf")
    );
    expect(result.metadata.fileName).toBe("test-document.pdf");
  });

  it("does not include fileName when not provided", async () => {
    const pdf = buildMinimalPdf();
    const result = await adapter.extract(makePdfSource(pdf));
    expect(result.metadata.fileName).toBeUndefined();
  });

  it("includes text with page markers", async () => {
    const pdf = buildMinimalPdf();
    const result = await adapter.extract(makePdfSource(pdf));
    // Pages are delimited with [Page N] markers
    expect(result.text).toContain("[Page 1]");
  });
});

// ==================== extract — error handling ====================

describe("PdfAdapter.extract (error handling)", () => {
  const adapter = new PdfAdapter();

  it("throws for a corrupt / non-PDF buffer", async () => {
    await expect(
      adapter.extract(makePdfSource(CORRUPT_PDF_BUFFER))
    ).rejects.toThrow();
  });

  it("throws an error with a descriptive message for corrupt input", async () => {
    await expect(
      adapter.extract(makePdfSource(CORRUPT_PDF_BUFFER))
    ).rejects.toThrow(/pdf|parse|open/i);
  });

  it("throws for an empty buffer", async () => {
    await expect(
      adapter.extract(makePdfSource(Buffer.alloc(0)))
    ).rejects.toThrow();
  });
});

// ==================== getMetadata ====================

describe("PdfAdapter.getMetadata", () => {
  const adapter = new PdfAdapter();

  it("returns pageCount for a valid PDF", async () => {
    const pdf = buildMinimalPdf();
    const meta = await adapter.getMetadata(makePdfSource(pdf));
    expect(meta).toHaveProperty("pageCount");
    expect(meta.pageCount).toBeGreaterThanOrEqual(1);
  });

  it("includes byteSize for file sources", async () => {
    const pdf = buildMinimalPdf();
    const meta = await adapter.getMetadata(makePdfSource(pdf));
    expect(meta.byteSize).toBe(pdf.length);
  });

  it("throws for corrupt input", async () => {
    await expect(
      adapter.getMetadata(makePdfSource(CORRUPT_PDF_BUFFER))
    ).rejects.toThrow();
  });
});
