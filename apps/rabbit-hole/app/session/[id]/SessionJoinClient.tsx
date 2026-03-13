"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon } from "@proto/icon-system";
import type { SessionPreview, ParticipantRole } from "@proto/types";

interface SessionJoinClientProps {
  sessionId: string;
}

export default function SessionJoinClient({
  sessionId,
}: SessionJoinClientProps) {
  const { userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [preview, setPreview] = useState<SessionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!userId) return;

    async function fetchPreview() {
      try {
        const response = await fetch(
          `/api/collaboration/sessions/${sessionId}/preview`
        );

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Failed to load session");
        }

        const data = await response.json();
        setPreview(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load session");
      } finally {
        setLoading(false);
      }
    }

    fetchPreview();
  }, [userId, sessionId]);

  const handleJoin = async (role: ParticipantRole) => {
    setJoining(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/collaboration/sessions/${sessionId}/join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to join session");
      }

      // Redirect to session viewer
      router.push(`/session/${sessionId}/view`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
      setJoining(false);
    }
  };

  if (!userId) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Icon
            name="lock"
            size={48}
            className="mx-auto mb-4 text-muted-foreground"
          />
          <h1 className="text-2xl font-bold mb-2">Sign In Required</h1>
          <p className="text-muted-foreground">
            You must be signed in to join this collaboration session.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-lg font-medium">Loading session...</div>
        </div>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <Icon
            name="alert-triangle"
            size={48}
            className="mx-auto mb-4 text-destructive"
          />
          <h1 className="text-2xl font-bold mb-2">Session Unavailable</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-2xl w-full bg-card border rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <Icon name="users" size={64} className="mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold mb-2">
            Join Collaboration Session
          </h1>
          <p className="text-muted-foreground">
            {preview.session.ownerName} invited you to collaborate
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tab Name:</span>
            <span className="font-medium">{preview.session.tabName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Canvas Type:</span>
            <span className="font-medium capitalize">
              {preview.session.canvasType}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Participants:</span>
            <span className="font-medium">
              {preview.session.participantCount} active
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Expires:</span>
            <span className="font-medium">
              {new Date(preview.session.expiresAt).toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {preview.availableRoles.includes("editor") && (
            <button
              onClick={() => handleJoin("editor")}
              disabled={joining}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {joining ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <Icon name="edit" size={20} />
                  <span className="font-medium">Join as Editor</span>
                </>
              )}
            </button>
          )}

          {preview.availableRoles.includes("viewer") && (
            <button
              onClick={() => handleJoin("viewer")}
              disabled={joining}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {joining ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground"></div>
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <Icon name="eye" size={20} />
                  <span className="font-medium">Join as Viewer</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="mt-6 p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground">
          <Icon name="info" size={16} className="inline mr-2" />
          <span>
            As a guest, you won&apos;t have access to other tabs or local
            storage. Your changes sync in real-time with the host.
          </span>
        </div>
      </div>
    </div>
  );
}
