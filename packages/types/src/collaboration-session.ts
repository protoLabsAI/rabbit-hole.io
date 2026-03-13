/**
 * Collaboration Session Types
 *
 * Live Share model for real-time collaboration
 */

export type SessionStatus = "active" | "ended" | "merged";
export type SessionVisibility = "edit" | "view" | "hidden";
export type ParticipantRole = "editor" | "viewer";
export type ActivityType = "join" | "edit" | "view" | "leave";

export interface CollaborationSession {
  id: string; // UUID
  ownerId: string;
  ownerWorkspaceId: string;
  tabId?: string; // Specific tab for per-tab collaboration
  roomId: string; // session:{uuid}
  clerkOrgId?: string | null; // Organization ID (Team+ tiers)

  // Lifecycle
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  status: SessionStatus;

  // Visibility
  visibility: SessionVisibility;

  // State tracking
  hasUnmergedChanges: boolean;
  mergedAt?: number;
}

export interface SessionParticipant {
  sessionId: string;
  userId: string;
  userName?: string;
  role: ParticipantRole;
  joinedAt: number;
  lastSeenAt: number;
}

export interface SessionActivity {
  id?: number;
  sessionId: string;
  userId: string;
  activityType: ActivityType;
  timestamp: number;
}

// API request/response types
export interface CreateSessionRequest {
  workspaceId: string;
  visibility?: SessionVisibility;
}

export interface CreateSessionResponse {
  session: CollaborationSession;
  shareLink: string;
}

export interface JoinSessionResponse {
  session: CollaborationSession;
  role: ParticipantRole;
  participants: SessionParticipant[];
}

export interface SessionWithParticipants extends CollaborationSession {
  participants: SessionParticipant[];
}

export interface SessionInvitation {
  id: string;
  sessionId: string;
  inviterId: string;
  inviteeId?: string;
  inviteeEmail?: string;
  role: ParticipantRole;
  status: "pending" | "accepted" | "revoked";
  createdAt: number;
  expiresAt: number;
}

export interface SessionPreview {
  session: {
    id: string;
    tabName: string;
    canvasType: string;
    ownerName: string;
    participantCount: number;
    expiresAt: number;
  };
  canJoin: boolean;
  availableRoles: ParticipantRole[];
}
