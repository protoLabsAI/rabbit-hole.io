/**
 * Sessions Management Tab
 *
 * Dashboard panel for managing collaboration sessions.
 * Allows users to view, monitor, and cleanup their active sessions.
 */

"use client";

import { useEffect, useState } from "react";

import { Icon } from "@proto/icon-system";
import { Button, Card } from "@proto/ui/atoms";
import { useToast } from "@proto/ui/hooks";
import { ConfirmPopover } from "@proto/ui/organisms";

interface Session {
  id: string;
  tabId: string;
  roomId: string;
  status: string;
  createdAt: number;
  expiresAt: number;
  isExpired: boolean;
  minutesRemaining: number;
}

export function SessionsManagementTab() {
  const userId = "local-user";
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleanupExpiredLoading, setCleanupExpiredLoading] = useState(false);
  const [cleanupAllLoading, setCleanupAllLoading] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/collaboration/sessions/my-sessions");
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
      toast({
        title: "Error",
        description: "Failed to fetch sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cleanupExpired = async () => {
    setCleanupExpiredLoading(true);
    try {
      const res = await fetch(
        "/api/collaboration/sessions/my-sessions?mode=expired",
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      toast({
        title: "Cleanup Complete",
        description: data.message,
      });
      fetchSessions();
    } catch (err) {
      toast({
        title: "Cleanup Failed",
        description: "Failed to clean up expired sessions",
        variant: "destructive",
      });
    } finally {
      setCleanupExpiredLoading(false);
    }
  };

  const cleanupAll = async () => {
    setCleanupAllLoading(true);
    try {
      const res = await fetch(
        "/api/collaboration/sessions/my-sessions?mode=all",
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      toast({
        title: "Sessions Ended",
        description: data.message,
      });
      fetchSessions();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to end sessions",
        variant: "destructive",
      });
    } finally {
      setCleanupAllLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchSessions();
    }
  }, [userId]);

  if (!userId) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">Please sign in to view sessions</p>
      </div>
    );
  }

  const activeSessions = sessions.filter((s) => s.status === "active");
  const expiredSessions = activeSessions.filter((s) => s.isExpired);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-card-foreground">
            Collaboration Sessions
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage your active collaboration sessions
          </p>
        </div>
        <Button onClick={fetchSessions} variant="outline" disabled={loading}>
          <Icon name="refresh-cw" size={16} />
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-2xl font-bold">{sessions.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-bold text-green-600">
            {activeSessions.length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Expired</div>
          <div className="text-2xl font-bold text-red-600">
            {expiredSessions.length}
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <ConfirmPopover
          trigger={
            <Button variant="outline" disabled={expiredSessions.length === 0}>
              <Icon name="trash-2" size={16} />
              <span className="ml-2">
                Clean Expired ({expiredSessions.length})
              </span>
            </Button>
          }
          title="Clean up expired sessions?"
          description="This will permanently delete all expired sessions."
          confirmText="Clean Up"
          cancelText="Cancel"
          onConfirm={cleanupExpired}
        />
        <ConfirmPopover
          trigger={
            <Button
              variant="destructive"
              disabled={activeSessions.length === 0}
            >
              <Icon name="x-circle" size={16} />
              <span className="ml-2">
                End All Active ({activeSessions.length})
              </span>
            </Button>
          }
          title="End all active sessions?"
          description="This will disconnect all active guests and end their sessions. They will lose any unsaved work."
          confirmText="End All"
          cancelText="Cancel"
          variant="destructive"
          onConfirm={cleanupAll}
        />
      </div>

      {/* Session List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Icon name="inbox" size={48} className="mx-auto mb-4 opacity-20" />
            <p>No sessions found</p>
          </div>
        ) : (
          sessions.map((session) => (
            <Card key={session.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {session.id.slice(0, 8)}
                    </code>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        session.status === "active"
                          ? session.isExpired
                            ? "bg-red-500/10 text-red-600"
                            : "bg-green-500/10 text-green-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {session.status === "active"
                        ? session.isExpired
                          ? "EXPIRED"
                          : "ACTIVE"
                        : "ENDED"}
                    </span>
                  </div>
                  <div className="text-sm">
                    <strong>Tab:</strong> {session.tabId}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <strong>Room:</strong> {session.roomId}
                  </div>
                  {session.status === "active" && !session.isExpired && (
                    <div className="text-xs text-muted-foreground">
                      Expires in {session.minutesRemaining} minutes
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(session.createdAt).toLocaleString()}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
