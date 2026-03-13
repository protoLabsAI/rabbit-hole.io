"use client";

import { useState, useCallback } from "react";

interface EditEntityDialogState {
  isOpen: boolean;
  entityUid: string | null;
  entityType: string | null;
  initialData: Record<string, any> | null;
}

export function useEditEntityDialog() {
  const [state, setState] = useState<EditEntityDialogState>({
    isOpen: false,
    entityUid: null,
    entityType: null,
    initialData: null,
  });

  const open = useCallback(
    (
      entityUid: string,
      entityType: string,
      initialData: Record<string, any>
    ) => {
      setState({
        isOpen: true,
        entityUid,
        entityType,
        initialData,
      });
    },
    []
  );

  const close = useCallback(() => {
    setState({
      isOpen: false,
      entityUid: null,
      entityType: null,
      initialData: null,
    });
  }, []);

  return {
    ...state,
    open,
    close,
  };
}
