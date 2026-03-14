/**
 * Collaboration Sessions API
 *
 * POST /api/collaboration/sessions - Create new session
 * GET /api/collaboration/sessions - List user's sessions
 */

import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { getUserTier, getTierLimits } from "@proto/auth";
import { getGlobalPostgresPool } from "@proto/database";
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  CollaborationSession,
} from "@proto/types";

export async function POST(request: NextRequest) {
  try {
<<<<<<< HEAD
    const userId = "local-user";
  const orgId = "local-org";
    const user = { id: "local-user", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "" } as any;
=======
    const { userId, orgId } = {
      userId: "local-user",
      orgId: null as string | null,
    };
    const user = {
      id: "local-user",
      firstName: "Local",
      lastName: "User",
      username: "local-user",
      fullName: "Local User",
      emailAddresses: [{ emailAddress: "local@localhost" }],
      publicMetadata: { tier: "pro" },
      privateMetadata: { stats: {} },
    };
>>>>>>> origin/main

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreateSessionRequest = await request.json();
    const { workspaceId, visibility = "edit" } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId required" },
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

    // Count active sessions
    const pool = getGlobalPostgresPool();
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM collaboration_sessions
       WHERE owner_id = $1 AND status = 'active'`,
      [user.id]
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
    const sessionId = randomUUID();

    // Room ID format depends on tier
    // Basic/Pro: user-to-user sessions
    // Team+: org-wide sessions
    const ownerType = isTeamTier ? "org" : "user";
    const ownerId = isTeamTier ? orgId! : userId;
    const roomId = isTeamTier
      ? `org:${orgId}:session:${sessionId}`
      : `session:${sessionId}:owner:${userId}`;

    const now = Date.now();
    const expiresAt = now + limits.sessionDurationMinutes * 60 * 1000;

    const result = await pool.query(
      `INSERT INTO collaboration_sessions (
        id, owner_id, owner_workspace_id, room_id,
        clerk_org_id, scope_type, scope_id,
        created_at, last_activity_at, expires_at,
        status, visibility, has_unmerged_changes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        sessionId,
        user.id,
        workspaceId,
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

    const session: CollaborationSession = {
      id: result.rows[0].id,
      ownerId: result.rows[0].owner_id,
      ownerWorkspaceId: result.rows[0].owner_workspace_id,
      roomId: result.rows[0].room_id,
      createdAt: parseInt(result.rows[0].created_at),
      lastActivityAt: parseInt(result.rows[0].last_activity_at),
      expiresAt: parseInt(result.rows[0].expires_at),
      status: result.rows[0].status,
      visibility: result.rows[0].visibility,
      hasUnmergedChanges: result.rows[0].has_unmerged_changes,
      mergedAt: result.rows[0].merged_at
        ? parseInt(result.rows[0].merged_at)
        : undefined,
    };

    const origin = request.headers.get("origin") || "";
    const shareLink = `${origin}/session/${sessionId}`;

    const response: CreateSessionResponse = {
      session,
      shareLink,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
<<<<<<< HEAD
    const user = { id: "local-user", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "" } as any;
=======
    const user = {
      id: "local-user",
      firstName: "Local",
      lastName: "User",
      username: "local-user",
      fullName: "Local User",
      emailAddresses: [{ emailAddress: "local@localhost" }],
      publicMetadata: { tier: "pro" },
      privateMetadata: { stats: {} },
    };
>>>>>>> origin/main
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's sessions (owned or participating)
    const pool = getGlobalPostgresPool();
    const result = await pool.query(
      `SELECT DISTINCT s.*
       FROM collaboration_sessions s
       LEFT JOIN session_participants p ON s.id = p.session_id
       WHERE s.owner_id = $1 OR p.user_id = $1
       ORDER BY s.created_at DESC
       LIMIT 50`,
      [user.id]
    );

    const sessions: CollaborationSession[] = result.rows.map((row: any) => ({
      id: row.id,
      ownerId: row.owner_id,
      ownerWorkspaceId: row.owner_workspace_id,
      roomId: row.room_id,
      createdAt: parseInt(row.created_at),
      lastActivityAt: parseInt(row.last_activity_at),
      expiresAt: parseInt(row.expires_at),
      status: row.status,
      visibility: row.visibility,
      hasUnmergedChanges: row.has_unmerged_changes,
      mergedAt: row.merged_at ? parseInt(row.merged_at) : undefined,
    }));

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("List sessions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
