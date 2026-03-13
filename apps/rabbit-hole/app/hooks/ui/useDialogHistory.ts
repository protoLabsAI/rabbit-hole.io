/**
 * Dialog History Hook
 *
 * Provides dialog navigation functionality allowing users to navigate
 * between previously opened dialogs using back/forward navigation.
 */

import { useCallback } from "react";

import { useUIStore } from "../../context/store/useUIStore";
import type { DialogHistoryItem } from "../../context/types";

/**
 * Hook for managing dialog history and navigation
 *
 * Enables users to:
 * - Navigate back to previously opened dialogs
 * - Navigate forward in dialog history
 * - Clear navigation history
 * - Jump to specific dialog in history
 */
export function useDialogHistory() {
  const items = useUIStore((s) => s.dialogHistory.items);
  const currentIndex = useUIStore((s) => s.dialogHistory.currentIndex);

  // Select actions individually to maintain stable references
  const popDialogHistory = useUIStore((s) => s.popDialogHistory);
  const goToHistoryItem = useUIStore((s) => s.goToHistoryItem);
  const clearDialogHistory = useUIStore((s) => s.clearDialogHistory);
  const pushDialogHistory = useUIStore((s) => s.pushDialogHistory);
  const openEntityMergeDialog = useUIStore((s) => s.openEntityMergeDialog);
  const openEntityDialog = useUIStore((s) => s.openEntityDialog);

  // Navigation state
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < items.length - 1;
  const currentItem =
    currentIndex >= 0 && currentIndex < items.length
      ? items[currentIndex]
      : null;

  // Helper to reopen dialogs from history - defined first for use in navigation callbacks
  const reopenDialogFromHistory = useCallback(
    (item: DialogHistoryItem) => {
      if (item.dialogType === "entityMerge" && item.sourceEntity) {
        openEntityMergeDialog(item.sourceEntity);
      } else if (item.entityUid && item.entityName) {
        openEntityDialog(
          item.dialogType,
          item.entityUid,
          item.entityName,
          {} // metadata
        );
      }
    },
    [openEntityMergeDialog, openEntityDialog]
  );

  // Navigation actions
  const goBack = useCallback(() => {
    if (canGoBack) {
      popDialogHistory();

      // Automatically reopen the previous dialog
      const previousItem = items[currentIndex - 1];
      if (previousItem) {
        reopenDialogFromHistory(previousItem);
      }
    }
  }, [
    canGoBack,
    currentIndex,
    items,
    popDialogHistory,
    reopenDialogFromHistory,
  ]);

  const goForward = useCallback(() => {
    if (canGoForward) {
      const nextIndex = currentIndex + 1;
      goToHistoryItem(nextIndex);

      // Automatically reopen the next dialog
      const nextItem = items[nextIndex];
      if (nextItem) {
        reopenDialogFromHistory(nextItem);
      }
    }
  }, [
    canGoForward,
    currentIndex,
    items,
    goToHistoryItem,
    reopenDialogFromHistory,
  ]);

  const goToItem = useCallback(
    (index: number) => {
      if (index >= 0 && index < items.length) {
        goToHistoryItem(index);

        // Automatically reopen the selected dialog
        const selectedItem = items[index];
        if (selectedItem) {
          reopenDialogFromHistory(selectedItem);
        }
      }
    },
    [items, goToHistoryItem, reopenDialogFromHistory]
  );

  const clearHistory = useCallback(() => {
    clearDialogHistory();
  }, [clearDialogHistory]);

  // Add current dialog to history
  const addToHistory = useCallback(
    (
      dialogType: string,
      title: string,
      entityUid?: string,
      entityName?: string,
      sourceEntity?: any
    ) => {
      pushDialogHistory({
        id: `${dialogType}-${entityUid || "new"}-${Date.now()}`,
        dialogType,
        title,
        entityUid,
        entityName,
        sourceEntity,
        timestamp: Date.now(),
      });
    },
    [pushDialogHistory]
  );

  return {
    // Navigation state
    items,
    currentIndex,
    currentItem,
    canGoBack,
    canGoForward,

    // Navigation actions
    goBack,
    goForward,
    goToItem,
    clearHistory,
    addToHistory,

    // Utility
    historyLength: items.length,
    isEmpty: items.length === 0,
  };
}
