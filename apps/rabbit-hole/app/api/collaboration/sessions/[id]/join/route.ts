/**
 * Join Collaboration Session API
 *
 * POST /api/collaboration/sessions/[id]/join - Join session
 */

import { NextRequest, NextResponse } from "next/server";

import { getUserTier, getTierLimits } from "@proto/auth";
import { getGlobalPostgresPool } from "@proto/database";
import { logger } from "@proto/logger";
import type {
  JoinSessionResponse,
  SessionParticipant,
  ParticipantRole,
} from "@proto/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = {
      id: "local-user",
      publicMetadata: { tier: "free", role: "admin" },
      emailAddresses: [{ emailAddress: "local@localhost" }],
      firstName: "Local",
      lastName: "User",
      fullName: "Local User",
      imageUrl: "",
    } as any;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const pool = getGlobalPostgresPool();

    // Get session
    const sessionResult = await pool.query(
      `SELECT * FROM collaboration_sessions WHERE id = $1`,
      [id]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sessionRow = sessionResult.rows[0];

    // Check status and expiry
    if (sessionRow.status !== "active") {
      return NextResponse.json(
        { error: "Session is not active" },
        { status: 410 }
      );
    }

    if (Date.now() > parseInt(sessionRow.expires_at)) {
      await pool.query(
        `UPDATE collaboration_sessions SET status = 'ended' WHERE id = $1`,
        [id]
      );
      return NextResponse.json({ error: "Session expired" }, { status: 410 });
    }

    // Get owner's tier limits from Clerk
    // clerkClient removed - using local user
    const ownerUser = await client.users.getUser(sessionRow.owner_id);
    const ownerTier = getUserTier(ownerUser);
    const limits = getTierLimits(ownerTier);

    // Count participants by role
    const participantsResult = await pool.query(
      `SELECT * FROM session_participants WHERE session_id = $1`,
      [id]
    );

    const editors = participantsResult.rows.filter(
      (p: any) => p.role === "editor"
    ).length;
    const viewers = participantsResult.rows.filter(
      (p: any) => p.role === "viewer"
    ).length;

    // Determine role
    let role: ParticipantRole;
    if (
      editors < limits.maxEditorsPerSession ||
      limits.maxEditorsPerSession === -1
    ) {
      role = "editor";
    } else if (
      viewers < limits.maxViewersPerSession ||
      limits.maxViewersPerSession === -1
    ) {
      role = "viewer";
    } else {
      return NextResponse.json(
        { error: "Session is full", limitType: "participants" },
        { status: 403 }
      );
    }

    // Add or update participant
    const now = Date.now();
    await pool.query(
      `INSERT INTO session_participants 
       (session_id, user_id, user_name, role, joined_at, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (session_id, user_id)
       DO UPDATE SET last_seen_at = $6, role = $4`,
      [id, user.id, user.firstName || user.username || "Guest", role, now, now]
    );

    // Log activity
    await pool.query(
      `INSERT INTO session_activity (session_id, user_id, activity_type, timestamp)
       VALUES ($1, $2, 'join', $3)`,
      [id, user.id, now]
    );

    // Get all participants
    const allParticipants = await pool.query(
      `SELECT * FROM session_participants WHERE session_id = $1`,
      [id]
    );

    const participants: SessionParticipant[] = allParticipants.rows.map(
      (row: any) => ({
        sessionId: row.session_id,
        userId: row.user_id,
        userName: row.user_name,
        role: row.role,
        joinedAt: parseInt(row.joined_at),
        lastSeenAt: parseInt(row.last_seen_at),
      })
    );

    const session = {
      id: sessionRow.id,
      ownerId: sessionRow.owner_id,
      ownerWorkspaceId: sessionRow.owner_workspace_id,
      roomId: sessionRow.room_id,
      createdAt: parseInt(sessionRow.created_at),
      lastActivityAt: parseInt(sessionRow.last_activity_at),
      expiresAt: parseInt(sessionRow.expires_at),
      status: sessionRow.status,
      visibility: sessionRow.visibility,
      hasUnmergedChanges: sessionRow.has_unmerged_changes,
      mergedAt: sessionRow.merged_at
        ? parseInt(sessionRow.merged_at)
        : undefined,
    };

    const response: JoinSessionResponse = {
      session,
      role,
      participants,
    };

    logger.info(
      { userId: user.id, sessionId: id, role },
      "User joined collaboration session"
    );

    return NextResponse.json(response);
  } catch (error) {
    logger.error({ error }, "Join session error");
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
