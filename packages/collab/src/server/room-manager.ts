/**
 * Room Management for Collaboration
 *
 * Create and manage voice/video rooms with org scoping.
 */

import type {
  CollaborationRoomConfig,
  CreateRoomRequest,
  CreateRoomResponse,
  OrganizationPlan,
  JitsiConfig,
} from "../types";
import { CollaborationRoomConfigSchema } from "../types";

import { assertFeatureAccess, getMaxParticipants } from "./feature-gates";
import { generateJitsiToken } from "./jwt";

/**
 * Create a collaboration room with JWT token
 */
export async function createCollaborationRoom(
  request: CreateRoomRequest,
  context: {
    clerkUserId: string;
    clerkOrgId: string;
    displayName?: string;
    email?: string;
    plan: OrganizationPlan;
    isModerator?: boolean;
  },
  jitsiConfig: JitsiConfig
): Promise<CreateRoomResponse> {
  // Validate plan access
  assertFeatureAccess(
    context.plan,
    request.roomType === "voice" ? "voice" : "video"
  );

  // Build room ID with org scoping
  const roomId = buildRoomId(
    context.clerkOrgId,
    request.sessionId,
    request.roomType
  );

  // Build room config
  const roomConfig: CollaborationRoomConfig =
    CollaborationRoomConfigSchema.parse({
      roomId,
      clerkOrgId: context.clerkOrgId,
      clerkUserId: context.clerkUserId,
      displayName: context.displayName,
      email: context.email,
      moderator: context.isModerator || false,
      features: request.features || {},
    });

  // Generate JWT token
  const jwtToken = generateJitsiToken(roomConfig, jitsiConfig);

  // Get max participants for plan
  const maxParticipants = getMaxParticipants(context.plan);

  return {
    roomId,
    jwtToken,
    jitsiDomain: jitsiConfig.domain,
    roomConfig: {
      subject: `${context.clerkOrgId} - ${request.sessionId}`,
      startWithAudioMuted: false,
      startWithVideoMuted: request.roomType === "voice",
      enableWelcomePage: false,
    },
  };
}

/**
 * Build room ID with org scoping pattern
 */
export function buildRoomId(
  clerkOrgId: string,
  sessionId: string,
  roomType: "voice" | "video"
): string {
  // Pattern: org:{orgId}:{type}:{sessionId}
  // Example: org:org_2abc123:video:research_session_1
  return `org:${clerkOrgId}:${roomType}:${sessionId}`;
}

/**
 * Parse room ID to extract components
 */
export function parseRoomId(roomId: string): {
  clerkOrgId: string;
  roomType: "voice" | "video";
  sessionId: string;
} | null {
  const match = roomId.match(/^org:([^:]+):(voice|video):(.+)$/);
  if (!match) return null;

  return {
    clerkOrgId: match[1],
    roomType: match[2] as "voice" | "video",
    sessionId: match[3],
  };
}

/**
 * Validate room access for user
 */
export function validateRoomAccess(
  roomId: string,
  clerkOrgId: string
): { allowed: boolean; reason?: string } {
  const parsed = parseRoomId(roomId);

  if (!parsed) {
    return { allowed: false, reason: "Invalid room ID format" };
  }

  if (parsed.clerkOrgId !== clerkOrgId) {
    return { allowed: false, reason: "Room belongs to different organization" };
  }

  return { allowed: true };
}
