/**
 * @proto/collab - Voice/Video Collaboration Types
 *
 * Enterprise-tier voice/video communication built on Jitsi Meet.
 * Integrates with Clerk authentication and multi-tenancy.
 */

import { z } from "zod";

// ============================================================================
// Plan & Feature Gating
// ============================================================================

export const COLLABORATION_FEATURE_GATES = {
  voice: ["enterprise"],
  video: ["enterprise"],
  screenShare: ["enterprise"],
  recording: ["enterprise"],
} as const;

export type CollaborationFeature = keyof typeof COLLABORATION_FEATURE_GATES;
export type OrganizationPlan = "free" | "pro" | "enterprise";

// ============================================================================
// Room Configuration
// ============================================================================

export const CollaborationRoomConfigSchema = z.object({
  roomId: z.string().regex(/^org:[a-zA-Z0-9_]+:(voice|video):[a-zA-Z0-9_-]+$/),
  clerkOrgId: z.string().startsWith("org_"),
  clerkUserId: z.string().startsWith("user_"),
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  moderator: z.boolean().default(false),
  features: z
    .object({
      video: z.boolean().default(true),
      audio: z.boolean().default(true),
      screenShare: z.boolean().default(true),
      chat: z.boolean().default(true),
      recording: z.boolean().default(false),
    })
    .default({
      video: false,
      audio: false,
      screenShare: false,
      chat: false,
      recording: false,
    }),
});

export type CollaborationRoomConfig = z.infer<
  typeof CollaborationRoomConfigSchema
>;

// ============================================================================
// JWT Token Payload
// ============================================================================

export interface JitsiJWTPayload {
  // Standard JWT claims
  iss: string; // Issuer (your app ID)
  sub: string; // Subject (Jitsi server domain)
  aud: string; // Audience (app ID)
  room: string; // Room name
  exp: number; // Expiration timestamp

  // Jitsi-specific context
  context: {
    user: {
      id: string; // Clerk user ID
      name: string; // Display name
      email?: string; // Email address
      avatar?: string; // Avatar URL
    };
    group?: string; // Organization ID
    features?: {
      livestreaming?: boolean;
      recording?: boolean;
      transcription?: boolean;
    };
  };

  // Moderator permissions
  moderator?: boolean;
}

// ============================================================================
// Room State
// ============================================================================

export interface CollaborationParticipant {
  userId: string;
  clerkUserId: string;
  displayName: string;
  avatar?: string;
  isModerator: boolean;
  joinedAt: Date;
  features: {
    audioMuted: boolean;
    videoMuted: boolean;
    screenSharing: boolean;
  };
}

export interface CollaborationRoom {
  roomId: string;
  clerkOrgId: string;
  createdAt: Date;
  participants: CollaborationParticipant[];
  maxParticipants: number;
  recordingActive: boolean;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export const CreateRoomRequestSchema = z.object({
  sessionId: z.string(),
  roomType: z.enum(["voice", "video"]).default("video"),
  features: z
    .object({
      video: z.boolean().default(true),
      audio: z.boolean().default(true),
      screenShare: z.boolean().default(true),
      recording: z.boolean().default(false),
    })
    .optional(),
});

export type CreateRoomRequest = z.infer<typeof CreateRoomRequestSchema>;

export interface CreateRoomResponse {
  roomId: string;
  jwtToken: string;
  jitsiDomain: string;
  roomConfig: {
    subject: string;
    startWithAudioMuted: boolean;
    startWithVideoMuted: boolean;
    enableWelcomePage: boolean;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export class CollaborationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "CollaborationError";
  }
}

export class FeatureNotAvailableError extends CollaborationError {
  constructor(feature: CollaborationFeature, plan: OrganizationPlan) {
    super(
      `Feature '${feature}' is not available on ${plan} plan`,
      "FEATURE_NOT_AVAILABLE",
      403
    );
  }
}

export class RoomFullError extends CollaborationError {
  constructor(maxParticipants: number) {
    super(
      `Room is full (max ${maxParticipants} participants)`,
      "ROOM_FULL",
      429
    );
  }
}

// ============================================================================
// Configuration
// ============================================================================

export interface JitsiConfig {
  domain: string;
  appId: string;
  appSecret: string;
  jwtExpiration: number; // seconds
  maxParticipants: {
    free: number;
    pro: number;
    enterprise: number;
  };
}

export const DEFAULT_JITSI_CONFIG: Partial<JitsiConfig> = {
  jwtExpiration: 3600, // 1 hour
  maxParticipants: {
    free: 1,
    pro: 5,
    enterprise: 50,
  },
};
