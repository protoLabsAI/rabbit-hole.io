/**
 * JWT Token Generation for Jitsi Meet
 *
 * Generates signed JWT tokens for Jitsi authentication using Clerk user context.
 */

import jwt from "jsonwebtoken";

import type {
  JitsiJWTPayload,
  CollaborationRoomConfig,
  JitsiConfig,
} from "../types";
import { DEFAULT_JITSI_CONFIG } from "../types";

/**
 * Generate a Jitsi JWT token for room access
 */
export function generateJitsiToken(
  config: CollaborationRoomConfig,
  jitsiConfig: JitsiConfig
): string {
  const now = Math.floor(Date.now() / 1000);

  const payload: JitsiJWTPayload = {
    // Standard JWT claims
    iss: jitsiConfig.appId,
    sub: jitsiConfig.domain,
    aud: jitsiConfig.appId,
    room: config.roomId,
    exp:
      now + (jitsiConfig.jwtExpiration || DEFAULT_JITSI_CONFIG.jwtExpiration!),

    // Jitsi context
    context: {
      user: {
        id: config.clerkUserId,
        name: config.displayName || "Anonymous",
        email: config.email,
      },
      group: config.clerkOrgId,
      features: {
        recording: config.features.recording || false,
        livestreaming: false,
        transcription: false,
      },
    },

    // Moderator flag
    moderator: config.moderator,
  };

  return jwt.sign(payload, jitsiConfig.appSecret, {
    algorithm: "HS256",
  });
}

/**
 * Verify a Jitsi JWT token
 */
export function verifyJitsiToken(
  token: string,
  jitsiConfig: JitsiConfig
): JitsiJWTPayload {
  try {
    return jwt.verify(token, jitsiConfig.appSecret, {
      algorithms: ["HS256"],
      issuer: jitsiConfig.appId,
      audience: jitsiConfig.appId,
    }) as JitsiJWTPayload;
  } catch (error) {
    throw new Error(
      `Invalid Jitsi token: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Extract room ID from JWT token
 */
export function extractRoomFromToken(token: string): string | null {
  try {
    const decoded = jwt.decode(token) as JitsiJWTPayload | null;
    return decoded?.room || null;
  } catch {
    return null;
  }
}
