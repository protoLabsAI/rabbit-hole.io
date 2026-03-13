import { describe, expect, it } from "vitest";

import type { FileSource } from "@proto/types";

import { TextAdapter } from "../text-adapter.js";

function makeFileSource(content: string, mediaType = "text/plain"): FileSource {
  return {
    type: "file",
    buffer: Buffer.from(content, "utf-8"),
    mediaType,
  };
}

describe("TextAdapter", () => {
  const adapter = new TextAdapter();

  describe("canHandle", () => {
    it("returns true for text/plain", () => {
      expect(adapter.canHandle(makeFileSource("hello", "text/plain"))).toBe(
        true
      );
    });

    it("returns true for text/plain; charset=utf-8", () => {
      expect(
        adapter.canHandle(makeFileSource("hello", "text/plain; charset=utf-8"))
      ).toBe(true);
    });

    it("returns false for text/html", () => {
      expect(adapter.canHandle(makeFileSource("hello", "text/html"))).toBe(
        false
      );
    });

    it("returns false for text/markdown", () => {
      expect(adapter.canHandle(makeFileSource("hello", "text/markdown"))).toBe(
        false
      );
    });
  });

  describe("extract", () => {
    it("returns the raw UTF-8 text", async () => {
      const result = await adapter.extract(
        makeFileSource("Hello world\nLine two")
      );
      expect(result.text).toBe("Hello world\nLine two");
    });

    it("counts lines correctly", async () => {
      const result = await adapter.extract(
        makeFileSource("line1\nline2\nline3")
      );
      expect(result.metadata.lineCount).toBe(3);
    });

    it("counts words correctly", async () => {
      const result = await adapter.extract(
        makeFileSource("one two three four")
      );
      expect(result.metadata.wordCount).toBe(4);
    });

    it("returns zero wordCount for empty content", async () => {
      const result = await adapter.extract(makeFileSource(""));
      expect(result.metadata.wordCount).toBe(0);
    });

    it("sets category to 'text'", async () => {
      const result = await adapter.extract(makeFileSource("hello"));
      expect(result.category).toBe("text");
    });

    it("returns empty artifacts array", async () => {
      const result = await adapter.extract(makeFileSource("hello"));
      expect(result.artifacts).toEqual([]);
    });

    it("includes fileName in metadata when provided", async () => {
      const source: FileSource = {
        type: "file",
        buffer: Buffer.from("hello"),
        mediaType: "text/plain",
        fileName: "notes.txt",
      };
      const result = await adapter.extract(source);
      expect(result.metadata.fileName).toBe("notes.txt");
    });
  });

  describe("getMetadata", () => {
    it("returns lineCount and wordCount", async () => {
      const meta = await adapter.getMetadata(makeFileSource("a b c\nd e"));
      expect(meta.lineCount).toBe(2);
      expect(meta.wordCount).toBe(5);
    });

    it("includes byteSize for file sources", async () => {
      const content = "hello";
      const meta = await adapter.getMetadata(makeFileSource(content));
      expect(meta.byteSize).toBe(Buffer.from(content).length);
    });
  });
});
