/**
 * Integration Tests for Session Lifecycle
 * Tests create → join → activity → leave/end flow
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { getGlobalPostgresPool } from "@proto/database";
import { generateSecureId } from "@proto/utils";

// Use global pool for tests
const pool = getGlobalPostgresPool();

describe.skip("Session Lifecycle", () => {
  let testSessionId: string;

  beforeEach(async () => {
    // Clean up
    await pool.query(
      `DELETE FROM collaboration_sessions WHERE owner_id = 'test-user'`
    );
  });

  afterEach(async () => {
    if (testSessionId) {
      await pool.query(`DELETE FROM collaboration_sessions WHERE id = $1`, [
        testSessionId,
      ]);
    }
  });

  it("creates session with correct schema", async () => {
    const sessionId = generateSecureId();
    const result = await pool.query(
      `INSERT INTO collaboration_sessions (
        id, owner_id, owner_workspace_id, tab_id, room_id,
        created_at, last_activity_at, expires_at,
        status, visibility, has_unmerged_changes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        sessionId,
        "test-user",
        "ws-test",
        "tab-test",
        `session:${sessionId}`,
        Date.now(),
        Date.now(),
        Date.now() + 3600000,
        "active",
        "edit",
        false,
      ]
    );

    testSessionId = result.rows[0].id;

    expect(result.rows[0].tab_id).toBe("tab-test");
    expect(result.rows[0].room_id).toBe(`session:${sessionId}`);
    expect(result.rows[0].status).toBe("active");
  });

  it("adds participants to session", async () => {
    const sessionId = generateSecureId();
    // Create session
    await pool.query(
      `INSERT INTO collaboration_sessions (
        id, owner_id, owner_workspace_id, tab_id, room_id,
        created_at, last_activity_at, expires_at, status, visibility
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        sessionId,
        "test-user",
        "ws-test",
        "tab-test",
        `session:${sessionId}`,
        Date.now(),
        Date.now(),
        Date.now() + 3600000,
        "active",
        "edit",
      ]
    );

    testSessionId = sessionId;

    // Add participant
    await pool.query(
      `INSERT INTO session_participants (session_id, user_id, user_name, role, joined_at, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, "guest-user", "Guest", "editor", Date.now(), Date.now()]
    );

    // Verify
    const result = await pool.query(
      `SELECT * FROM session_participants WHERE session_id = $1`,
      [sessionId]
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].role).toBe("editor");
  });

  it("tracks activity and updates last_activity_at", async () => {
    const sessionId = generateSecureId();
    const now = Date.now();
    await pool.query(
      `INSERT INTO collaboration_sessions (
        id, owner_id, owner_workspace_id, tab_id, room_id,
        created_at, last_activity_at, expires_at, status, visibility
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        sessionId,
        "test-user",
        "ws-test",
        "tab-test",
        `session:${sessionId}`,
        now,
        now,
        now + 3600000,
        "active",
        "edit",
      ]
    );

    testSessionId = sessionId;

    // Insert activity (should trigger update via trigger)
    const activityTime = now + 60000;
    await pool.query(
      `INSERT INTO session_activity (session_id, user_id, activity_type, timestamp)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, "test-user", "edit", activityTime]
    );

    // Verify last_activity_at updated
    const result = await pool.query(
      `SELECT last_activity_at FROM collaboration_sessions WHERE id = $1`,
      [sessionId]
    );

    expect(parseInt(result.rows[0].last_activity_at)).toBe(activityTime);
  });

  it("ends session and marks as ended", async () => {
    const sessionId = generateSecureId();
    await pool.query(
      `INSERT INTO collaboration_sessions (
        id, owner_id, owner_workspace_id, tab_id, room_id,
        created_at, last_activity_at, expires_at, status, visibility
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        sessionId,
        "test-user",
        "ws-test",
        "tab-test",
        `session:${sessionId}`,
        Date.now(),
        Date.now(),
        Date.now() + 3600000,
        "active",
        "edit",
      ]
    );

    testSessionId = sessionId;

    // End session
    await pool.query(
      `UPDATE collaboration_sessions SET status = 'ended' WHERE id = $1`,
      [sessionId]
    );

    // Verify
    const result = await pool.query(
      `SELECT status FROM collaboration_sessions WHERE id = $1`,
      [sessionId]
    );

    expect(result.rows[0].status).toBe("ended");
  });

  it("cascades delete to participants and activity", async () => {
    const sessionId = generateSecureId();
    await pool.query(
      `INSERT INTO collaboration_sessions (
        id, owner_id, owner_workspace_id, tab_id, room_id,
        created_at, last_activity_at, expires_at, status, visibility
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        sessionId,
        "test-user",
        "ws-test",
        "tab-test",
        `session:${sessionId}`,
        Date.now(),
        Date.now(),
        Date.now() + 3600000,
        "active",
        "edit",
      ]
    );

    // Add participant
    await pool.query(
      `INSERT INTO session_participants (session_id, user_id, user_name, role, joined_at, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, "guest", "Guest", "editor", Date.now(), Date.now()]
    );

    // Add activity
    await pool.query(
      `INSERT INTO session_activity (session_id, user_id, activity_type, timestamp)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, "guest", "join", Date.now()]
    );

    // Delete session
    await pool.query(`DELETE FROM collaboration_sessions WHERE id = $1`, [
      sessionId,
    ]);

    // Verify cascades
    const participants = await pool.query(
      `SELECT * FROM session_participants WHERE session_id = $1`,
      [sessionId]
    );
    const activity = await pool.query(
      `SELECT * FROM session_activity WHERE session_id = $1`,
      [sessionId]
    );

    expect(participants.rows).toHaveLength(0);
    expect(activity.rows).toHaveLength(0);

    testSessionId = ""; // Already deleted
  });
});
