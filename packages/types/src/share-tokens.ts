/**
 * Share Token Types
 *
 * TypeScript interfaces for the revokable share links system
 */

export type ShareType = "timeline" | "graph" | "entity" | "analytics";

export interface ShareTokenParameters {
  // Timeline/Graph parameters (legacy)
  timeWindow?: {
    from: string;
    to: string;
  };
  granularity?: "hour" | "day" | "week" | "month";
  sentiments?: string[];
  entityTypes?: string[];

  // Analytics parameters (new)
  entities?: string[]; // Multiple entities for analytics shares
  chartConfig?: {
    type:
      | "timeline"
      | "bar"
      | "line"
      | "pie"
      | "scatter"
      | "network"
      | "heatmap";
    dataSource:
      | "timeline"
      | "speechActs"
      | "relationships"
      | "biographical"
      | "activity"
      | "metrics";
    aggregation: "none" | "daily" | "weekly" | "monthly" | "yearly";
    viewMode: "comparison" | "merged" | "side-by-side" | "overlay";
  };
  filters?: {
    categories?: string[];
    importance?: string[];
    eventTypes?: string[];
    tags?: string[];
    sentiments?: string[];
    metrics?: string[];
  };

  [key: string]: any; // Allow additional parameters
}

export interface CreateShareRequest {
  entityUid: string; // Primary entity (required for backward compatibility)
  shareType: ShareType;
  parameters: ShareTokenParameters;

  // Analytics-specific fields (new)
  entities?: string[]; // For multi-entity analytics shares
  chartTitle?: string; // Custom title for analytics view

  // Standard fields
  expiresInDays?: number; // default: 7
  cacheDurationSeconds?: number; // default: 604800 (1 week)
  customTitle?: string;
  customDescription?: string;
}

export interface ShareToken {
  token: string;
  createdBy: string;
  entityUid: string;
  shareType: ShareType;
  parameters: ShareTokenParameters;
  expiresAt: string; // ISO 8601 datetime
  revokedAt: string | null;
  viewCount: number;
  createdAt: string; // ISO 8601 datetime
  cacheDuration: number; // seconds
  title: string | null;
  description: string | null;
}

export interface CreateShareResponse {
  success: boolean;
  data: {
    token: string;
    shareUrl: string;
    expiresAt: string;
    previewUrl: string; // for social media preview
  };
  error?: string;
}

export interface SharePageData {
  token: string;
  entityUid: string;
  shareType: ShareType;
  parameters: ShareTokenParameters;
  title: string | null;
  description: string | null;
  isExpired: boolean;
  isRevoked: boolean;
  viewCount: number;
}

export interface ShareLinkMetadata {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  siteName: string;
  type: string;
}

// Database row interface (matches PostgreSQL table structure)
export interface ShareTokenRow {
  token: string;
  created_by: string;
  entity_uid: string;
  share_type: string;
  parameters: any; // JSONB
  expires_at: Date;
  revoked_at: Date | null;
  view_count: number;
  created_at: Date;
  cache_duration: number;
  title: string | null;
  description: string | null;
}

// Error types
export class ShareTokenError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "ShareTokenError";
  }
}

export class ShareTokenNotFoundError extends ShareTokenError {
  constructor(token: string) {
    super(`Share token not found: ${token}`, "TOKEN_NOT_FOUND");
  }
}

export class ShareTokenExpiredError extends ShareTokenError {
  constructor(token: string) {
    super(`Share token has expired: ${token}`, "TOKEN_EXPIRED");
  }
}

export class ShareTokenRevokedError extends ShareTokenError {
  constructor(token: string) {
    super(`Share token has been revoked: ${token}`, "TOKEN_REVOKED");
  }
}
