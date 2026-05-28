/**
 * ImageAdapter — routing only. The OCR path (tesseract.js) downloads WASM +
 * traineddata and runs a model, so the actual recognition is exercised by live
 * end-to-end validation rather than this unit suite.
 */

import { describe, expect, it } from "vitest";

import type { FileSource, IngestSource } from "@protolabsai/types";

import { ImageAdapter } from "../image-adapter.js";

const adapter = new ImageAdapter();

const file = (mediaType: string): IngestSource =>
  ({ type: "file", buffer: Buffer.from(""), mediaType }) as FileSource;

const url = (u: string): IngestSource =>
  ({ type: "url", url: u }) as IngestSource;

describe("ImageAdapter.canHandle", () => {
  it.each(["image/png", "image/jpeg", "image/tiff", "image/webp"])(
    "handles %s file sources",
    (mediaType) => {
      expect(adapter.canHandle(file(mediaType))).toBe(true);
    }
  );

  it.each([
    "https://example.com/scan.png",
    "https://example.com/photo.JPG",
    "https://cdn.example.com/diagram.tiff",
  ])("handles image URL %s by extension", (u) => {
    expect(adapter.canHandle(url(u))).toBe(true);
  });

  it.each(["application/pdf", "text/plain", "video/mp4", "audio/mpeg"])(
    "does NOT claim %s",
    (mediaType) => {
      expect(adapter.canHandle(file(mediaType))).toBe(false);
    }
  );

  it("does NOT claim a non-image URL", () => {
    expect(adapter.canHandle(url("https://example.com/doc.pdf"))).toBe(false);
  });
});
