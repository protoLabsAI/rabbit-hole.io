import { NextRequest, NextResponse } from "next/server";

import { getUserTier, getTierLimits } from "@proto/auth";
import { getGlobalPostgresPool } from "@proto/database";
import { logger } from "@proto/logger";
import { generateSecureId } from "@proto/utils";

export async function POST(request: NextRequest) {
  try {
    const userId = "local-user";
    const orgId = "local-org";
    const user = {
      id: "local-user",
      publicMetadata: { tier: "free", role: "admin" },
      emailAddresses: [{ emailAddress: "local@localhost" }],
      firstName: "Local",
      lastName: "User",
      fullName: "Local User",
      imageUrl: "",
    } as any;

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, tabId, visibility = "edit" } = body;

    if (!workspaceId || !tabId) {
      return NextResponse.json(
        { error: "workspaceId and tabId required" },
        { status: 400 }
      );
    }

    // Check tier limits FIRST
    const tier = getUserTier(user);
    const limits = getTierLimits(tier);

    if (limits.maxActiveSessions === 0) {
      return NextResponse.json(
        {
          error: "Collaboration requires Basic tier or higher",
          limitType: "maxActiveSessions",
          tier,
          upgradeUrl: "/pricing",
        },
        { status: 402 }
      );
    }

    // Team+ tiers require organization
    const isTeamTier = tier === "team" || tier === "enterprise";
    if (isTeamTier && !orgId) {
      return NextResponse.json(
        {
          error: "Team/Enterprise tiers require organization setup",
          tier,
        },
        { status: 400 }
      );
    }

    const now = Date.now();

    const pool = getGlobalPostgresPool();

    // Auto-cleanup expired sessions before checking limit
    await pool.query(
      `UPDATE collaboration_sessions 
       SET status = 'ended', last_activity_at = $1
       WHERE owner_id = $2 
         AND status = 'active' 
         AND expires_at < $1`,
      [now, userId]
    );

    // Count VALID active sessions (non-expired)
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM collaboration_sessions 
       WHERE owner_id = $1 
         AND status = 'active'
         AND expires_at >= $2`,
      [userId, now]
    );

    const activeSessions = parseInt(countResult.rows[0]?.count || "0");

    if (
      limits.maxActiveSessions !== -1 &&
      activeSessions >= limits.maxActiveSessions
    ) {
      return NextResponse.json(
        {
          error: "Active session limit reached",
          limitType: "maxActiveSessions",
          currentValue: activeSessions,
          maxValue: limits.maxActiveSessions,
          tier,
        },
        { status: 402 }
      );
    }

    // Create session
    const sessionId = generateSecureId();

    // Room ID format depends on tier
    const ownerType = isTeamTier ? "org" : "user";
    const ownerId = isTeamTier ? orgId! : userId;
    const roomId = isTeamTier
      ? `org:${orgId}:session:${sessionId}`
      : `session:${sessionId}:owner:${userId}`;

    const expiresAt = now + limits.sessionDurationMinutes * 60 * 1000;

    const result = await pool.query(
      `INSERT INTO collaboration_sessions (
        id, owner_id, owner_workspace_id, tab_id, room_id,
        clerk_org_id, scope_type, scope_id,
        created_at, last_activity_at, expires_at,
        status, visibility, has_unmerged_changes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        sessionId,
        userId,
        workspaceId,
        tabId,
        roomId,
        orgId || null,
        ownerType,
        ownerId,
        now,
        now,
        expiresAt,
        "active",
        visibility,
        false,
      ]
    );

    const origin = request.headers.get("origin") || "http://localhost:3000";
    const shareLink = `${origin}/session/${sessionId}`;

    logger.info(
      {
        userId,
        sessionId,
        workspaceId,
        tabId,
      },
      "Tab collaboration session created"
    );

    return NextResponse.json({
      session: {
        id: result.rows[0].id,
        ownerId: result.rows[0].owner_id,
        ownerWorkspaceId: result.rows[0].owner_workspace_id,
        tabId: result.rows[0].tab_id,
        roomId: result.rows[0].room_id,
        createdAt: parseInt(result.rows[0].created_at),
        lastActivityAt: parseInt(result.rows[0].last_activity_at),
        expiresAt: parseInt(result.rows[0].expires_at),
        status: result.rows[0].status,
        visibility: result.rows[0].visibility,
        hasUnmergedChanges: result.rows[0].has_unmerged_changes,
      },
      shareLink,
    });
  } catch (error) {
    logger.error({ error }, "Failed to create tab session");
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
