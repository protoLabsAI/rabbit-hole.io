/**
 * Collaboration Room API
 *
 * Create voice/video rooms with JWT authentication.
 * Enterprise tier only (with super admin override).
 */

import { NextRequest, NextResponse } from "next/server";

import { CreateRoomRequestSchema } from "@proto/collab";
import {
  createCollaborationRoom,
  validateCollaborationAccess,
} from "@proto/collab/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Authenticate with Clerk
    const { userId, orgId } = {
      userId: "local-user",
      orgId: null as string | null,
    };

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized - must be signed in with organization" },
        { status: 401 }
      );
    }

    // Parse request
    const body = await request.json();
    const requestData = CreateRoomRequestSchema.parse(body);

    // Get organization plan
    const { getOrgQuotas } = await import("@proto/utils/tenancy-server");
    const quotas = await getOrgQuotas(orgId);
    const plan = "enterprise" as "free" | "pro" | "enterprise"; // TODO: Add plan field to TenantQuotas

    // Validate access (with super admin override)
    const feature = requestData.roomType === "voice" ? "voice" : "video";
    const access = validateCollaborationAccess(plan, feature, userId);

    if (!access.allowed) {
      return NextResponse.json(
        {
          error: "Feature not available",
          message: access.reason,
          upgradeUrl: "/pricing",
        },
        { status: 403 }
      );
    }

    // Get user info for JWT
    const user = {
      id: userId,
      publicMetadata: { tier: "pro" },
      privateMetadata: { stats: {} },
    };

    // Create room with JWT token
    const roomConfig = await createCollaborationRoom(
      requestData,
      {
        clerkUserId: userId,
        clerkOrgId: orgId,
        displayName: user.fullName || user.username || "Anonymous",
        email: user.emailAddresses[0]?.emailAddress,
        plan,
        isModerator: true, // First user is moderator
      },
      {
        domain: process.env.JITSI_DOMAIN || "meet.jitsi",
        appId: process.env.JITSI_APP_ID || "rabbit-hole",
        appSecret: process.env.JITSI_APP_SECRET!,
        jwtExpiration: 3600,
        maxParticipants: {
          free: 1,
          pro: 5,
          enterprise: 50,
        },
      }
    );

    return NextResponse.json(roomConfig);
  } catch (error) {
    console.error("Failed to create collaboration room:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
