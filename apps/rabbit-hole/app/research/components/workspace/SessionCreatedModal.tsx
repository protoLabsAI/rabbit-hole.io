"use client";

import { useState } from "react";

import { Icon } from "@protolabsai/icon-system";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@protolabsai/ui/atoms";
import { useToast } from "@protolabsai/ui/hooks";

interface SessionCreatedModalProps {
  open: boolean;
  sessionId: string;
  shareLink: string;
  expiresAt: number;
  onClose: () => void;
  onEndSession?: () => void;
}

export function SessionCreatedModal({
  open,
  sessionId,
  shareLink,
  expiresAt,
  onClose,
  onEndSession,
}: SessionCreatedModalProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      toast({
        title: "Link copied",
        description: "Share this link with collaborators",
      });
    } catch (err) {
      console.error("Failed to copy:", err);
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const handleEndSession = async () => {
    if (!onEndSession) return;

    try {
      await onEndSession();
      onClose();
      toast({
        title: "Session ended",
        description: "All guests have been disconnected",
      });
    } catch (err) {
      toast({
        title: "Failed to end session",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const expiresIn = Math.floor((expiresAt - Date.now()) / 1000 / 60);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Collaboration Session Active</DialogTitle>
          <DialogDescription>Expires in {expiresIn} minutes</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Share Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono border-0 focus:outline-none"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button onClick={handleCopy} size="sm" variant="default">
                <Icon name={copied ? "check" : "copy"} size={16} />
                <span className="ml-2">{copied ? "Copied!" : "Copy"}</span>
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex gap-3">
              <Icon
                name="info"
                size={16}
                className="text-primary mt-0.5 flex-shrink-0"
              />
              <div className="space-y-1">
                <p className="text-sm font-medium">Guest Access</p>
                <p className="text-sm text-muted-foreground">
                  Guests can only see and edit this tab. They won&apos;t have
                  access to your other tabs or local storage.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 sm:flex-none"
          >
            Continue Working
          </Button>
          {onEndSession && (
            <Button
              onClick={handleEndSession}
              variant="destructive"
              className="flex-1 sm:flex-none"
            >
              <Icon name="x-circle" size={16} />
              <span className="ml-2">End Session</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
