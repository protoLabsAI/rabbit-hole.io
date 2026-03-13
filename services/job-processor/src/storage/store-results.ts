/**
 * Store Extraction Result
 *
 * Writes extracted text, metadata, and optional binary artifacts to the
 * canonical storage path in MinIO, then writes a manifest.json.
 */

import { MinioService } from "@proto/utils/storage";

import {
  computeContentHash,
  generateCanonicalPath,
} from "./canonical-paths.js";
import { writeManifest, toObjectKey } from "./manifest.js";
import type { ManifestData } from "./manifest.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractionInput {
  /** Raw content buffer of the original file – used to compute contentHash */
  fileBuffer: Buffer;
  /** Pre-computed SHA-256 hex digest (if already available, avoids re-hashing) */
  contentHash?: string;
  /** Original file name as supplied by the uploader */
  originalFileName: string;
  /** MIME type of the source file */
  mediaType: string;
  /** Media category used to organise storage (e.g. "video", "audio", "document") */
  mediaCategory: string;
  /** Organisation identifier */
  orgId: string;
  /** Name of the adapter / extractor that produced the results */
  adapterUsed: string;
  /** Extracted plain text content */
  extractedText: string;
  /** Arbitrary metadata produced by the extractor */
  metadata: Record<string, unknown>;
  /** Optional binary artifacts keyed by file name (e.g. "thumbnail.png") */
  artifacts?: Map<string, Buffer>;
}

export interface StoreExtractionResultOutput {
  /** Canonical path where all artifacts are stored */
  canonicalPath: string;
  /** SHA-256 hex digest used as the content-addressed key */
  contentHash: string;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Persist all extraction outputs to MinIO under a content-addressed path.
 *
 * Writes:
 *   - text.txt        – extracted plain text
 *   - metadata.json   – extractor metadata
 *   - artifacts/…     – any binary artifacts
 *   - manifest.json   – source info, adapter, summary, timestamps
 *
 * @param input        - Extraction results and context
 * @param minioService - Configured MinioService instance (defaults to new instance)
 * @returns The canonical path and content hash
 */
export async function storeExtractionResult(
  input: ExtractionInput,
  minioService: MinioService = new MinioService()
): Promise<StoreExtractionResultOutput> {
  const now = new Date().toISOString();

  // 1. Compute (or reuse) content hash for deduplication
  const contentHash = input.contentHash ?? computeContentHash(input.fileBuffer);

  // 2. Generate canonical path
  const canonicalPath = generateCanonicalPath(
    input.mediaCategory,
    input.orgId,
    contentHash
  );

  // 3. Write extracted text
  const textKey = toObjectKey(canonicalPath, "text.txt");
  await minioService.uploadBuffer(
    textKey,
    Buffer.from(input.extractedText, "utf-8"),
    "text/plain"
  );

  // 4. Write metadata JSON
  const metadataKey = toObjectKey(canonicalPath, "metadata.json");
  await minioService.uploadBuffer(
    metadataKey,
    Buffer.from(JSON.stringify(input.metadata, null, 2), "utf-8"),
    "application/json"
  );

  // 5. Write binary artifacts (if any)
  const artifactCount = input.artifacts?.size ?? 0;
  if (input.artifacts) {
    for (const [artifactName, artifactBuffer] of input.artifacts) {
      const artifactKey = toObjectKey(
        canonicalPath,
        `artifacts/${artifactName}`
      );
      await minioService.uploadBuffer(
        artifactKey,
        artifactBuffer,
        "application/octet-stream"
      );
    }
  }

  // 6. Write manifest.json
  const manifest: ManifestData = {
    source: {
      originalFileName: input.originalFileName,
      mediaType: input.mediaType,
      contentHash,
      sizeBytes: input.fileBuffer.length,
    },
    extraction: {
      adapterUsed: input.adapterUsed,
      resultRef: canonicalPath,
      summary: {
        textLengthChars: input.extractedText.length,
        artifactCount,
      },
    },
    timestamps: {
      createdAt: now,
      extractedAt: now,
    },
  };

  await writeManifest(canonicalPath, manifest, minioService);

  return { canonicalPath, contentHash };
}
