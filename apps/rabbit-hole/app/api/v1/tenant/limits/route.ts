/**
 * Tenant Limits API
 *
 * GET /api/v1/tenant/limits - Get current usage and tier limits
 *
 * Used by frontend components to:
 * - Display current usage vs. limits
 * - Validate operations before execution
 * - Show upgrade prompts when approaching limits
 */

import { NextRequest, NextResponse } from "next/server";

import { getUserTier, getTierLimits } from "@proto/auth";
import {
  getEntityCount,
  getRelationshipCount,
  getStorageUsed,
} from "@proto/database";

interface LimitsResponse {
  success: boolean;
  tier?: string;
  usage?: {
    entities: {
      current: number;
      max: number;
      available: number;
      percentUsed: number;
    };
    relationships: {
      current: number;
      max: number;
      available: number;
      percentUsed: number;
    };
    storage: {
      current: number;
      max: number;
      available: number;
      percentUsed: number;
    };
  };
  upgradeUrl?: string;
  error?: string;
}

/**
 * GET - Get current usage and tier limits
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<LimitsResponse>> {
  try {
    const userId = "local-user";
    const orgId = "local-org";

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    // Get organization ID from header or auth
    const clerkOrgId =
      orgId || request.headers.get("x-clerk-org-id") || "public";

    // Get user and tier info
    // clerkClient removed - using local user
    // getUser removed - using local user
    const tier = getUserTier(user);
    const limits = getTierLimits(tier);

    // Get current usage (storage currently stubbed, will return 0)
    const [currentEntities, currentRelationships, currentStorage] =
      await Promise.all([
        getEntityCount(clerkOrgId),
        getRelationshipCount(clerkOrgId),
        getStorageUsed(clerkOrgId),
      ]).catch((error) => {
        console.error("Error fetching usage:", error);
        return [0, 0, 0]; // Fallback to zeros if any query fails
      });

    // Calculate availability and usage percentage
    const calculateUsage = (current: number, max: number) => {
      if (max === -1) {
        return {
          current,
          max,
          available: -1,
          percentUsed: 0,
        };
      }
      return {
        current,
        max,
        available: Math.max(0, max - current),
        percentUsed: max > 0 ? (current / max) * 100 : 0,
      };
    };

    return NextResponse.json({
      success: true,
      tier,
      usage: {
        entities: calculateUsage(currentEntities, limits.maxEntities),
        relationships: calculateUsage(
          currentRelationships,
          limits.maxRelationships
        ),
        storage: calculateUsage(currentStorage, limits.fileStorage),
      },
      upgradeUrl: "/pricing",
    });
  } catch (error) {
    console.error("❌ Error fetching tenant limits:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tenant limits",
      },
      { status: 500 }
    );
  }
}
