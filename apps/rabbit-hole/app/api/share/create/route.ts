/**
 * Share Token Creation API
 *
 * POST /api/share/create
 * Creates new shareable tokens for timeline visualizations
 * Requires authentication
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuthAndLogging, type AuthenticatedUser } from "@proto/auth";
import { CreateShareRequest } from "@proto/types";
import { generateShareUrl, generatePreviewUrl } from "@proto/utils";

import { ShareTokenService } from "@/lib/share-token-service";

export const POST = withAuthAndLogging("create share token")(async (
  request: NextRequest,
  user: AuthenticatedUser
): Promise<NextResponse> => {
  try {
    const body: CreateShareRequest = await request.json();

    // Validate required fields
    if (!body.entityUid || !body.shareType || !body.parameters) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: entityUid, shareType, parameters",
        },
        { status: 400 }
      );
    }

    // Additional validation for analytics shares
    if (body.shareType === "analytics") {
      if (!body.entities || body.entities.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Analytics shares require at least one entity in entities array",
          },
          { status: 400 }
        );
      }

      if (body.entities.length > 5) {
        return NextResponse.json(
          {
            success: false,
            error: "Analytics shares support maximum 5 entities",
          },
          { status: 400 }
        );
      }

      if (!body.parameters.chartConfig) {
        return NextResponse.json(
          {
            success: false,
            error: "Analytics shares require chartConfig in parameters",
          },
          { status: 400 }
        );
      }

      // Validate chart configuration
      const { chartConfig } = body.parameters;
      const validTypes = [
        "timeline",
        "bar",
        "line",
        "pie",
        "scatter",
        "network",
        "heatmap",
      ];
      const validDataSources = [
        "timeline",
        "speechActs",
        "relationships",
        "biographical",
        "activity",
        "metrics",
      ];

      if (!validTypes.includes(chartConfig.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid chart type: ${chartConfig.type}. Must be one of: ${validTypes.join(", ")}`,
          },
          { status: 400 }
        );
      }

      if (!validDataSources.includes(chartConfig.dataSource)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid data source: ${chartConfig.dataSource}. Must be one of: ${validDataSources.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    // Create share token using service
    const shareTokenService = new ShareTokenService();
    const shareToken = await shareTokenService.createShareToken(
      body,
      user.userId
    );

    // Generate URLs
    const shareUrl = generateShareUrl(shareToken.token);
    const previewUrl = generatePreviewUrl(shareToken.token);

    console.log(
      `✅ Share token created: ${shareToken.token} (${shareToken.shareType})`
    );

    return NextResponse.json({
      success: true,
      data: {
        token: shareToken.token,
        shareUrl,
        expiresAt: shareToken.expiresAt,
        previewUrl,
        shareType: shareToken.shareType,
        ...(body.shareType === "analytics" && {
          entityCount: body.entities?.length || 1,
          chartType: body.parameters.chartConfig?.type,
          dataSource: body.parameters.chartConfig?.dataSource,
        }),
      },
    });
  } catch (error) {
    console.error("❌ Share token creation failed:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to create share token";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
});

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed. Use POST to create share tokens.",
    },
    { status: 405 }
  );
}
