/**
 * Registry wiring — guards that every adapter is actually registered. PDF and
 * DOCX were previously missing, so those ingests failed with
 * "no registered adapter can handle source" for any source, URL or file.
 */

import { describe, expect, it } from "vitest";

import type { IngestSource } from "@protolabsai/types";

import { buildAdapterRegistry } from "../index.js";

const registry = buildAdapterRegistry();

const url = (mediaType: string): IngestSource =>
  ({ type: "url", url: "https://example.com/x", mediaType }) as IngestSource;

describe("buildAdapterRegistry — adapter resolution", () => {
  it.each([
    ["application/pdf", "PdfAdapter"],
    [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "DocxAdapter",
    ],
    ["text/plain", "TextAdapter"],
    ["text/markdown", "MarkdownAdapter"],
    ["text/html", "HtmlAdapter"],
    [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "OfficeAdapter",
    ],
    [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "OfficeAdapter",
    ],
    ["text/csv", "OfficeAdapter"],
    ["application/rtf", "OfficeAdapter"],
    ["image/png", "ImageAdapter"],
    ["image/jpeg", "ImageAdapter"],
    ["audio/mpeg", "AudioAdapter"],
    ["video/mp4", "VideoAdapter"],
  ])("resolves %s → %s", (mediaType, expected) => {
    const adapter = registry.resolve(url(mediaType));
    expect(adapter?.constructor.name).toBe(expected);
  });

  it("resolves a YouTube URL to the VideoAdapter", () => {
    const adapter = registry.resolve({
      type: "url",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      mediaType: "video/mp4",
    } as IngestSource);
    expect(adapter?.constructor.name).toBe("VideoAdapter");
  });
});
