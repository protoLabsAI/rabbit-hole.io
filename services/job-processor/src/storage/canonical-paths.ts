/**
 * Canonical Path Utilities
 *
 * Generates standardised storage paths for evidence artifacts in MinIO.
 * Format: evidence-raw/{mediaCategory}/{orgId}/{contentHash}/
 */

import { createHash } from "node:crypto";

/**
 * Generate a canonical storage path for a piece of evidence.
 *
 * @param mediaCategory - The media category (e.g. "video", "audio", "document")
 * @param orgId         - The organisation identifier
 * @param contentHash   - SHA-256 hex digest of the original file content
 * @returns A trailing-slash path prefix: evidence-raw/{mediaCategory}/{orgId}/{contentHash}/
 */
export function generateCanonicalPath(
  mediaCategory: string,
  orgId: string,
  contentHash: string
): string {
  return `evidence-raw/${mediaCategory}/${orgId}/${contentHash}/`;
}

/**
 * Compute a SHA-256 hex digest for the given Buffer.
 *
 * Used to derive a stable content-addressed key for deduplication.
 */
export function computeContentHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
