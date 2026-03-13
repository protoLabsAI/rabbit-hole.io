"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@proto/icon-system";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
} from "@proto/ui/atoms";
import { useToast } from "@proto/ui/hooks";

interface SessionLinkModalProps {
  open: boolean;
  shareLink: string;
  sessionId: string;
  onClose: () => void;
}

export function SessionLinkModal({
  open,
  shareLink,
  sessionId,
  onClose,
}: SessionLinkModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);

      // Clear existing timeout if user copies again
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setCopied(true);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);

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

  if (!shareLink) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Collaboration Session Active</DialogTitle>
          <DialogDescription>
            Share this link with collaborators to invite them
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Share Link */}
          <div className="space-y-2">
            <label htmlFor="share-link-input" className="text-sm font-medium">
              Share Link
            </label>
            <div className="flex gap-2">
              <input
                id="share-link-input"
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono border focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button onClick={handleCopy} size="sm" variant="default">
                <Icon name={copied ? "Check" : "Copy"} size={16} />
                <span className="ml-2">{copied ? "Copied!" : "Copy"}</span>
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex gap-3">
              <Icon
                name="Info"
                size={16}
                className="text-primary mt-0.5 flex-shrink-0"
              />
              <div className="space-y-1">
                <p className="text-sm font-medium">Guest Access</p>
                <p className="text-sm text-muted-foreground">
                  Guests can view and edit this session. Real-time sync is
                  active.
                </p>
              </div>
            </div>
          </div>

          {/* Session ID */}
          <div className="text-xs text-muted-foreground">
            Session ID: {sessionId}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} variant="default">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
