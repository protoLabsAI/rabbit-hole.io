"use client";

import { useState, useMemo } from "react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@proto/ui/atoms";
import { DiffView, calculateDiff } from "@proto/ui/organisms";

interface DiffConfirmationDialogProps {
  isOpen: boolean;
  entityType: string;
  oldData: Record<string, any>;
  newData: Record<string, any>;
  onBack: () => void;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function DiffConfirmationDialog({
  isOpen,
  entityType,
  oldData,
  newData,
  onBack,
  onConfirm,
  onClose,
}: DiffConfirmationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoize diff calculation to avoid recomputing on every render
  const diffs = useMemo(
    () => calculateDiff(oldData, newData),
    [oldData, newData]
  );
  const hasChanges = useMemo(
    () => diffs.some((d) => d.type !== "unchanged"),
    [diffs]
  );

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error("Failed to confirm changes:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Changes to {entityType}</DialogTitle>
          <DialogDescription>
            Review the changes below before saving. You can go back to edit or
            confirm to apply these changes.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4">
          <DiffView diffs={diffs} title="Proposed Changes" />
        </div>

        {!hasChanges && (
          <div className="rounded-md border border-info/30 bg-info/10 p-3">
            <p className="text-sm text-info-foreground">
              No changes detected. The entity will remain unchanged.
            </p>
          </div>
        )}

        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
            Back to Edit
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting || !hasChanges}
            >
              {isSubmitting ? "Saving..." : "Confirm Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
