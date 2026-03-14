import { NextRequest, NextResponse } from "next/server";

import { getGlobalPostgresPool } from "@proto/database";
import { logger } from "@proto/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = "local-user";
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;

    const pool = getGlobalPostgresPool();

    // Verify session belongs to user
    const sessionResult = await pool.query(
      `SELECT * FROM collaboration_sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const session = sessionResult.rows[0];

    if (session.owner_id !== userId) {
      return NextResponse.json(
        { error: "Only session owner can end session" },
        { status: 403 }
      );
    }

    // End session
    await pool.query(
      `UPDATE collaboration_sessions 
       SET status = 'ended', last_activity_at = $2
       WHERE id = $1`,
      [sessionId, Date.now()]
    );

    // Log activity
    await pool.query(
      `INSERT INTO session_activity (session_id, user_id, activity_type, timestamp)
       VALUES ($1, $2, 'leave', $3)`,
      [sessionId, userId, Date.now()]
    );

    logger.info(
      {
        userId,
        sessionId,
      },
      "Session ended by owner"
    );

    return NextResponse.json({
      success: true,
      message: "Session ended successfully",
    });
  } catch (error) {
    logger.error({ error }, "Failed to end session");
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 }
    );
  }
}
