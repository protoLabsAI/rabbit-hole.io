/**
 * OfficeAdapter — format routing + a lightweight CSV extraction (no binary
 * fixtures needed; officeparser parses CSV text directly).
 */

import { describe, expect, it } from "vitest";

import type { FileSource, IngestSource } from "@protolabsai/types";

import { OfficeAdapter } from "../office-adapter.js";

const adapter = new OfficeAdapter();

const file = (mediaType: string, fileName?: string): IngestSource =>
  ({
    type: "file",
    buffer: Buffer.from(""),
    mediaType,
    ...(fileName ? { fileName } : {}),
  }) as FileSource;

describe("OfficeAdapter.canHandle", () => {
  it.each([
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.oasis.opendocument.text",
    "application/rtf",
    "text/csv",
  ])("handles %s", (mediaType) => {
    expect(adapter.canHandle(file(mediaType))).toBe(true);
  });

  it("handles a .xlsx URL without an explicit mediaType", () => {
    expect(
      adapter.canHandle({
        type: "url",
        url: "https://example.com/report.xlsx",
      } as IngestSource)
    ).toBe(true);
  });

  it.each(["application/pdf", "text/plain", "image/png", "audio/mpeg"])(
    "does NOT claim %s (owned by another adapter)",
    (mediaType) => {
      expect(adapter.canHandle(file(mediaType))).toBe(false);
    }
  );
});

describe("OfficeAdapter.extract", () => {
  it("extracts a CSV into markdown", async () => {
    const csv = "name,role\nAlice,architect\nBob,builder\n";
    const result = await adapter.extract({
      type: "file",
      buffer: Buffer.from(csv, "utf-8"),
      mediaType: "text/csv",
      fileName: "team.csv",
    } as FileSource);

    expect(result.category).toBe("document");
    expect(result.metadata.extractedVia).toBe("officeparser");
    // Cell contents survive into the extracted text.
    expect(result.text).toMatch(/Alice/);
    expect(result.text).toMatch(/architect/);
  });
});
