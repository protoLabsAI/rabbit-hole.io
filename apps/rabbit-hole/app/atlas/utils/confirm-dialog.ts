/**
 * Cross-component confirmation dialog utility
 *
 * Replaces window.confirm() with a promise-based interface that can be
 * implemented by components like AtlasClient using a state-based dialog.
 *
 * Usage in a component:
 * 1. Create a callback: const handleConfirm = createConfirmHandler(setConfirmDialog);
 * 2. Use: const confirmed = await handleConfirm("Are you sure?");
 */

import type React from "react";

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function createConfirmHandler(
  setDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState>>
) {
  return (title: string, message?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        title,
        message: message || "",
        onConfirm: () => {
          setDialog((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setDialog((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  };
}
