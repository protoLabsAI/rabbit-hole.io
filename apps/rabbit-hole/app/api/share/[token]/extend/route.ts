/**
 * Share Token Extension API
 *
 * PUT /api/share/[token]/extend - Extend share token expiration
 * Requires authentication - only token creator can extend
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuthAndLogging, type AuthenticatedUser } from "@proto/auth";
import { ShareTokenNotFoundError } from "@proto/types";

import { ShareTokenService } from "@/lib/share-token-service";

interface ExtendRequest {
  additionalDays?: number;
}

interface ExtendResponse {
  success: boolean;
  data?: {
    token: string;
    expiresAt: string;
    message: string;
  };
  error?: string;
}

export const PUT = withAuthAndLogging("extend share token")(async (
  request: NextRequest,
  user: AuthenticatedUser
): Promise<NextResponse<ExtendResponse>> => {
  try {
    // Extract token from URL
    const urlParts = request.url.split("/");
    const token = urlParts[urlParts.indexOf("share") + 1];
    const body: ExtendRequest = await request.json().catch(() => ({}));

    // Default to 7 additional days if not specified
    const additionalDays = Math.min(Math.max(body.additionalDays || 7, 1), 365); // 1 day to 1 year max

    const shareTokenService = new ShareTokenService();

    // Extend the token - service will verify ownership
    const updatedToken = await shareTokenService.extendShareToken(
      token,
      user.userId,
      additionalDays
    );

    console.log(
      `✅ Share token extended: ${token} by ${additionalDays} days for user ${user.userId}`
    );

    return NextResponse.json({
      success: true,
      data: {
        token: updatedToken.token,
        expiresAt: updatedToken.expiresAt,
        message: `Share token extended by ${additionalDays} days`,
      },
    });
  } catch (error) {
    if (error instanceof ShareTokenNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Share token not found or you don't have permission to extend it",
        },
        { status: 404 }
      );
    }

    // Check for ownership error
    if (error instanceof Error && error.message.includes("not authorized")) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authorized to extend this share token",
        },
        { status: 403 } // Forbidden
      );
    }

    console.error("❌ Share token extension failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to extend share token",
      },
      { status: 500 }
    );
  }
});

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error:
        "Method not allowed. Use PUT with JSON body { additionalDays: number } to extend share tokens.",
    },
    { status: 405 }
  );
}
