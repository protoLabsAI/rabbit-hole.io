/**
 * Manifest Writer
 *
 * Writes a manifest.json file alongside extracted artifacts.
 * The manifest records source file information, adapter details,
 * extraction results reference, and timestamps.
 */

import { MinioService } from "@protolabsai/utils/storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ManifestSourceInfo {
  /** Original file name as uploaded by the user */
  originalFileName: string;
  /** MIME / media type of the source file */
  mediaType: string;
  /** SHA-256 hex digest of the source file content */
  contentHash: string;
  /** File size in bytes (optional – may not be known at write time) */
  sizeBytes?: number;
}

export interface ManifestExtractionInfo {
  /** Name of the adapter that performed the extraction */
  adapterUsed: string;
  /** Canonical path to the extraction result artifacts */
  resultRef: string;
  /** High-level summary of what was extracted */
  summary?: {
    textLengthChars?: number;
    pageCount?: number;
    artifactCount?: number;
    [key: string]: unknown;
  };
}

export interface ManifestTimestamps {
  /** ISO-8601 timestamp when this manifest was first created */
  createdAt: string;
  /** ISO-8601 timestamp when extraction completed (if known) */
  extractedAt?: string;
}

export interface ManifestData {
  source: ManifestSourceInfo;
  extraction: ManifestExtractionInfo;
  timestamps: ManifestTimestamps;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Write a manifest.json to the given canonical path in MinIO.
 *
 * @param canonicalPath - Trailing-slash prefix returned by generateCanonicalPath,
 *                        e.g. "evidence-raw/video/org123/abc.../".
 *                        The bucket name prefix is stripped before the write.
 * @param data          - Manifest payload
 * @param minioService  - Configured MinioService instance
 */
export async function writeManifest(
  canonicalPath: string,
  data: ManifestData,
  minioService: MinioService
): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const buffer = Buffer.from(json, "utf-8");

  // Strip the leading "evidence-raw/" bucket prefix to get the object key.
  const key = toObjectKey(canonicalPath, "manifest.json");

  await minioService.uploadBuffer(key, buffer, "application/json");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a canonical path + file name to a MinIO object key.
 *
 * The canonical path includes the bucket name as its first segment
 * (e.g. "evidence-raw/…/"). We drop that segment because the MinioService
 * already targets the "evidence-raw" bucket.
 */
export function toObjectKey(canonicalPath: string, fileName: string): string {
  // Remove leading "evidence-raw/" if present
  const withoutBucket = canonicalPath.replace(/^evidence-raw\//, "");
  // Ensure trailing slash then append file name
  const prefix = withoutBucket.endsWith("/")
    ? withoutBucket
    : `${withoutBucket}/`;
  return `${prefix}${fileName}`;
}
