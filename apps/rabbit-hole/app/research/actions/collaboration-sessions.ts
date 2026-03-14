"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getUserTier, getTierLimits } from "@proto/auth";
import { getGlobalPostgresPool } from "@proto/database";
import { logger } from "@proto/logger";
import type { CollaborationSession } from "@proto/types";
import { generateSecureId } from "@proto/utils";

import type { ActionResult } from "./types";

const pool = getGlobalPostgresPool();

// Input Schemas
const CreateSessionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  tabId: z.string().optional(),
  isPublic: z.boolean().optional(),
  workspaceId: z.string(),
  visibility: z.enum(["edit", "view"]).optional(),
});

const CreateTabSessionSchema = z.object({
  tabId: z.string().min(1),
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(["edit", "view"]).optional(),
});

const InitializeSessionSchema = z.object({
  sessionId: z.string().uuid(),
  tabId: z.string().min(1),
  workspaceId: z.string().min(1),
  canvasData: z.any(),
  canvasType: z
    .enum(["graph", "map", "timeline", "table", "kanban", "mindmap"])
    .optional(),
});

const EndSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

const DeleteSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

// Action 1: Create Collaboration Session
export async function createCollaborationSession(
  input: z.infer<typeof CreateSessionSchema>
): Promise<
  ActionResult<{
    session: CollaborationSession;
    shareLink: string;
  }>
> {
  try {
    // Validate input
    const parsed = CreateSessionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error:
          "Invalid input: " +
          parsed.error.issues.map((e) => e.message).join(", "),
        status: 400,
      };
    }

    const {
      name,
      description,
      tabId,
      workspaceId,
      visibility = "edit",
    } = parsed.data;

    // Auth check
    const userId = "local-user";
    const orgId = "local-org";
    const user = {
      id: "local-user",
      publicMetadata: { tier: "free", role: "admin" },
      emailAddresses: [{ emailAddress: "local@localhost" }],
      firstName: "Local",
      lastName: "User",
      fullName: "Local User",
      imageUrl: "",
    } as any;

    if (!userId || !user) {
      return {
        error: "Unauthorized",
        status: 401,
      };
    }

    // Tier enforcement
    const tier = getUserTier(user);
    const limits = getTierLimits(tier);

    if (limits.maxActiveSessions === 0) {
      return {
        error: "Collaboration requires Basic tier or higher",
        limitType: "maxActiveSessions",
        tier,
        upgradeUrl: "/pricing",
        status: 402,
      };
    }

    // Team+ tiers require organization
    const isTeamTier = tier === "team" || tier === "enterprise";
    if (isTeamTier && !orgId) {
      return {
        error: "Team/Enterprise tiers require organization setup",
        status: 400,
      };
    }

    const now = Date.now();

    // Auto-cleanup expired sessions
    await pool.query(
      `UPDATE collaboration_sessions 
       SET status = 'ended', last_activity_at = $1
       WHERE owner_id = $2 
         AND status = 'active' 
         AND expires_at < $1`,
      [now, userId]
    );

    // Count active sessions
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM collaboration_sessions
       WHERE owner_id = $1 AND status = 'active' AND expires_at >= $2`,
      [userId, now]
    );

    const activeSessions = parseInt(countResult.rows[0]?.count || "0");

    if (
      limits.maxActiveSessions !== -1 &&
      activeSessions >= limits.maxActiveSessions
    ) {
      return {
        error: `Active session limit reached (${activeSessions}/${limits.maxActiveSessions})`,
        limitType: "maxActiveSessions",
        tier,
        upgradeUrl: "/pricing",
        status: 402,
      };
    }

    // Create session
    const sessionId = generateSecureId();
    const ownerType = isTeamTier ? "org" : "user";
    const ownerId = isTeamTier ? orgId! : userId;
    const roomId = isTeamTier
      ? `org:${orgId}:session:${sessionId}`
      : `session:${sessionId}:owner:${userId}`;

    const expiresAt = now + limits.sessionDurationMinutes * 60 * 1000;

    const result = await pool.query(
      `INSERT INTO collaboration_sessions (
        id, owner_id, owner_workspace_id, tab_id, room_id,
        clerk_org_id, scope_type, scope_id,
        created_at, last_activity_at, expires_at,
        status, visibility, has_unmerged_changes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        sessionId,
        userId,
        workspaceId,
        tabId || null,
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
      tabId: result.rows[0].tab_id,
      roomId: result.rows[0].room_id,
      clerkOrgId: result.rows[0].clerk_org_id,
      createdAt: parseInt(result.rows[0].created_at),
      lastActivityAt: parseInt(result.rows[0].last_activity_at),
      expiresAt: parseInt(result.rows[0].expires_at),
      status: result.rows[0].status,
      visibility: result.rows[0].visibility,
      hasUnmergedChanges: result.rows[0].has_unmerged_changes,
    };

    const origin = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const shareLink = `${origin}/session/${sessionId}`;

    logger.info(
      {
        userId,
        sessionId,
        workspaceId,
        tier,
      },
      "Collaboration session created"
    );

    // Note: Don't revalidate /research here - user is navigating to session page
    // Revalidation will happen when they return to workspace

    return {
      data: { session, shareLink },
      status: 200,
    };
  } catch (error) {
    logger.error({ error }, "Create session failed");
    return {
      error: "Internal server error",
      status: 500,
    };
  }
}

// Action 2: Create Tab Session
export async function createTabSession(
  input: z.infer<typeof CreateTabSessionSchema>
): Promise<
  ActionResult<{
    session: CollaborationSession;
    shareLink: string;
  }>
> {
  try {
    const parsed = CreateTabSessionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error:
          "Invalid input: " +
          parsed.error.issues.map((e) => e.message).join(", "),
        status: 400,
      };
    }

    const {
      tabId,
      workspaceId,
      name,
      description,
      visibility = "edit",
    } = parsed.data;

    // Auth check
    const userId = "local-user";
    const orgId = "local-org";
    const user = {
      id: "local-user",
      publicMetadata: { tier: "free", role: "admin" },
      emailAddresses: [{ emailAddress: "local@localhost" }],
      firstName: "Local",
      lastName: "User",
      fullName: "Local User",
      imageUrl: "",
    } as any;

    if (!userId || !user) {
      return {
        error: "Unauthorized",
        status: 401,
      };
    }

    // Tier enforcement
    const tier = getUserTier(user);
    const limits = getTierLimits(tier);

    if (limits.maxActiveSessions === 0) {
      return {
        error: "Collaboration requires Basic tier or higher",
        limitType: "maxActiveSessions",
        tier,
        upgradeUrl: "/pricing",
        status: 402,
      };
    }

    const isTeamTier = tier === "team" || tier === "enterprise";
    if (isTeamTier && !orgId) {
      return {
        error: "Team/Enterprise tiers require organization setup",
        status: 400,
      };
    }

    const now = Date.now();

    // Auto-cleanup expired sessions
    await pool.query(
      `UPDATE collaboration_sessions 
       SET status = 'ended', last_activity_at = $1
       WHERE owner_id = $2 
         AND status = 'active' 
         AND expires_at < $1`,
      [now, userId]
    );

    // Check session limits
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM collaboration_sessions
       WHERE owner_id = $1 AND status = 'active' AND expires_at >= $2`,
      [userId, now]
    );

    const activeSessions = parseInt(countResult.rows[0]?.count || "0");

    if (
      limits.maxActiveSessions !== -1 &&
      activeSessions >= limits.maxActiveSessions
    ) {
      return {
        error: `Active session limit reached (${activeSessions}/${limits.maxActiveSessions})`,
        limitType: "maxActiveSessions",
        tier,
        upgradeUrl: "/pricing",
        status: 402,
      };
    }

    // Create session
    const sessionId = generateSecureId();
    const ownerType = isTeamTier ? "org" : "user";
    const ownerId = isTeamTier ? orgId! : userId;
    const roomId = isTeamTier
      ? `org:${orgId}:session:${sessionId}`
      : `session:${sessionId}:owner:${userId}`;

    const expiresAt = now + limits.sessionDurationMinutes * 60 * 1000;

    const result = await pool.query(
      `INSERT INTO collaboration_sessions (
        id, owner_id, owner_workspace_id, tab_id, room_id,
        clerk_org_id, scope_type, scope_id,
        created_at, last_activity_at, expires_at,
        status, visibility, has_unmerged_changes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        sessionId,
        userId,
        workspaceId,
        tabId,
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
      tabId: result.rows[0].tab_id,
      roomId: result.rows[0].room_id,
      clerkOrgId: result.rows[0].clerk_org_id,
      createdAt: parseInt(result.rows[0].created_at),
      lastActivityAt: parseInt(result.rows[0].last_activity_at),
      expiresAt: parseInt(result.rows[0].expires_at),
      status: result.rows[0].status,
      visibility: result.rows[0].visibility,
      hasUnmergedChanges: result.rows[0].has_unmerged_changes,
    };

    const origin = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const shareLink = `${origin}/session/${sessionId}`;

    logger.info(
      {
        userId,
        sessionId,
        workspaceId,
        tabId,
      },
      "Tab collaboration session created"
    );

    // Note: Don't revalidate /research here - user is navigating to session page
    // Revalidation will happen when they return to workspace

    return {
      data: { session, shareLink },
      status: 200,
    };
  } catch (error) {
    logger.error({ error }, "Create tab session failed");
    return {
      error: "Internal server error",
      status: 500,
    };
  }
}

// Action 3: Initialize Session Data
export async function initializeSessionData(
  input: z.infer<typeof InitializeSessionSchema>
): Promise<
  ActionResult<{
    success: boolean;
    sessionId: string;
    nodeCount: number;
    ready: boolean;
  }>
> {
  try {
    const parsed = InitializeSessionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error:
          "Invalid input: " +
          parsed.error.issues.map((e) => e.message).join(", "),
        status: 400,
      };
    }

    const {
      sessionId,
      tabId,
      workspaceId,
      canvasData,
      canvasType = "graph",
    } = parsed.data;

    const userId = "local-user";
    if (!userId) {
      return {
        error: "Unauthorized",
        status: 401,
      };
    }

    // Verify session exists and user has access
    const sessionResult = await pool.query(
      `SELECT * FROM collaboration_sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return {
        error: "Session not found",
        status: 404,
      };
    }

    const session = sessionResult.rows[0];

    // Verify ownership or participation
    if (session.owner_id !== userId) {
      // TODO: Check if user is participant when we add participant tracking
      return {
        error: "Not authorized to initialize this session",
        status: 403,
      };
    }

    // Store metadata
    const sessionMetadata = {
      canvasData,
      canvasType,
      tabId,
      workspaceId,
      initializedAt: Date.now(),
      initializedBy: userId,
    };

    const now = Date.now();

    await pool.query(
      `INSERT INTO collaboration_sessions_metadata (session_id, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $3)
       ON CONFLICT (session_id) DO UPDATE
       SET metadata = $2, updated_at = $3`,
      [sessionId, JSON.stringify(sessionMetadata), now]
    );

    const nodeCount = canvasData?.graphData?.nodes?.length || 0;

    logger.info(
      {
        userId,
        sessionId,
        nodeCount,
      },
      "Session initialized"
    );

    revalidatePath(`/session/${sessionId}`);

    return {
      data: {
        success: true,
        sessionId,
        nodeCount,
        ready: true,
      },
      status: 200,
    };
  } catch (error) {
    logger.error({ error }, "Initialize session failed");
    return {
      error: "Failed to initialize session",
      status: 500,
    };
  }
}

// Action 4: End Session
export async function endCollaborationSession(
  input: z.infer<typeof EndSessionSchema>
): Promise<ActionResult<{ success: boolean; message: string }>> {
  try {
    const parsed = EndSessionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: "Invalid input: sessionId required",
        status: 400,
      };
    }

    const { sessionId } = parsed.data;

    const userId = "local-user";
    if (!userId) {
      return {
        error: "Unauthorized",
        status: 401,
      };
    }

    // Verify session exists
    const sessionResult = await pool.query(
      `SELECT * FROM collaboration_sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return {
        error: "Session not found",
        status: 404,
      };
    }

    const session = sessionResult.rows[0];

    // Verify ownership
    if (session.owner_id !== userId) {
      return {
        error: "Only session owner can end session",
        status: 403,
      };
    }

    const now = Date.now();

    // End session
    await pool.query(
      `UPDATE collaboration_sessions 
       SET status = 'ended', last_activity_at = $2
       WHERE id = $1`,
      [sessionId, now]
    );

    // Log activity
    await pool.query(
      `INSERT INTO session_activity (session_id, user_id, activity_type, timestamp)
       VALUES ($1, $2, 'leave', $3)`,
      [sessionId, userId, now]
    );

    logger.info(
      {
        userId,
        sessionId,
      },
      "Session ended by owner"
    );

    // Revalidate session page to update status
    revalidatePath(`/session/${sessionId}`);
    // Revalidate research page to update session list
    revalidatePath("/research");

    return {
      data: {
        success: true,
        message: "Session ended successfully",
      },
      status: 200,
    };
  } catch (error) {
    logger.error({ error }, "End session failed");
    return {
      error: "Failed to end session",
      status: 500,
    };
  }
}

// Action 5: Delete Session
export async function deleteCollaborationSession(
  input: z.infer<typeof DeleteSessionSchema>
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const parsed = DeleteSessionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: "Invalid input: sessionId required",
        status: 400,
      };
    }

    const { sessionId } = parsed.data;

    const userId = "local-user";
    if (!userId) {
      return {
        error: "Unauthorized",
        status: 401,
      };
    }

    // Check ownership
    const result = await pool.query(
      `SELECT owner_id, status FROM collaboration_sessions WHERE id = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return {
        error: "Session not found",
        status: 404,
      };
    }

    if (result.rows[0].owner_id !== userId) {
      return {
        error: "Only session owner can delete session",
        status: 403,
      };
    }

    // Soft delete (mark as ended)
    await pool.query(
      `UPDATE collaboration_sessions SET status = 'ended' WHERE id = $1`,
      [sessionId]
    );

    logger.info(
      {
        userId,
        sessionId,
      },
      "Session deleted"
    );

    // Revalidate research page to remove deleted session from list
    revalidatePath("/research");

    return {
      data: { success: true },
      status: 200,
    };
  } catch (error) {
    logger.error({ error }, "Delete session failed");
    return {
      error: "Failed to delete session",
      status: 500,
    };
  }
}
