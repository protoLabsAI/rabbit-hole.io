/**
 * Generic Entity Dialog Hook
 *
 * Provides unified interface for managing entity-based dialogs.
 * Used as foundation for specific dialog hooks (family analysis, biographical analysis, etc.)
 */

import { useCallback, useMemo } from "react";

import { useUIStore } from "../../context/store/useUIStore";

// Stable default to prevent infinite loops
const DEFAULT_DIALOG_STATE = {
  isOpen: false,
  entityUid: "",
  entityName: "",
  metadata: {},
} as const;

/**
 * Generic hook for managing entity dialog state
 *
 * @param dialogType - Unique identifier for the dialog type
 * @returns Dialog state and control functions
 */
export function useEntityDialog(dialogType: string) {
  // Select only the specific dialog state we need
  const dialogState = useUIStore(
    useCallback(
      (s) => s.entityDialogs[dialogType] ?? DEFAULT_DIALOG_STATE,
      [dialogType]
    )
  );

  // Select actions individually to maintain stable references
  const openEntityDialog = useUIStore((s) => s.openEntityDialog);
  const closeEntityDialog = useUIStore((s) => s.closeEntityDialog);

  // Memoized open function
  const open = useCallback(
    (entityUid: string, entityName: string, metadata?: any) => {
      openEntityDialog(dialogType, entityUid, entityName, metadata);
    },
    [dialogType, openEntityDialog]
  );

  // Memoized close function
  const close = useCallback(() => {
    closeEntityDialog(dialogType);
  }, [dialogType, closeEntityDialog]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      isOpen: dialogState.isOpen,
      entityUid: dialogState.entityUid,
      entityName: dialogState.entityName,
      metadata: dialogState.metadata,
      open,
      close,
    }),
    [
      dialogState.isOpen,
      dialogState.entityUid,
      dialogState.entityName,
      dialogState.metadata,
      open,
      close,
    ]
  );
}
