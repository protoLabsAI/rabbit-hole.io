/**
 * Session Cleanup Endpoint
 *
 * DEV/ADMIN utility to clean up orphaned or expired sessions.
 * Can be called manually or via cron job.
 */

import { NextRequest, NextResponse } from "next/server";

import { getGlobalPostgresPool } from "@proto/database";
import { logger } from "@proto/logger";

export async function POST(request: NextRequest) {
  try {
    const userId = "local-user";
    const user = { id: "local-user", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "" } as any;

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { mode = "user", force = false } = body;

    const now = Date.now();
    const pool = getGlobalPostgresPool();
    let result;

    if (mode === "user") {
      // Clean up only this user's sessions
      if (force) {
        // Force close ALL user's sessions (regardless of expiration)
        result = await pool.query(
          `UPDATE collaboration_sessions 
           SET status = 'ended', last_activity_at = $1
           WHERE owner_id = $2 AND status = 'active'
           RETURNING id, tab_id`,
          [now, userId]
        );
      } else {
        // Only close expired sessions
        result = await pool.query(
          `UPDATE collaboration_sessions 
           SET status = 'ended', last_activity_at = $1
           WHERE owner_id = $2 
             AND status = 'active' 
             AND expires_at < $1
           RETURNING id, tab_id`,
          [now, userId]
        );
      }

      logger.info(
        { userId, mode, force, closedCount: result.rowCount },
        "User session cleanup completed"
      );

      return NextResponse.json({
        success: true,
        mode: "user",
        closedSessions: result.rowCount,
        sessions: result.rows,
        message: force
          ? "All your active sessions have been ended"
          : "Expired sessions have been cleaned up",
      });
    }

    if (mode === "expired") {
      // Global cleanup of ALL expired sessions (any user)
      // Only allow if user is admin (you can add admin check here)
      result = await pool.query(
        `UPDATE collaboration_sessions 
         SET status = 'ended', last_activity_at = $1
         WHERE status = 'active' AND expires_at < $1
         RETURNING id, owner_id, tab_id`,
        [now]
      );

      logger.info(
        { userId, closedCount: result.rowCount },
        "Global expired session cleanup"
      );

      return NextResponse.json({
        success: true,
        mode: "expired",
        closedSessions: result.rowCount,
        message: `Cleaned up ${result.rowCount} expired sessions`,
      });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (error) {
    logger.error({ error }, "Session cleanup failed");
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}

// GET endpoint to check session status
export async function GET(request: NextRequest) {
  try {
    const userId = "local-user";

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = Date.now();

    const pool = getGlobalPostgresPool();

    // Get user's active sessions
    const result = await pool.query(
      `SELECT 
        id, tab_id, room_id, status,
        created_at, last_activity_at, expires_at,
        (expires_at < $1) as is_expired,
        (expires_at - $1) / 1000 / 60 as minutes_remaining
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
      lastActivityAt: parseInt(row.last_activity_at),
      expiresAt: parseInt(row.expires_at),
      isExpired: row.is_expired,
      minutesRemaining: Math.floor(row.minutes_remaining),
    }));

    const active = sessions.filter((s) => s.status === "active");
    const expired = active.filter((s) => s.isExpired);

    return NextResponse.json({
      sessions,
      summary: {
        total: sessions.length,
        active: active.length,
        expired: expired.length,
        ended: sessions.filter((s) => s.status === "ended").length,
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to get session status");
    return NextResponse.json(
      { error: "Failed to get sessions" },
      { status: 500 }
    );
  }
}
