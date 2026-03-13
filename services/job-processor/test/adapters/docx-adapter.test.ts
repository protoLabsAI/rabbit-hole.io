/**
 * Integration tests for DocxAdapter.
 *
 * Tests the full pipeline: Buffer → DocxAdapter → ExtractionResult.
 * Includes a programmatically generated minimal DOCX fixture.
 */

import { describe, expect, it } from "vitest";

import type { FileSource } from "@proto/types";

import { DocxAdapter } from "../../src/adapters/docx-adapter.js";
import {
  CORRUPT_DOCX_BUFFER,
  buildMinimalDocx,
} from "../helpers/binary-fixtures.js";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function makeSource(buffer: Buffer, fileName?: string): FileSource {
  return {
    type: "file",
    buffer,
    mediaType: DOCX_MIME,
    ...(fileName ? { fileName } : {}),
  };
}

// ==================== canHandle ====================

describe("DocxAdapter.canHandle", () => {
  const adapter = new DocxAdapter();

  it("returns true for the DOCX MIME type", () => {
    expect(adapter.canHandle(makeSource(Buffer.alloc(4)))).toBe(true);
  });

  it("returns false for text/plain", () => {
    const source: FileSource = {
      type: "file",
      buffer: Buffer.alloc(4),
      mediaType: "text/plain",
    };
    expect(adapter.canHandle(source)).toBe(false);
  });

  it("returns false for application/pdf", () => {
    const source: FileSource = {
      type: "file",
      buffer: Buffer.alloc(4),
      mediaType: "application/pdf",
    };
    expect(adapter.canHandle(source)).toBe(false);
  });

  it("returns false when mediaType is undefined", () => {
    const source = {
      type: "file",
      buffer: Buffer.alloc(4),
    } as any as FileSource;
    expect(adapter.canHandle(source)).toBe(false);
  });
});

// ==================== extract — happy path (minimal DOCX fixture) ====================

describe("DocxAdapter.extract (happy path)", () => {
  const adapter = new DocxAdapter();
  const TEXT = "Hello DOCX world";

  it("extracts text from a valid minimal DOCX", async () => {
    const docx = buildMinimalDocx(TEXT);
    const result = await adapter.extract(makeSource(docx));
    expect(result.text).toContain(TEXT);
  });

  it("sets category to 'document'", async () => {
    const docx = buildMinimalDocx(TEXT);
    const result = await adapter.extract(makeSource(docx));
    expect(result.category).toBe("document");
  });

  it("returns an empty artifacts array", async () => {
    const docx = buildMinimalDocx(TEXT);
    const result = await adapter.extract(makeSource(docx));
    expect(result.artifacts).toEqual([]);
  });

  it("returns a positive wordCount", async () => {
    const docx = buildMinimalDocx(TEXT);
    const result = await adapter.extract(makeSource(docx));
    expect(result.metadata.wordCount).toBeGreaterThan(0);
  });

  it("includes required ExtractionResult fields", async () => {
    const docx = buildMinimalDocx(TEXT);
    const result = await adapter.extract(makeSource(docx));
    expect(result).toHaveProperty("text");
    expect(result).toHaveProperty("metadata");
    expect(result).toHaveProperty("artifacts");
    expect(result).toHaveProperty("category");
  });
});

// ==================== extract — metadata extraction ====================

describe("DocxAdapter.extract (metadata)", () => {
  const adapter = new DocxAdapter();

  it("includes wordCount, paragraphCount, embeddedImagesCount in metadata", async () => {
    const docx = buildMinimalDocx("One paragraph here");
    const result = await adapter.extract(makeSource(docx));
    expect(result.metadata).toHaveProperty("wordCount");
    expect(result.metadata).toHaveProperty("paragraphCount");
    expect(result.metadata).toHaveProperty("embeddedImagesCount");
  });

  it("includes mediaType in metadata", async () => {
    const docx = buildMinimalDocx("content");
    const result = await adapter.extract(makeSource(docx));
    expect(result.metadata.mediaType).toBe(DOCX_MIME);
  });

  it("includes fileName in metadata when provided", async () => {
    const docx = buildMinimalDocx("content");
    const result = await adapter.extract(makeSource(docx, "report.docx"));
    expect(result.metadata.fileName).toBe("report.docx");
  });

  it("does not include fileName when not provided", async () => {
    const docx = buildMinimalDocx("content");
    const result = await adapter.extract(makeSource(docx));
    expect(result.metadata.fileName).toBeUndefined();
  });

  it("reports 0 embedded images for a plain DOCX", async () => {
    const docx = buildMinimalDocx("no images here");
    const result = await adapter.extract(makeSource(docx));
    expect(result.metadata.embeddedImagesCount).toBe(0);
  });
});

// ==================== extract — error handling ====================

describe("DocxAdapter.extract (error handling)", () => {
  const adapter = new DocxAdapter();

  it("handles corrupt DOCX gracefully and returns empty text", async () => {
    const result = await adapter.extract(makeSource(CORRUPT_DOCX_BUFFER));
    expect(result.text).toBe("");
    expect(result.category).toBe("document");
    expect(result.artifacts).toEqual([]);
    expect(result.metadata.wordCount).toBe(0);
    expect(result.metadata.paragraphCount).toBe(0);
    expect(result.metadata).toHaveProperty("error");
  });

  it("sets category to 'document' even on error", async () => {
    const result = await adapter.extract(makeSource(CORRUPT_DOCX_BUFFER));
    expect(result.category).toBe("document");
  });

  it("includes mediaType in metadata even on error", async () => {
    const result = await adapter.extract(makeSource(CORRUPT_DOCX_BUFFER));
    expect(result.metadata.mediaType).toBe(DOCX_MIME);
  });

  it("includes error message in metadata for corrupt input", async () => {
    const result = await adapter.extract(makeSource(CORRUPT_DOCX_BUFFER));
    expect(typeof result.metadata.error).toBe("string");
  });

  it("handles empty buffer gracefully", async () => {
    const result = await adapter.extract(makeSource(Buffer.alloc(0)));
    expect(result.category).toBe("document");
    expect(result.metadata).toHaveProperty("error");
  });
});

// ==================== getMetadata ====================

describe("DocxAdapter.getMetadata", () => {
  const adapter = new DocxAdapter();

  it("returns wordCount for a valid DOCX", async () => {
    const docx = buildMinimalDocx("Hello metadata world");
    const meta = await adapter.getMetadata(makeSource(docx));
    expect(meta).toHaveProperty("wordCount");
    expect(meta.wordCount).toBeGreaterThan(0);
  });

  it("includes byteSize for file sources", async () => {
    const docx = buildMinimalDocx("content");
    const meta = await adapter.getMetadata(makeSource(docx));
    expect(meta.byteSize).toBe(docx.length);
  });

  it("returns a defined object for corrupt input", async () => {
    const meta = await adapter.getMetadata(makeSource(CORRUPT_DOCX_BUFFER));
    expect(meta).toBeDefined();
    expect(typeof meta).toBe("object");
  });

  it("includes byteSize even for corrupt input", async () => {
    const meta = await adapter.getMetadata(makeSource(CORRUPT_DOCX_BUFFER));
    expect(meta.byteSize).toBe(CORRUPT_DOCX_BUFFER.length);
  });
});
