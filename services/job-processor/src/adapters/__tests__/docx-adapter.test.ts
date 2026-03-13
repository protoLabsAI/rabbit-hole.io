import { describe, expect, it } from "vitest";

import type { FileSource } from "@proto/types";

import { DocxAdapter } from "../docx-adapter.js";

function makeFileSource(buffer: Buffer, mediaType?: string): FileSource {
  return {
    type: "file",
    buffer,
    mediaType:
      mediaType ??
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

describe("DocxAdapter", () => {
  const adapter = new DocxAdapter();

  describe("canHandle", () => {
    it("returns true for DOCX MIME type", () => {
      expect(
        adapter.canHandle(makeFileSource(Buffer.from(""), DOCX_MIME))
      ).toBe(true);
    });

    it("returns false for text/plain", () => {
      expect(
        adapter.canHandle(makeFileSource(Buffer.from(""), "text/plain"))
      ).toBe(false);
    });

    it("returns false for application/pdf", () => {
      expect(
        adapter.canHandle(makeFileSource(Buffer.from(""), "application/pdf"))
      ).toBe(false);
    });

    it("returns false when mediaType is undefined", () => {
      const source = {
        type: "file",
        buffer: Buffer.from(""),
        mediaType: undefined,
      } as any as FileSource;
      expect(adapter.canHandle(source)).toBe(false);
    });
  });

  describe("extract — corrupted DOCX handling", () => {
    it("handles corrupted DOCX gracefully and returns empty text", async () => {
      const corruptBuffer = Buffer.from("this is not a valid docx file");
      const result = await adapter.extract(makeFileSource(corruptBuffer));
      expect(result.text).toBe("");
      expect(result.category).toBe("document");
      expect(result.artifacts).toEqual([]);
      expect(result.metadata.wordCount).toBe(0);
      expect(result.metadata.paragraphCount).toBe(0);
      expect(result.metadata.embeddedImagesCount).toBe(0);
      expect(result.metadata).toHaveProperty("error");
    });

    it("sets category to document even on error", async () => {
      const result = await adapter.extract(
        makeFileSource(Buffer.from("bad data"))
      );
      expect(result.category).toBe("document");
    });
  });

  describe("extract — metadata structure", () => {
    it("returns ExtractionResult with required fields on corrupt input", async () => {
      const result = await adapter.extract(makeFileSource(Buffer.from("bad")));
      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("metadata");
      expect(result).toHaveProperty("artifacts");
      expect(result).toHaveProperty("category");
      expect(result.metadata).toHaveProperty("wordCount");
      expect(result.metadata).toHaveProperty("paragraphCount");
      expect(result.metadata).toHaveProperty("embeddedImagesCount");
      expect(result.metadata).toHaveProperty("mediaType");
    });

    it("includes mediaType in metadata", async () => {
      const result = await adapter.extract(makeFileSource(Buffer.from("bad")));
      expect(result.metadata.mediaType).toBe(DOCX_MIME);
    });

    it("includes fileName in metadata when provided", async () => {
      const source: FileSource = {
        type: "file",
        buffer: Buffer.from("bad"),
        mediaType: DOCX_MIME,
        fileName: "test.docx",
      };
      const result = await adapter.extract(source);
      expect(result.metadata.fileName).toBe("test.docx");
    });
  });

  describe("getMetadata — corrupted DOCX handling", () => {
    it("returns empty metadata object for corrupt input", async () => {
      const result = await adapter.getMetadata(
        makeFileSource(Buffer.from("bad"))
      );
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    });

    it("includes byteSize for file sources even on error", async () => {
      const buf = Buffer.from("bad data");
      const result = await adapter.getMetadata(makeFileSource(buf));
      expect(result.byteSize).toBe(buf.length);
    });
  });
});
