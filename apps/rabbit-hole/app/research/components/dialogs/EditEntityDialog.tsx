"use client";

import { useState, useTransition } from "react";

import { EntityForm } from "@proto/forms";
import type { EntityType } from "@proto/forms";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@proto/ui/atoms";

import { DiffConfirmationDialog } from "./DiffConfirmationDialog";

// Remove system fields that shouldn't appear in diff
function normalizeForDiff(data: Record<string, any>): Record<string, any> {
  const { uid, type, ...editableFields } = data;
  return editableFields;
}

// Ensure all fields have default values to prevent controlled/uncontrolled switching
function ensureDefaultValues(data: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) {
      // Provide empty defaults based on likely type
      if (key === "tags" || key === "aliases") {
        normalized[key] = [];
      } else {
        normalized[key] = "";
      }
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}

interface EditEntityDialogProps {
  isOpen: boolean;
  entityUid: string;
  entityType: EntityType;
  initialData: Record<string, any>;
  onClose: () => void;
  onUpdate: (updatedData: any) => Promise<void>;
}

export function EditEntityDialog({
  isOpen,
  entityUid,
  entityType,
  initialData,
  onClose,
  onUpdate,
}: EditEntityDialogProps) {
  // React 19: useTransition for non-urgent UI transitions (diff dialog)
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiffDialog, setShowDiffDialog] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);

  const handleFormSubmit = async (formData: any) => {
    console.log("📝 Form submitted with data:", formData);
    console.log("📊 Initial data:", initialData);

    // React 19: Mark diff dialog as non-urgent transition
    // Input stays responsive, diff calculation can be interrupted if user edits again
    startTransition(() => {
      setPendingData(formData);
      setShowDiffDialog(true);
    });
  };

  const handleConfirmChanges = async () => {
    if (!pendingData) return;

    setIsSubmitting(true);
    try {
      await onUpdate(pendingData);

      // React 19: Automatic batching - all state updates batched in one render
      setShowDiffDialog(false);
      setIsSubmitting(false);
      onClose();
    } catch (error) {
      console.error("Failed to update entity:", error);
      setIsSubmitting(false);
      // Keep dialog open on error so user can retry
    }
  };

  const handleBackToEdit = () => {
    // React 19: Mark as non-urgent transition
    startTransition(() => {
      setShowDiffDialog(false);
    });
    // Keep pendingData so form retains edits
  };

  const handleCloseAll = () => {
    // React 19: Automatic batching - all updates in single re-render
    setShowDiffDialog(false);
    setPendingData(null);
    onClose();
  };

  return (
    <>
      <Dialog
        open={isOpen && !showDiffDialog}
        onOpenChange={(open) => !open && onClose()}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {entityType}</DialogTitle>
            <DialogDescription>
              {isPending
                ? "Preparing diff view..."
                : "Update entity properties and metadata"}
            </DialogDescription>
          </DialogHeader>

          <EntityForm
            entityType={entityType}
            initialData={{
              uid: entityUid,
              ...ensureDefaultValues(pendingData || initialData),
            }}
            mode="edit"
            onSubmit={handleFormSubmit}
            onCancel={onClose}
            isLoading={isSubmitting}
            blacklistFields={["uid", "type"]}
          />
        </DialogContent>
      </Dialog>

      <DiffConfirmationDialog
        isOpen={showDiffDialog}
        entityType={entityType}
        oldData={normalizeForDiff(initialData)}
        newData={normalizeForDiff(pendingData || {})}
        onBack={handleBackToEdit}
        onConfirm={handleConfirmChanges}
        onClose={handleCloseAll}
      />
    </>
  );
}
