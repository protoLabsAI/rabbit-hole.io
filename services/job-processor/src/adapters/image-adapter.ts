/**
 * ImageAdapter
 *
 * OCRs images (PNG / JPEG / TIFF / BMP / WEBP / GIF) into text via tesseract.js
 * (WASM Tesseract — no native build). Language defaults to English; override
 * with OCR_LANG (e.g. "eng+deu").
 *
 * Note: tesseract.js lazily downloads its core + language traineddata on first
 * use. The job-processor has network egress so this works out of the box; a
 * fully offline deployment would bundle traineddata and set langPath/corePath.
 * Scanned *PDFs* are out of scope here — that's the Docling sidecar (Phase 2).
 */

import { extname } from "node:path";

// tesseract.js is CommonJS — a named ESM import (`{ recognize }`) resolves
// under vitest but throws "does not provide an export named 'recognize'" in the
// worker's Node ESM runtime, breaking the whole adapter module. Default-import
// the module object and pull the function off it.
import Tesseract from "tesseract.js";

const { recognize } = Tesseract;

import type {
  ExtractionResult,
  IngestSource,
  MediaAdapter,
} from "@protolabsai/types";

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".tif",
  ".tiff",
  ".bmp",
  ".webp",
  ".gif",
  ".pbm",
]);

const OCR_LANG = process.env.OCR_LANG || "eng";

function isImageUrl(url: string): boolean {
  try {
    return IMAGE_EXTENSIONS.has(extname(new URL(url).pathname.toLowerCase()));
  } catch {
    return false;
  }
}

export class ImageAdapter implements MediaAdapter {
  canHandle(source: IngestSource): boolean {
    const mediaType = source.mediaType ?? "";
    if (mediaType.startsWith("image/")) return true;
    if (source.type === "url") return isImageUrl(source.url);
    return false;
  }

  async extract(source: IngestSource): Promise<ExtractionResult> {
    const buffer = await this.readBuffer(source);

    const { data } = await recognize(buffer, OCR_LANG);
    const text = (data.text ?? "").trim();

    const words = text === "" ? [] : text.split(/\s+/);

    return {
      text,
      metadata: {
        ocrConfidence: data.confidence,
        ocrLang: OCR_LANG,
        wordCount: words.length,
        extractedVia: "tesseract.js",
        mediaType: source.mediaType ?? "",
        ...(source.type === "file" && source.fileName
          ? { fileName: source.fileName }
          : {}),
      },
      artifacts: [],
      // OCR'd images become text documents in the corpus (MediaCategory has no
      // dedicated "image" value).
      category: "document",
    };
  }

  async getMetadata(source: IngestSource): Promise<Record<string, unknown>> {
    return {
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
