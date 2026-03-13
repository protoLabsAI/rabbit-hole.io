/**
 * React Hook for Collaboration
 *
 * Fetch room configuration and manage collaboration state.
 */

"use client";

import { useState, useEffect } from "react";

import type { CreateRoomResponse } from "../types";

export interface UseCollaborationOptions {
  sessionId: string;
  roomType?: "voice" | "video";
  enabled?: boolean;
}

export function useCollaboration({
  sessionId,
  roomType = "video",
  enabled = true,
}: UseCollaborationOptions) {
  const [roomConfig, setRoomConfig] = useState<CreateRoomResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    const fetchRoomConfig = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/collaboration/room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, roomType }),
        });

        if (!response.ok) {
          const error = (await response.json()) as { message?: string };
          throw new Error(error.message || "Failed to create room");
        }

        const config = (await response.json()) as CreateRoomResponse;
        setRoomConfig(config);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        console.error("Failed to fetch collaboration room:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoomConfig();
  }, [sessionId, roomType, enabled]);

  const handleParticipantJoined = (participant: any) => {
    setParticipants((prev) => [...prev, participant]);
  };

  const handleParticipantLeft = (participant: any) => {
    setParticipants((prev) => prev.filter((p) => p.id !== participant.id));
  };

  return {
    roomConfig,
    loading,
    error,
    participants,
    handleParticipantJoined,
    handleParticipantLeft,
  };
}
