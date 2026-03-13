/**
 * Room ID Validation
 *
 * Enforce org-scoped room ID pattern for security.
 * Pattern: org:{orgId}:{type}:{resourceId}
 */

export interface ParsedRoomId {
  orgId: string;
  type: string;
  resourceId: string;
  raw: string;
}

export type WorkspaceRoomType = "latest" | "draft";

export interface ParsedWorkspaceRoomId {
  orgId: string;
  workspaceId: string;
  isLatest: boolean;
  isDraft: boolean;
  draftId: string | null;
  raw: string;
}

const ROOM_ID_PATTERN = /^org:([^:]+):([^:]+):(.+)$/;

/**
 * Validate room ID format
 */
export function isValidRoomId(roomId: string): boolean {
  return ROOM_ID_PATTERN.test(roomId);
}

/**
 * Parse room ID into components
 */
export function parseRoomId(roomId: string): ParsedRoomId | null {
  const match = roomId.match(ROOM_ID_PATTERN);
  if (!match) return null;

  const [, orgId, type, resourceId] = match;
  return {
    orgId,
    type,
    resourceId,
    raw: roomId,
  };
}

/**
 * Validate room ID matches user's org
 */
export function validateRoomIdForOrg(
  roomId: string,
  userOrgId: string
): { valid: boolean; error?: string } {
  if (!isValidRoomId(roomId)) {
    return {
      valid: false,
      error: "Invalid room ID format. Expected: org:{orgId}:{type}:{id}",
    };
  }

  const parsed = parseRoomId(roomId);
  if (!parsed) {
    return {
      valid: false,
      error: "Failed to parse room ID",
    };
  }

  if (parsed.orgId !== userOrgId) {
    return {
      valid: false,
      error: "Room does not belong to your organization",
    };
  }

  return { valid: true };
}

/**
 * Build workspace room ID with draft/latest support (USER-SCOPED)
 * @param userIdOrOrgId - User ID (new) or Organization ID (legacy compatibility)
 * @param workspaceId - Workspace ID
 * @param type - Room type: "latest" (default) or "draft"
 * @param draftId - Draft identifier when type is "draft"
 * @returns Room ID in format: user:{userId}:workspace:{workspaceId}:latest or user:{userId}:workspace:{workspaceId}:draft-{draftId}
 */
export function buildWorkspaceRoomId(
  userIdOrOrgId: string,
  workspaceId: string,
  type: WorkspaceRoomType = "latest",
  draftId?: string
): string {
  // Use "user:" prefix instead of "org:" for user-scoped workspaces
  const base = `user:${userIdOrOrgId}:workspace:${workspaceId}`;

  if (type === "draft") {
    const id = draftId || "1";
    return `${base}:draft-${id}`;
  }

  return `${base}:latest`;
}

/**
 * @deprecated Legacy org-based room IDs. Use buildWorkspaceRoomId with userId instead.
 */
export function buildOrgWorkspaceRoomId(
  orgId: string | null,
  workspaceId: string,
  type: WorkspaceRoomType = "latest",
  draftId?: string
): string {
  if (!orgId) {
    throw new Error(
      "Organization ID is required. User must be in an organization to use collaboration features."
    );
  }

  const base = `org:${orgId}:workspace:${workspaceId}`;

  if (type === "draft") {
    const id = draftId || "1";
    return `${base}:draft-${id}`;
  }

  return `${base}:latest`;
}

/**
 * Parse workspace room ID to extract draft/latest metadata
 * Supports both user: (new) and org: (legacy) prefixes
 * @param roomId - Full room ID
 * @returns Parsed workspace room metadata or null if invalid
 */
export function parseWorkspaceRoomId(
  roomId: string
): ParsedWorkspaceRoomId | null {
  // Pattern: (user|org):{id}:workspace:{workspaceId}:{state}
  const pattern = /^(user|org):([^:]+):workspace:([^:]+):(.+)$/;
  const match = roomId.match(pattern);

  if (!match) {
    // Try legacy format without state suffix
    const legacyPattern = /^(user|org):([^:]+):workspace:([^:]+)$/;
    const legacyMatch = roomId.match(legacyPattern);

    if (legacyMatch) {
      const [, , orgId, workspaceId] = legacyMatch;
      return {
        orgId,
        workspaceId,
        isLatest: true,
        isDraft: false,
        draftId: null,
        raw: roomId,
      };
    }

    return null;
  }

  const [, , orgId, workspaceId, state] = match;
  const isLatest = state === "latest";
  const isDraft = state.startsWith("draft-");
  const draftId = isDraft ? state.replace("draft-", "") : null;

  return {
    orgId,
    workspaceId,
    isLatest,
    isDraft,
    draftId,
    raw: roomId,
  };
}

/**
 * Build research session room ID
 */
export function buildResearchRoomId(orgId: string, sessionId: string): string {
  return `org:${orgId}:research:${sessionId}`;
}

/**
 * Build voice/video room ID
 */
export function buildCollabRoomId(
  orgId: string,
  sessionId: string,
  type: "voice" | "video"
): string {
  return `org:${orgId}:${type}:${sessionId}`;
}

/**
 * Build collaboration session room ID
 * Supports both user-to-user (Basic/Pro) and org-wide (Team+) sessions
 */
export function buildSessionRoomId(
  sessionId: string,
  ownerId: string,
  ownerType: "user" | "org"
): string {
  if (ownerType === "org") {
    return `org:${ownerId}:session:${sessionId}`;
  }
  return `session:${sessionId}:owner:${ownerId}`;
}

/**
 * Parse collaboration session room ID
 * Supports both user-to-user and org-wide session formats
 */
export function parseSessionRoomId(roomId: string): {
  ownerId: string;
  ownerType: "user" | "org";
  sessionId: string;
} | null {
  // Try org-scoped format: org:{orgId}:session:{sessionId}
  const orgMatch = roomId.match(/^org:([^:]+):session:([^:]+)$/);
  if (orgMatch) {
    return {
      ownerId: orgMatch[1],
      ownerType: "org",
      sessionId: orgMatch[2],
    };
  }

  // Try user-scoped format: session:{sessionId}:owner:{userId}
  const userMatch = roomId.match(/^session:([^:]+):owner:([^:]+)$/);
  if (userMatch) {
    return {
      ownerId: userMatch[2],
      ownerType: "user",
      sessionId: userMatch[1],
    };
  }

  return null;
}
