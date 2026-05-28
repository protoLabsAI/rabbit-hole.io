/**
 * OfficeAdapter
 *
 * Fills the document-format breadth gap not covered by the dedicated adapters:
 * presentations (PPTX / ODP), spreadsheets (XLSX / ODS), OpenDocument text
 * (ODT), RTF, and CSV. Parses via officeparser and emits Markdown so table
 * structure (spreadsheets, slide tables) is preserved for the corpus.
 *
 * DOCX stays with mammoth and PDF with unpdf (both registered first, so they
 * win); this adapter intentionally only claims the formats they don't cover.
 */

import { parseOffice, type SupportedFileType } from "officeparser";

import type {
  ExtractionResult,
  IngestSource,
  MediaAdapter,
} from "@protolabsai/types";

const MIME_TO_FILETYPE: Record<string, SupportedFileType> = {
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.oasis.opendocument.text": "odt",
  "application/vnd.oasis.opendocument.presentation": "odp",
  "application/vnd.oasis.opendocument.spreadsheet": "ods",
  "application/rtf": "rtf",
  "text/rtf": "rtf",
  "text/csv": "csv",
};

const EXT_TO_FILETYPE: Record<string, SupportedFileType> = {
  pptx: "pptx",
  xlsx: "xlsx",
  odt: "odt",
  odp: "odp",
  ods: "ods",
  rtf: "rtf",
  csv: "csv",
};

function urlExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return pathname.split(".").pop() ?? "";
  } catch {
    return "";
  }
}

/** Resolve the officeparser fileType for a source, or undefined if unsupported. */
function fileTypeFor(source: IngestSource): SupportedFileType | undefined {
  const mediaType = source.mediaType ?? "";
  if (MIME_TO_FILETYPE[mediaType]) return MIME_TO_FILETYPE[mediaType];
  const ext =
    source.type === "url"
      ? urlExtension(source.url)
      : (source.fileName?.split(".").pop()?.toLowerCase() ?? "");
  return EXT_TO_FILETYPE[ext];
}

export class OfficeAdapter implements MediaAdapter {
  canHandle(source: IngestSource): boolean {
    return fileTypeFor(source) !== undefined;
  }

  async extract(source: IngestSource): Promise<ExtractionResult> {
    const fileType = fileTypeFor(source);
    const buffer = await this.readBuffer(source);

    // Markdown preserves spreadsheet/slide table structure for the corpus.
    const ast = await parseOffice(buffer, fileType ? { fileType } : undefined);
    const { value } = await ast.to("md");
    const text = (typeof value === "string" ? value : "").trim();

    const words = text === "" ? [] : text.split(/\s+/);

    return {
      text,
      metadata: {
        ...(fileType ? { fileType } : {}),
        wordCount: words.length,
        extractedVia: "officeparser",
        mediaType: source.mediaType ?? "",
        ...(source.type === "file" && source.fileName
          ? { fileName: source.fileName }
          : {}),
      },
      artifacts: [],
      category: "document",
    };
  }

  async getMetadata(source: IngestSource): Promise<Record<string, unknown>> {
    return {
      ...(fileTypeFor(source) ? { fileType: fileTypeFor(source) } : {}),
      mediaType: source.mediaType ?? "",
      ...(source.type === "file" ? { byteSize: source.buffer.length } : {}),
    };
  }

  private async readBuffer(source: IngestSource): Promise<Buffer> {
    if (source.type === "file") return source.buffer;
    const response = await fetch(source.url);
    return Buffer.from(await response.arrayBuffer());
  }
}
