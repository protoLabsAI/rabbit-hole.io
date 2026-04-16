/**
 * Integration tests for TextAdapter.
 *
 * Tests the full pipeline: fixture file → TextAdapter → ExtractionResult.
 */

import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

import { describe, expect, it } from "vitest";

import type { FileSource } from "@protolabsai/types";

import { TextAdapter } from "../../src/adapters/text-adapter.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FIXTURES = resolve(__dirname, "../fixtures");

function makeSource(content: string, mediaType = "text/plain"): FileSource {
  return {
    type: "file",
    buffer: Buffer.from(content, "utf-8"),
    mediaType,
  };
}

// ==================== canHandle ====================

describe("TextAdapter.canHandle", () => {
  const adapter = new TextAdapter();

  it("returns true for text/plain", () => {
    expect(adapter.canHandle(makeSource("hello", "text/plain"))).toBe(true);
  });

  it("returns true for text/plain with charset parameter", () => {
    expect(
      adapter.canHandle(makeSource("hello", "text/plain; charset=utf-8"))
    ).toBe(true);
  });

  it("returns false for text/html", () => {
    expect(adapter.canHandle(makeSource("hello", "text/html"))).toBe(false);
  });

  it("returns false for text/markdown", () => {
    expect(adapter.canHandle(makeSource("hello", "text/markdown"))).toBe(false);
  });

  it("returns false for application/pdf", () => {
    expect(adapter.canHandle(makeSource("hello", "application/pdf"))).toBe(
      false
    );
  });
});

// ==================== extract — happy path via fixture ====================

describe("TextAdapter.extract (fixture: sample.txt)", () => {
  const adapter = new TextAdapter();

  it("extracts text content from a fixture file", async () => {
    const buffer = await readFile(resolve(FIXTURES, "sample.txt"));
    const source: FileSource = {
      type: "file",
      buffer,
      mediaType: "text/plain",
      fileName: "sample.txt",
    };

    const result = await adapter.extract(source);
    expect(result.text).toContain("Hello World");
  });

  it("sets category to 'text'", async () => {
    const buffer = await readFile(resolve(FIXTURES, "sample.txt"));
    const source: FileSource = {
      type: "file",
      buffer,
      mediaType: "text/plain",
    };

    const result = await adapter.extract(source);
    expect(result.category).toBe("text");
  });

  it("returns empty artifacts array", async () => {
    const buffer = await readFile(resolve(FIXTURES, "sample.txt"));
    const source: FileSource = {
      type: "file",
      buffer,
      mediaType: "text/plain",
    };

    const result = await adapter.extract(source);
    expect(result.artifacts).toEqual([]);
  });

  it("counts words correctly from fixture", async () => {
    const buffer = await readFile(resolve(FIXTURES, "sample.txt"));
    const source: FileSource = {
      type: "file",
      buffer,
      mediaType: "text/plain",
    };

    const result = await adapter.extract(source);
    expect(result.metadata.wordCount).toBeGreaterThan(0);
    expect(typeof result.metadata.wordCount).toBe("number");
  });

  it("counts lines correctly from fixture", async () => {
    const buffer = await readFile(resolve(FIXTURES, "sample.txt"));
    const source: FileSource = {
      type: "file",
      buffer,
      mediaType: "text/plain",
    };

    const result = await adapter.extract(source);
    // sample.txt has 4 non-empty lines
    expect(result.metadata.lineCount).toBeGreaterThanOrEqual(4);
  });

  it("includes fileName in metadata when provided", async () => {
    const buffer = await readFile(resolve(FIXTURES, "sample.txt"));
    const source: FileSource = {
      type: "file",
      buffer,
      mediaType: "text/plain",
      fileName: "sample.txt",
    };

    const result = await adapter.extract(source);
    expect(result.metadata.fileName).toBe("sample.txt");
  });
});

// ==================== extract — metadata extraction ====================

describe("TextAdapter.extract (metadata)", () => {
  const adapter = new TextAdapter();

  it("returns required ExtractionResult fields", async () => {
    const result = await adapter.extract(makeSource("test content"));
    expect(result).toHaveProperty("text");
    expect(result).toHaveProperty("metadata");
    expect(result).toHaveProperty("artifacts");
    expect(result).toHaveProperty("category");
  });

  it("includes wordCount and lineCount in metadata", async () => {
    const result = await adapter.extract(
      makeSource("one two three\nfour five")
    );
    expect(result.metadata).toHaveProperty("wordCount");
    expect(result.metadata).toHaveProperty("lineCount");
    expect(result.metadata.wordCount).toBe(5);
    expect(result.metadata.lineCount).toBe(2);
  });

  it("includes mediaType in metadata", async () => {
    const content = "hello world";
    const result = await adapter.extract(makeSource(content));
    expect(result.metadata.mediaType).toBe("text/plain");
  });
});

// ==================== extract — error / edge cases ====================

describe("TextAdapter.extract (error handling)", () => {
  const adapter = new TextAdapter();

  it("handles empty buffer gracefully", async () => {
    const result = await adapter.extract(makeSource(""));
    expect(result.text).toBe("");
    expect(result.metadata.wordCount).toBe(0);
    expect(result.metadata.lineCount).toBe(1);
  });

  it("handles whitespace-only content", async () => {
    const result = await adapter.extract(makeSource("   \n  \n  "));
    expect(result.metadata.wordCount).toBe(0);
  });

  it("handles unicode content", async () => {
    const content = "こんにちは 世界 🌍";
    const result = await adapter.extract(makeSource(content));
    expect(result.text).toBe(content);
  });
});

// ==================== getMetadata ====================

describe("TextAdapter.getMetadata", () => {
  const adapter = new TextAdapter();

  it("returns metadata matching extract output", async () => {
    const source = makeSource("alpha beta gamma\ndelta epsilon");
    const meta = await adapter.getMetadata(source);
    const result = await adapter.extract(source);
    expect(meta.wordCount).toBe(result.metadata.wordCount);
    expect(meta.lineCount).toBe(result.metadata.lineCount);
  });

  it("includes byteSize for file sources", async () => {
    const content = "hello";
    const meta = await adapter.getMetadata(makeSource(content));
    expect(meta.byteSize).toBe(Buffer.byteLength(content, "utf8"));
  });
});
