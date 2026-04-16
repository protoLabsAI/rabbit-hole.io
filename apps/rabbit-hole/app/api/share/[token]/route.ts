/**
 * Share Token API
 *
 * GET /api/share/[token] - Validate and retrieve share token data
 * Used for accessing shared timeline visualizations
 */

import { NextRequest, NextResponse } from "next/server";

import {
  ShareTokenNotFoundError,
  ShareTokenExpiredError,
  ShareTokenRevokedError,
  type ShareToken,
} from "@protolabsai/types";

import { ShareTokenService } from "@/lib/share-token-service";

interface ShareTokenAPIResponse {
  success: boolean;
  data?: ShareToken;
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse<ShareTokenAPIResponse>> {
  try {
    const { token } = await params;
    const shareTokenService = new ShareTokenService();

    // Validate token and get data
    const shareToken = await shareTokenService.validateShareToken(token);

    // Increment view count (async, don't wait)
    shareTokenService.incrementViewCount(token).catch(console.error);

    return NextResponse.json({
      success: true,
      data: shareToken,
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

    if (error instanceof ShareTokenExpiredError) {
      return NextResponse.json(
        {
          success: false,
          error: "Share token has expired",
        },
        { status: 410 } // Gone
      );
    }

    if (error instanceof ShareTokenRevokedError) {
      return NextResponse.json(
        {
          success: false,
          error: "Share token has been revoked",
        },
        { status: 403 } // Forbidden
      );
    }

    console.error("Share token API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve share token",
      },
      { status: 500 }
    );
  }
}
