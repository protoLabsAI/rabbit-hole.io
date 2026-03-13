"use client";

import { useState } from "react";

import { Icon } from "@proto/icon-system";
import { Button } from "@proto/ui/atoms";
import { useToast } from "@proto/ui/hooks";

interface GuestSessionHeaderProps {
  sessionId: string;
  role: "guest" | "viewer";
  participantCount: number;
  canSaveToWorkspace: boolean;
  onSave?: () => Promise<void>;
  onLeave: () => Promise<void>;
}

export function GuestSessionHeader({
  sessionId,
  role,
  participantCount,
  canSaveToWorkspace,
  onSave,
  onLeave,
}: GuestSessionHeaderProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const handleSave = async () => {
    if (!onSave) return;

    setSaving(true);
    try {
      await onSave();
      toast({
        title: "Saved",
        description: "Session saved to your workspace",
      });
    } catch (err) {
      toast({
        title: "Save Failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await onLeave();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      setLeaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
      <div className="flex items-center gap-3">
        <Icon name="users" size={20} className="text-primary" />
        <div>
          <div className="font-medium text-sm">
            Collaboration Session ({role === "viewer" ? "Viewer" : "Editor"})
          </div>
          <div className="text-xs text-muted-foreground">
            {participantCount} participant{participantCount !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Save to Workspace (if allowed) */}
        {canSaveToWorkspace && onSave && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
          >
            <Icon name="save" size={16} />
            {saving ? "Saving..." : "Save to My Workspace"}
          </Button>
        )}

        {/* Leave Session */}
        <Button
          variant="destructive"
          size="sm"
          onClick={handleLeave}
          disabled={leaving}
          className="gap-2"
        >
          <Icon name="log-out" size={16} />
          {leaving ? "Leaving..." : "Leave"}
        </Button>
      </div>
    </div>
  );
}
