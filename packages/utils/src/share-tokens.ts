/**
 * Share Token Utilities
 *
 * Client and server-side utilities for share token management
 * Can be called from API routes or client components
 */

import {
  ShareToken,
  ShareTokenRow,
  CreateShareRequest,
  ShareType,
  ShareTokenParameters,
} from "@proto/types";

import { generateShareToken } from "./uuid";

/**
 * Generate a new share token with secure UUID
 */
export function createSecureShareToken(): string {
  return generateShareToken();
}

/**
 * Calculate expiration date from days
 */
export function calculateExpirationDate(daysFromNow: number): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + daysFromNow);
  return expiresAt;
}

/**
 * Check if a share token is expired
 */
export function isShareTokenExpired(expiresAt: string | Date): boolean {
  const expiration =
    typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return new Date() > expiration;
}

/**
 * Check if a share token is revoked
 */
export function isShareTokenRevoked(revokedAt: string | Date | null): boolean {
  return revokedAt !== null;
}

/**
 * Validate share token state (not expired, not revoked)
 */
export function validateShareTokenState(shareToken: ShareToken): {
  isValid: boolean;
  reason?: string;
} {
  if (isShareTokenRevoked(shareToken.revokedAt)) {
    return { isValid: false, reason: "Token has been revoked" };
  }

  if (isShareTokenExpired(shareToken.expiresAt)) {
    return { isValid: false, reason: "Token has expired" };
  }

  return { isValid: true };
}

/**
 * Convert database row to ShareToken interface
 */
export function dbRowToShareToken(row: ShareTokenRow): ShareToken {
  return {
    token: row.token,
    createdBy: row.created_by,
    entityUid: row.entity_uid,
    shareType: row.share_type as ShareType,
    parameters: row.parameters,
    expiresAt: row.expires_at.toISOString(),
    revokedAt: row.revoked_at ? row.revoked_at.toISOString() : null,
    viewCount: row.view_count,
    createdAt: row.created_at.toISOString(),
    cacheDuration: row.cache_duration,
    title: row.title,
    description: row.description,
  };
}

/**
 * Generate share URL for a token
 */
export function generateShareUrl(token: string, baseUrl?: string): string {
  const base =
    baseUrl || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${base}/share/${token}`;
}

/**
 * Generate preview image URL for a token
 */
export function generatePreviewUrl(token: string, baseUrl?: string): string {
  const base =
    baseUrl || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${base}/api/share/${token}/preview.png`;
}

/**
 * Validate share request parameters
 */
export function validateCreateShareRequest(request: CreateShareRequest): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!request.entityUid || !request.entityUid.includes(":")) {
    errors.push('entityUid must be in format "namespace:identifier"');
  }

  if (
    !request.shareType ||
    !["timeline", "graph", "entity"].includes(request.shareType)
  ) {
    errors.push("shareType must be one of: timeline, graph, entity");
  }

  if (!request.parameters || typeof request.parameters !== "object") {
    errors.push("parameters must be an object");
  }

  if (request.expiresInDays !== undefined) {
    if (
      typeof request.expiresInDays !== "number" ||
      request.expiresInDays <= 0 ||
      request.expiresInDays > 365
    ) {
      errors.push("expiresInDays must be a number between 1 and 365");
    }
  }

  if (request.cacheDurationSeconds !== undefined) {
    if (
      typeof request.cacheDurationSeconds !== "number" ||
      request.cacheDurationSeconds <= 0
    ) {
      errors.push("cacheDurationSeconds must be a positive number");
    }
  }

  if (request.customTitle && request.customTitle.length > 255) {
    errors.push("customTitle must be 255 characters or less");
  }

  if (request.customDescription && request.customDescription.length > 1000) {
    errors.push("customDescription must be 1000 characters or less");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate default share title based on entity and parameters
 */
export function generateDefaultShareTitle(
  entityUid: string,
  shareType: ShareType,
  parameters: ShareTokenParameters
): string {
  const entityName =
    entityUid.split(":")[1]?.replace(/_/g, " ") || "Unknown Entity";

  switch (shareType) {
    case "timeline":
      if (parameters.timeWindow) {
        return `Timeline Activity: ${entityName} (${parameters.timeWindow.from} to ${parameters.timeWindow.to})`;
      }
      return `Timeline Activity: ${entityName}`;

    case "graph":
      return `Network Graph: ${entityName}`;

    case "entity":
      return `Entity Profile: ${entityName}`;

    default:
      return `${entityName} - Shared Data`;
  }
}

/**
 * Generate default share description with activity stats
 */
export function generateDefaultShareDescription(
  shareType: ShareType,
  parameters: ShareTokenParameters,
  stats?: { totalEvents?: number; peakDate?: string }
): string {
  switch (shareType) {
    case "timeline":
      if (stats?.totalEvents && stats?.peakDate) {
        return `${stats.totalEvents} events tracked. Peak activity on ${stats.peakDate}.`;
      }
      if (parameters.timeWindow) {
        return `Timeline analysis from ${parameters.timeWindow.from} to ${parameters.timeWindow.to}.`;
      }
      return "Interactive timeline visualization with detailed activity analysis.";

    case "graph":
      return "Interactive network visualization showing entity connections and relationships.";

    case "entity":
      return "Comprehensive entity profile with relationships and timeline data.";

    default:
      return "Shared data visualization from Rabbit Hole Research.";
  }
}

/**
 * Create social media optimized share metadata
 */
export function createShareMetadata(
  shareToken: ShareToken,
  baseUrl?: string
): {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  siteName: string;
  type: string;
} {
  const url = generateShareUrl(shareToken.token, baseUrl);
  const imageUrl = generatePreviewUrl(shareToken.token, baseUrl);

  const title =
    shareToken.title ||
    generateDefaultShareTitle(
      shareToken.entityUid,
      shareToken.shareType,
      shareToken.parameters
    );

  const description =
    shareToken.description ||
    generateDefaultShareDescription(
      shareToken.shareType,
      shareToken.parameters
    );

  return {
    title,
    description,
    imageUrl,
    url,
    siteName: "Rabbit Hole Research",
    type: "article",
  };
}
