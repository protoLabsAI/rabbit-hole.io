import { NextRequest, NextResponse } from "next/server";

import { getGlobalPostgresPool } from "@proto/database";
import { logger } from "@proto/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = { userId: "local-user" };
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;

    const pool = getGlobalPostgresPool();

    // Remove participant
    const result = await pool.query(
      `DELETE FROM session_participants 
       WHERE session_id = $1 AND user_id = $2
       RETURNING user_name`,
      [sessionId, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not in session" }, { status: 404 });
    }

    // Log leave activity
    await pool.query(
      `INSERT INTO session_activity (session_id, user_id, activity_type, timestamp)
       VALUES ($1, $2, 'leave', $3)`,
      [sessionId, userId, Date.now()]
    );

    logger.info(
      {
        userId,
        sessionId,
        userName: result.rows[0].user_name,
      },
      "Guest left session"
    );

    return NextResponse.json({
      success: true,
      message: "Left session successfully",
    });
  } catch (error) {
    logger.error({ error }, "Failed to leave session");
    return NextResponse.json(
      { error: "Failed to leave session" },
      { status: 500 }
    );
  }
}
