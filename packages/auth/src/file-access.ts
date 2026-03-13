/**
 * File Access Control
 *
 * Utilities for verifying user access to files
 */

import {
  fetchFileByCanonicalKey,
  type FileEntityWithOwnership,
} from "@proto/database";

export interface FileAccessResult {
  allowed: boolean;
  reason?: string;
  file?: FileEntityWithOwnership;
}

/**
 * Verify user has access to file
 */
export async function verifyFileAccess(
  userId: string,
  orgId: string | null,
  canonicalKey: string
): Promise<FileAccessResult> {
  const file = await fetchFileByCanonicalKey(canonicalKey);

  if (!file) {
    return {
      allowed: false,
      reason: "File not found",
    };
  }

  // Owner always has access
  if (file.uploadedBy === userId) {
    return {
      allowed: true,
      file,
    };
  }

  // Check access level
  switch (file.accessLevel) {
    case "public":
      return { allowed: true, file };

    case "org":
      if (orgId && file.orgId === orgId) {
        return { allowed: true, file };
      }
      break;

    case "workspace":
      // For workspace-level access, user must be org member
      if (orgId && file.orgId === orgId) {
        return { allowed: true, file };
      }
      break;

    case "private":
    default:
      // Private files only accessible by owner
      break;
  }

  return {
    allowed: false,
    reason: "Access denied",
    file,
  };
}
