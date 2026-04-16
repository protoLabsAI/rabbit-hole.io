/**
 * User Share Tokens API
 *
 * GET /api/share/user/[userId]/tokens - Get all share tokens for a user
 * Requires authentication and ownership verification
 */

import { NextRequest, NextResponse } from "next/server";

import {
  withAuthAndLogging,
  checkAdminRole,
  type AuthenticatedUser,
} from "@protolabsai/auth";
import { generateShareUrl, generatePreviewUrl } from "@protolabsai/utils";

import { ShareTokenService } from "@/lib/share-token-service";

interface UserShareToken {
  token: string;
  entityUid: string;
  shareType: string;
  title?: string;
  description?: string;
  viewCount: number;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
  isRevoked: boolean;
  shareUrl: string;
  previewUrl: string;
  createdBy?: string; // For admin view
}

interface UserTokensResponse {
  success: boolean;
  tokens?: UserShareToken[];
  error?: string;
  count?: number;
}

export const GET = withAuthAndLogging("get user share tokens")(async (
  request: NextRequest,
  user: AuthenticatedUser
): Promise<NextResponse<UserTokensResponse>> => {
  try {
    // Extract userId from URL
    const urlParts = request.url.split("/");
    const userId = urlParts[urlParts.indexOf("user") + 1];

    // Check if user is admin
    const isAdmin = checkAdminRole(user);

    // Verify access - users can only view their own tokens, admins can view any
    if (!isAdmin && user.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Access denied - can only view your own share tokens",
        },
        { status: 403 }
      );
    }

    const shareTokenService = new ShareTokenService();

    // Admin users can view all tokens by passing 'all' as userId
    const rawTokens =
      isAdmin && userId === "all"
        ? await shareTokenService.getAllShareTokens()
        : await shareTokenService.getUserShareTokens(userId);

    // Transform tokens for frontend consumption
    const tokens: UserShareToken[] = rawTokens.map((token) => {
      const now = new Date();
      const expiresAt = new Date(token.expiresAt);
      const isExpired = expiresAt < now;
      const isRevoked = token.revokedAt !== null;

      return {
        token: token.token,
        entityUid: token.entityUid,
        shareType: token.shareType,
        title: token.title || undefined,
        description: token.description || undefined,
        viewCount: token.viewCount,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        isExpired,
        isRevoked,
        shareUrl: generateShareUrl(token.token),
        previewUrl: generatePreviewUrl(token.token),
        ...(isAdmin && userId === "all" && { createdBy: token.createdBy }),
      };
    });

    console.log(
      `📋 Retrieved ${tokens.length} share tokens for user: ${userId}`
    );

    return NextResponse.json({
      success: true,
      tokens,
      count: tokens.length,
    });
  } catch (error) {
    console.error("Failed to get user share tokens:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve share tokens",
      },
      { status: 500 }
    );
  }
});
