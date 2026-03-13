/**
 * Share Token Revocation API
 *
 * DELETE /api/share/[token]/revoke - Revoke a share token
 * Requires authentication - only token creator can revoke
 */

import { NextRequest, NextResponse } from "next/server";

import {
  withAuthAndLogging,
  checkAdminRole,
  type AuthenticatedUser,
} from "@proto/auth";
import { ShareTokenNotFoundError, ShareTokenRevokedError } from "@proto/types";

import { ShareTokenService } from "@/lib/share-token-service";

interface RevokeResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export const DELETE = withAuthAndLogging("revoke share token")(async (
  request: NextRequest,
  user: AuthenticatedUser
): Promise<NextResponse<RevokeResponse>> => {
  try {
    // Extract token from URL
    const urlParts = request.url.split("/");
    const token = urlParts[urlParts.indexOf("share") + 1];
    const shareTokenService = new ShareTokenService();

    // Check if user is admin
    const isAdmin = checkAdminRole(user);

    // Revoke the token - admins can revoke any token, users only their own
    if (isAdmin) {
      await shareTokenService.adminRevokeShareToken(token, user.userId);
    } else {
      await shareTokenService.revokeShareToken(token, user.userId);
    }

    console.log(
      `✅ Share token revoked: ${token} by ${isAdmin ? "admin" : "user"} ${user.userId}`
    );

    return NextResponse.json({
      success: true,
      message: "Share token has been revoked successfully",
    });
  } catch (error) {
    if (error instanceof ShareTokenNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: "Share token not found",
        },
        { status: 404 }
      );
    }

    if (error instanceof ShareTokenRevokedError) {
      return NextResponse.json(
        {
          success: false,
          error: "Share token is already revoked",
        },
        { status: 409 } // Conflict
      );
    }

    // Check for ownership error
    if (error instanceof Error && error.message.includes("not authorized")) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authorized to revoke this share token",
        },
        { status: 403 } // Forbidden
      );
    }

    console.error("❌ Share token revocation failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to revoke share token",
      },
      { status: 500 }
    );
  }
});

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed. Use DELETE to revoke share tokens.",
    },
    { status: 405 }
  );
}
