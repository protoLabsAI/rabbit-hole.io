/**
 * Collaboration Panel
 *
 * Voice/video panel for research workspace.
 * Enterprise-tier feature with plan gating.
 */

"use client";

import { useState } from "react";

import { JitsiMeet, useCollaboration } from "@proto/collab/client";
import { Icon } from "@proto/icon-system";

interface CollaborationPanelProps {
  sessionId: string;
  defaultMode?: "voice" | "video";
  className?: string;
}

export function CollaborationPanel({
  sessionId,
  defaultMode = "video",
  className,
}: CollaborationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [roomType, setRoomType] = useState<"voice" | "video">(defaultMode);

  const {
    roomConfig,
    loading,
    error,
    participants,
    handleParticipantJoined,
    handleParticipantLeft,
  } = useCollaboration({
    sessionId,
    roomType,
    enabled: isOpen,
  });

  // Closed state - button only
  if (!isOpen) {
    return (
      <div className={className}>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-lg"
          title="Start voice/video collaboration"
        >
          <Icon name="message-square" size={16} />
          <span className="text-sm font-medium">Start Collaboration</span>
        </button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={`bg-card border rounded-lg p-4 shadow-xl ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Loading collaboration...</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Error state (likely plan restriction)
  if (error) {
    return (
      <div className={`bg-card border rounded-lg p-4 shadow-xl ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Collaboration Unavailable</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              Voice and video collaboration requires an Enterprise plan.
            </p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
          <a
            href="/pricing"
            className="block w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-center text-sm font-medium"
          >
            Upgrade to Enterprise
          </a>
        </div>
      </div>
    );
  }

  // Active collaboration
  if (!roomConfig) return null;

  return (
    <div
      className={`bg-card border rounded-lg shadow-xl overflow-hidden transition-all ${
        isExpanded ? "fixed inset-4 z-50" : "relative"
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-card/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {roomType === "video" ? (
            <Icon name="message-square" size={16} className="text-primary" />
          ) : (
            <Icon name="message-circle" size={16} className="text-primary" />
          )}
          <div>
            <h3 className="text-sm font-semibold">
              {roomType === "video" ? "Video" : "Voice"} Collaboration
            </h3>
            <p className="text-xs text-muted-foreground">
              {participants.length + 1} participant
              {participants.length !== 0 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle voice/video mode */}
          <button
            onClick={() =>
              setRoomType(roomType === "video" ? "voice" : "video")
            }
            className="p-1.5 hover:bg-muted rounded transition-colors"
            title={`Switch to ${roomType === "video" ? "voice" : "video"} mode`}
          >
            {roomType === "video" ? (
              <Icon name="message-circle" size={16} />
            ) : (
              <Icon name="message-square" size={16} />
            )}
          </button>

          {/* Expand/collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-muted rounded transition-colors"
            title={isExpanded ? "Minimize" : "Maximize"}
          >
            {isExpanded ? (
              <Icon name="minimize" size={16} />
            ) : (
              <Icon name="maximize" size={16} />
            )}
          </button>

          {/* Close */}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-muted rounded transition-colors"
            title="Leave room"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      </div>

      {/* Jitsi Meet Embed */}
      <div className={isExpanded ? "h-[calc(100%-60px)]" : "h-[400px]"}>
        <JitsiMeet
          roomConfig={roomConfig}
          width="100%"
          height="100%"
          onReady={() => console.log("✅ Joined collaboration room")}
          onParticipantJoined={handleParticipantJoined}
          onParticipantLeft={handleParticipantLeft}
          onVideoConferenceLeft={() => {
            console.log("Left collaboration room");
            setIsOpen(false);
          }}
        />
      </div>
    </div>
  );
}
