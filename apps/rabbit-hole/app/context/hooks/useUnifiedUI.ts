"use client";

import { useUIStore, type UnifiedUIActions } from "../store/useUIStore";

/**
 * Hook to access the unified UI store
 * Provides all UI state management in one place
 */
export function useUnifiedUI() {
  return useUIStore();
}

/**
 * Hook to access UI state only
 * Useful when component only needs to read state
 *
 * WARNING: Returns a new object on every render. Only use this if:
 * 1. You need ALL state properties
 * 2. You're not using it in useCallback/useEffect dependencies
 *
 * For selective state access, use direct selectors:
 * const dialogs = useUIStore((s) => s.entityDialogs);
 */
export function useUIState() {
  return useUIStore((state) => ({
    entityDialogs: state.entityDialogs,
    entityMergeDialog: state.entityMergeDialog,
    confirmationDialogs: state.confirmationDialogs,
    overlays: state.overlays,
    notifications: state.notifications,
    contextMenu: state.contextMenu,
  }));
}

/**
 * Hook to access UI actions only
 * Useful when component only needs to dispatch actions
 *
 * WARNING: Returns a new object on every render. Only use this if:
 * 1. You need ALL actions
 * 2. You're not using it in useCallback/useEffect dependencies
 *
 * For individual actions, use direct selectors:
 * const openDialog = useUIStore((s) => s.openEntityDialog);
 */
export function useUIActions(): UnifiedUIActions {
  return useUIStore((state) => ({
    openEntityDialog: state.openEntityDialog,
    closeEntityDialog: state.closeEntityDialog,
    closeAllEntityDialogs: state.closeAllEntityDialogs,
    openEntityMergeDialog: state.openEntityMergeDialog,
    closeEntityMergeDialog: state.closeEntityMergeDialog,
    openMergeToNeo4jDialog: state.openMergeToNeo4jDialog,
    closeMergeToNeo4jDialog: state.closeMergeToNeo4jDialog,
    openConfirmationDialog: state.openConfirmationDialog,
    closeConfirmationDialog: state.closeConfirmationDialog,
    toggleSettingsPanel: state.toggleSettingsPanel,
    setSettingsPosition: state.setSettingsPosition,
    openContextMenu: state.openContextMenu,
    closeContextMenu: state.closeContextMenu,
    setContextMenuActions: state.setContextMenuActions,
    showToast: state.showToast,
    dismissToast: state.dismissToast,
    clearAllToasts: state.clearAllToasts,
    pushDialogHistory: state.pushDialogHistory,
    popDialogHistory: state.popDialogHistory,
    goToHistoryItem: state.goToHistoryItem,
    clearDialogHistory: state.clearDialogHistory,
  }));
}

/**
 * Hook to access specific dialogs
 *
 * WARNING: Returns a new object on every render. Only use this if:
 * 1. You need all dialog state + actions grouped
 * 2. You're not using it in useCallback/useEffect dependencies
 *
 * For individual access, use direct selectors:
 * const dialogs = useUIStore((s) => s.entityDialogs);
 * const openDialog = useUIStore((s) => s.openEntityDialog);
 */
export function useEntityDialogs() {
  return useUIStore((state) => ({
    dialogs: state.entityDialogs,
    openEntityDialog: state.openEntityDialog,
    closeEntityDialog: state.closeEntityDialog,
    closeAllEntityDialogs: state.closeAllEntityDialogs,
  }));
}

/**
 * Hook for context menu (replacement for useContextMenu from context-menu)
 *
 * NOTE: This hook returns a new object on every render.
 * It's wrapped in useMemo in the consuming useContextMenu hook,
 * but avoid using this directly in useCallback/useEffect dependencies.
 */
export function useUIContextMenu() {
  const contextMenu = useUIStore((state) => state.contextMenu);
  const openContextMenu = useUIStore((state) => state.openContextMenu);
  const closeContextMenu = useUIStore((state) => state.closeContextMenu);
  const setContextMenuActions = useUIStore(
    (state) => state.setContextMenuActions
  );

  return {
    contextMenu,
    openContextMenu,
    closeContextMenu,
    setActions: setContextMenuActions,
    actions: contextMenu.routeActions,
  };
}
