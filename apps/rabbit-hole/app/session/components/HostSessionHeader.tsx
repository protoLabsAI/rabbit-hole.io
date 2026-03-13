"use client";

import { useState } from "react";

import { Icon } from "@proto/icon-system";
import { Button } from "@proto/ui/atoms";
import { useToast } from "@proto/ui/hooks";

interface HostSessionHeaderProps {
  sessionId: string;
  shareLink: string;
  participantCount: number;
  onSave: () => Promise<void>;
  onEnd: () => Promise<void>;
}

export function HostSessionHeader({
  sessionId,
  shareLink,
  participantCount,
  onSave,
  onEnd,
}: HostSessionHeaderProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [ending, setEnding] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast({
      title: "Link Copied",
      description: "Share this link with collaborators",
    });
  };

  const handleSave = async () => {
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

  const handleEnd = async () => {
    setEnding(true);
    try {
      await onEnd();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      setEnding(false);
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
      <div className="flex items-center gap-3">
        <Icon name="users" size={20} className="text-primary" />
        <div>
          <div className="font-medium text-sm">
            Collaboration Session (Host)
          </div>
          <div className="text-xs text-muted-foreground">
            {participantCount} participant{participantCount !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Share Link */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="gap-2"
        >
          <Icon name="link" size={16} />
          Copy Link
        </Button>

        {/* Save to Workspace */}
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="gap-2"
        >
          <Icon name="save" size={16} />
          {saving ? "Saving..." : "Save to Workspace"}
        </Button>

        {/* End Session */}
        <Button
          variant="destructive"
          size="sm"
          onClick={handleEnd}
          disabled={ending}
          className="gap-2"
        >
          <Icon name="x" size={16} />
          {ending ? "Ending..." : "End Session"}
        </Button>
      </div>
    </div>
  );
}
