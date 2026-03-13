import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getTierLimits } from "@proto/auth";
import { getGlobalPostgresPool } from "@proto/database";
import type { SessionPreview } from "@proto/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;

    const pool = getGlobalPostgresPool();

    // Get session
    const sessionResult = await pool.query(
      `SELECT * FROM collaboration_sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const session = sessionResult.rows[0];

    // Check if expired
    if (session.status !== "active") {
      return NextResponse.json(
        { error: "Session is not active", status: session.status },
        { status: 410 }
      );
    }

    if (Date.now() > parseInt(session.expires_at)) {
      await pool.query(
        `UPDATE collaboration_sessions SET status = 'ended' WHERE id = $1`,
        [sessionId]
      );
      return NextResponse.json({ error: "Session expired" }, { status: 410 });
    }

    // Get participant count
    const participantsResult = await pool.query(
      `SELECT COUNT(*) as count FROM session_participants WHERE session_id = $1`,
      [sessionId]
    );
    const participantCount = parseInt(participantsResult.rows[0]?.count || "0");

    // Get owner tier limits to determine available roles
    const limits = getTierLimits("basic"); // TODO: Get actual owner tier
    const editorsResult = await pool.query(
      `SELECT COUNT(*) as count FROM session_participants 
       WHERE session_id = $1 AND role = 'editor'`,
      [sessionId]
    );
    const editorCount = parseInt(editorsResult.rows[0]?.count || "0");

    const availableRoles: ("editor" | "viewer")[] = [];
    if (
      editorCount < limits.maxEditorsPerSession ||
      limits.maxEditorsPerSession === -1
    ) {
      availableRoles.push("editor");
    }
    availableRoles.push("viewer");

    const preview: SessionPreview = {
      session: {
        id: session.id,
        tabName: session.tab_id || "Workspace",
        canvasType: "graph", // TODO: Get from tab metadata
        ownerName: "Host", // TODO: Get from Clerk
        participantCount,
        expiresAt: parseInt(session.expires_at),
      },
      canJoin: true,
      availableRoles,
    };

    return NextResponse.json(preview);
  } catch (error) {
    console.error("Session preview error:", error);
    return NextResponse.json(
      { error: "Failed to load session" },
      { status: 500 }
    );
  }
}
