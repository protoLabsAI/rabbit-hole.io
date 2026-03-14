/**
 * Collaboration Session Detail API
 *
 * GET /api/collaboration/sessions/[id] - Get session details
 * DELETE /api/collaboration/sessions/[id] - End session
 */

import { NextRequest, NextResponse } from "next/server";

import { getGlobalPostgresPool } from "@proto/database";
import type { CollaborationSession } from "@proto/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = { id: "local-user", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "" } as any;
    const { id } = await params;

    const pool = getGlobalPostgresPool();
    const result = await pool.query(
      `SELECT * FROM collaboration_sessions WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const row = result.rows[0];

    // Check if session is expired
    if (row.status === "active" && Date.now() > parseInt(row.expires_at)) {
      await pool.query(
        `UPDATE collaboration_sessions SET status = 'ended' WHERE id = $1`,
        [id]
      );
      return NextResponse.json({ error: "Session expired" }, { status: 410 });
    }

    const session: CollaborationSession = {
      id: row.id,
      ownerId: row.owner_id,
      ownerWorkspaceId: row.owner_workspace_id,
      tabId: row.tab_id,
      roomId: row.room_id,
      clerkOrgId: row.clerk_org_id || null,
      createdAt: parseInt(row.created_at),
      lastActivityAt: parseInt(row.last_activity_at),
      expiresAt: parseInt(row.expires_at),
      status: row.status,
      visibility: row.visibility,
      hasUnmergedChanges: row.has_unmerged_changes,
      mergedAt: row.merged_at ? parseInt(row.merged_at) : undefined,
    };

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = { id: "local-user", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "" } as any;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const pool = getGlobalPostgresPool();

    // Check ownership
    const result = await pool.query(
      `SELECT owner_id FROM collaboration_sessions WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (result.rows[0].owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // End session
    await pool.query(
      `UPDATE collaboration_sessions SET status = 'ended' WHERE id = $1`,
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
