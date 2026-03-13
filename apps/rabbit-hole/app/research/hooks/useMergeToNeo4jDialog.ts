"use client";

import { useCallback } from "react";

import { useUIStore } from "../../context/store/useUIStore";
import type { ResearchBundle } from "../lib/bundle-validator";

export function useMergeToNeo4jDialog() {
  const mergeDialog = useUIStore((s) => s.mergeToNeo4jDialog);
  const openMergeToNeo4jDialog = useUIStore((s) => s.openMergeToNeo4jDialog);
  const closeMergeToNeo4jDialog = useUIStore((s) => s.closeMergeToNeo4jDialog);

  const open = useCallback(
    (bundle: ResearchBundle) => {
      openMergeToNeo4jDialog(bundle);
    },
    [openMergeToNeo4jDialog]
  );

  const close = useCallback(() => {
    closeMergeToNeo4jDialog();
  }, [closeMergeToNeo4jDialog]);

  return {
    isOpen: mergeDialog?.isOpen ?? false,
    bundle: mergeDialog?.bundle,
    open,
    close,
  };
}
