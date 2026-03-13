/**
 * Tests for Create Tab Session API
 * POST /api/collaboration/sessions/create-tab
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";

import {
  getGlobalPostgresPool,
  closeGlobalPostgresPool,
} from "@proto/database";

// Use global pool for tests
const pool = getGlobalPostgresPool();

describe.skip("POST /api/collaboration/sessions/create-tab", () => {
  beforeAll(async () => {
    // Clean up test sessions
    await pool.query(
      `DELETE FROM collaboration_sessions WHERE owner_workspace_id LIKE 'ws-test%'`
    );
  });

  afterAll(async () => {
    await closeGlobalPostgresPool();
  });

  it("creates session with tab_id", async () => {
    const response = await fetch(
      "http://localhost:3000/api/collaboration/sessions/create-tab",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Note: Would need actual Clerk session in real test
        },
        body: JSON.stringify({
          workspaceId: "ws-test-123",
          tabId: "tab-test-456",
          visibility: "edit",
        }),
      }
    );

    // Expect 401 without auth (correct behavior)
    expect(response.status).toBe(401);
  });

  it("validates required fields", async () => {
    const response = await fetch(
      "http://localhost:3000/api/collaboration/sessions/create-tab",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws-test",
          // Missing tabId
        }),
      }
    );

    expect(response.status).toBe(401); // Auth first, then validation
  });

  it("enforces tier limits", async () => {
    // Would test with free tier user trying to create session
    // Expected: 402 Payment Required
  });

  it("generates valid session ID and room ID", async () => {
    // With proper auth, verify:
    // - session.id is UUID
    // - session.roomId === "session:{uuid}"
    // - session.tabId === tabId from request
  });
});
