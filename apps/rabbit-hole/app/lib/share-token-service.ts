/**
 * Share Token Service
 *
 * Handles creation, validation, and management of share tokens
 * Uses separate application database (rabbit_hole_app)
 */

import { getGlobalPostgresPool } from "@protolabsai/database";
import {
  ShareToken,
  ShareTokenRow,
  CreateShareRequest,
  ShareTokenNotFoundError,
  ShareTokenExpiredError,
  ShareTokenRevokedError,
} from "@protolabsai/types";
import {
  calculateExpirationDate,
  validateShareTokenState,
  dbRowToShareToken,
  generateShareUrl,
  generatePreviewUrl,
  validateCreateShareRequest,
  isShareTokenExpired,
} from "@protolabsai/utils";

export class ShareTokenService {
  /**
   * Create a new share token
   */
  async createShareToken(
    request: CreateShareRequest,
    userId: string
  ): Promise<ShareToken> {
    // Validate request first
    const validation = validateCreateShareRequest(request);
    if (!validation.isValid) {
      throw new Error(`Invalid share request: ${validation.errors.join(", ")}`);
    }

    const expiresInDays = request.expiresInDays || 7;
    const cacheDurationSeconds = request.cacheDurationSeconds || 604800; // 1 week default

    const expiresAt = calculateExpirationDate(expiresInDays);

    const query = `
      INSERT INTO share_tokens (
        created_by, entity_uid, share_type, parameters, 
        expires_at, cache_duration, title, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const values = [
      userId,
      request.entityUid,
      request.shareType,
      JSON.stringify(request.parameters),
      expiresAt,
      cacheDurationSeconds,
      request.customTitle || null,
      request.customDescription || null,
    ];

    const pool = getGlobalPostgresPool();
    try {
      const result = await pool.query(query, values);
      const row = result.rows[0] as ShareTokenRow;
      return dbRowToShareToken(row);
    } catch (error) {
      console.error("Failed to create share token:", error);
      throw new Error("Failed to create share token");
    }
  }

  /**
   * Get share token by token UUID
   */
  async getShareToken(token: string): Promise<ShareToken> {
    // Validate UUID format before querying database
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      throw new ShareTokenNotFoundError(token);
    }

    const query = `
      SELECT * FROM share_tokens 
      WHERE token = $1;
    `;

    const pool = getGlobalPostgresPool();
    const result = await pool.query(query, [token]);

    if (result.rows.length === 0) {
      throw new ShareTokenNotFoundError(token);
    }

    const row = result.rows[0] as ShareTokenRow;
    return dbRowToShareToken(row);
  }

  /**
   * Validate and get share token (checks expiration and revocation)
   */
  async validateShareToken(token: string): Promise<ShareToken> {
    const shareToken = await this.getShareToken(token);

    const validation = validateShareTokenState(shareToken);
    if (!validation.isValid) {
      if (shareToken.revokedAt) {
        throw new ShareTokenRevokedError(token);
      }
      if (validation.reason?.includes("expired")) {
        throw new ShareTokenExpiredError(token);
      }
      throw new Error(validation.reason || "Token validation failed");
    }

    return shareToken;
  }

  /**
   * Validate user has access to share token based on privacy level and entity scope
   * Public entities are always accessible, tenant entities respect privacy levels
   */
  async validateShareTokenAccess(
    token: string,
    userId: string | null,
    userOrgId: string | null
  ): Promise<{ hasAccess: boolean; error?: string; shareToken?: ShareToken }> {
    try {
      const shareToken = await this.getShareToken(token);

      if (shareToken.revokedAt) {
        return {
          hasAccess: false,
          error: "Share link has been revoked",
        };
      }

      if (isShareTokenExpired(shareToken.expiresAt)) {
        return {
          hasAccess: false,
          error: "Share link has expired",
        };
      }

      // Check if the shared entity is public data
      const { getGlobalNeo4jClient } = await import("@protolabsai/database");
      const neo4jClient = getGlobalNeo4jClient();

      const entityQuery = `
        MATCH (n:Entity {uid: $entityUid})
        RETURN n.clerk_org_id as orgId
      `;

      const result = await neo4jClient.executeRead(entityQuery, {
        entityUid: shareToken.entityUid,
      });

      const entityOrgId = result.records[0]?.get("orgId");

      // If sharing public data, always accessible
      if (entityOrgId === "public") {
        return { hasAccess: true, shareToken };
      }

      // Tenant entity - enforce privacy level
      // Note: share_tokens table doesn't have privacy_level column yet
      // For now, treat all tenant entity shares as public-accessible
      // TODO: Add privacy_level column to share_tokens table and update logic
      return { hasAccess: true, shareToken };
    } catch (error) {
      console.error("Share token access validation error:", error);
      return {
        hasAccess: false,
        error: "Failed to validate share access",
      };
    }
  }

  /**
   * Increment view count for a share token
   */
  async incrementViewCount(token: string): Promise<void> {
    const query = `
      UPDATE share_tokens 
      SET view_count = view_count + 1 
      WHERE token = $1;
    `;

    const pool = getGlobalPostgresPool();
    await pool.query(query, [token]);
  }

  /**
   * Revoke a share token
   */
  async revokeShareToken(token: string, userId: string): Promise<void> {
    const query = `
      UPDATE share_tokens 
      SET revoked_at = NOW() 
      WHERE token = $1 AND created_by = $2;
    `;

    const pool = getGlobalPostgresPool();
    const result = await pool.query(query, [token, userId]);

    if (result.rowCount === 0) {
      throw new ShareTokenNotFoundError(token);
    }
  }

  /**
   * Admin revoke a share token (admins can revoke any token)
   */
  async adminRevokeShareToken(
    token: string,
    adminUserId: string
  ): Promise<void> {
    const query = `
      UPDATE share_tokens 
      SET revoked_at = NOW() 
      WHERE token = $1;
    `;

    const pool = getGlobalPostgresPool();
    const result = await pool.query(query, [token]);

    if (result.rowCount === 0) {
      throw new ShareTokenNotFoundError(token);
    }

    console.log(`🔧 Admin revocation: ${token} by admin ${adminUserId}`);
  }

  /**
   * Extend expiration date of a share token
   */
  async extendShareToken(
    token: string,
    userId: string,
    additionalDays: number
  ): Promise<ShareToken> {
    const query = `
      UPDATE share_tokens 
      SET expires_at = expires_at + INTERVAL '${additionalDays} days'
      WHERE token = $1 AND created_by = $2
      RETURNING *;
    `;

    const pool = getGlobalPostgresPool();
    const result = await pool.query(query, [token, userId]);

    if (result.rows.length === 0) {
      throw new ShareTokenNotFoundError(token);
    }

    const row = result.rows[0] as ShareTokenRow;
    return dbRowToShareToken(row);
  }

  /**
   * Get all share tokens for a user
   */
  async getUserShareTokens(userId: string): Promise<ShareToken[]> {
    const query = `
      SELECT * FROM share_tokens 
      WHERE created_by = $1 
      ORDER BY created_at DESC;
    `;

    const pool = getGlobalPostgresPool();
    const result = await pool.query(query, [userId]);
    return result.rows.map((row: ShareTokenRow) => dbRowToShareToken(row));
  }

  /**
   * Get all share tokens (admin only)
   */
  async getAllShareTokens(): Promise<ShareToken[]> {
    const query = `
      SELECT * FROM share_tokens 
      ORDER BY created_at DESC;
    `;

    const pool = getGlobalPostgresPool();
    const result = await pool.query(query);
    return result.rows.map((row: ShareTokenRow) => dbRowToShareToken(row));
  }

  /**
   * Cleanup expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const query = `SELECT cleanup_expired_share_tokens() as deleted_count;`;
    const pool = getGlobalPostgresPool();
    const result = await pool.query(query);
    return result.rows[0].deleted_count;
  }

  /**
   * Generate share URL for a token (delegated to utils)
   */
  generateShareUrl(token: string): string {
    return generateShareUrl(token);
  }

  /**
   * Generate preview image URL for a token (delegated to utils)
   */
  generatePreviewUrl(token: string): string {
    return generatePreviewUrl(token);
  }
}
