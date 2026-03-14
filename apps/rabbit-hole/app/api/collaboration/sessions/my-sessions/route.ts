/**
 * My Sessions Endpoint
 *
 * Get current user's collaboration sessions with cleanup option
 */

import { NextRequest, NextResponse } from "next/server";

import { getGlobalPostgresPool } from "@proto/database";

export async function GET(request: NextRequest) {
  try {
    const { userId } = { userId: "local-user" };

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = Date.now();

    const pool = getGlobalPostgresPool();
    const result = await pool.query(
      `SELECT 
        id, tab_id, room_id, status,
        created_at, last_activity_at, expires_at,
        (expires_at < $1) as is_expired,
        FLOOR((expires_at - $1) / 1000 / 60) as minutes_remaining
       FROM collaboration_sessions 
       WHERE owner_id = $2
       ORDER BY created_at DESC`,
      [now, userId]
    );

    const sessions = result.rows.map((row) => ({
      id: row.id,
      tabId: row.tab_id,
      roomId: row.room_id,
      status: row.status,
      createdAt: parseInt(row.created_at),
      expiresAt: parseInt(row.expires_at),
      isExpired: row.is_expired,
      minutesRemaining: parseInt(row.minutes_remaining),
    }));

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("My sessions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

// Cleanup endpoint
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = { userId: "local-user" };

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "expired";

    const now = Date.now();

    const pool = getGlobalPostgresPool();

    if (mode === "all") {
      // End ALL user's active sessions
      const result = await pool.query(
        `UPDATE collaboration_sessions 
         SET status = 'ended', last_activity_at = $1
         WHERE owner_id = $2 AND status = 'active'
         RETURNING id`,
        [now, userId]
      );

      return NextResponse.json({
        success: true,
        cleaned: result.rowCount,
        message: `Ended ${result.rowCount} active sessions`,
      });
    } else {
      // End only expired sessions
      const result = await pool.query(
        `UPDATE collaboration_sessions 
         SET status = 'ended', last_activity_at = $1
         WHERE owner_id = $2 
           AND status = 'active' 
           AND expires_at < $1
         RETURNING id`,
        [now, userId]
      );

      return NextResponse.json({
        success: true,
        cleaned: result.rowCount,
        message: `Cleaned ${result.rowCount} expired sessions`,
      });
    }
  } catch (error) {
    console.error("Cleanup sessions error:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
