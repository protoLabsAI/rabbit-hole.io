/**
 * Specialized Dialog Hooks
 *
 * Provides convenient, typed interfaces for specific dialog types.
 * Built on top of the generic useEntityDialog hook.
 */

import { useCallback } from "react";

import { useUIStore } from "../../context/store/useUIStore";
import type { Entity } from "../../context/types";

import { useDialogHistory } from "./useDialogHistory";
import { useEntityDialog } from "./useEntityDialog";

/**
 * Hook for managing family analysis dialog with history tracking
 */
export function useFamilyAnalysisDialog() {
  const baseDialog = useEntityDialog("familyAnalysis");
  const { addToHistory } = useDialogHistory();

  // Destructure to get stable references - baseDialog itself is a new object every render
  const { open: baseOpen, ...rest } = baseDialog;

  const openWithHistory = useCallback(
    (entityUid: string, entityName: string, metadata?: any) => {
      baseOpen(entityUid, entityName, metadata);
      addToHistory(
        "familyAnalysis",
        `Family Analysis: ${entityName}`,
        entityUid,
        entityName
      );
    },
    [baseOpen, addToHistory]
  );

  return {
    ...rest,
    open: openWithHistory,
  };
}

/**
 * Hook for managing biographical analysis dialog with history tracking
 */
export function useBiographicalAnalysisDialog() {
  const baseDialog = useEntityDialog("biographicalAnalysis");
  const { addToHistory } = useDialogHistory();

  const { open: baseOpen, ...rest } = baseDialog;

  const openWithHistory = useCallback(
    (entityUid: string, entityName: string, metadata?: any) => {
      baseOpen(entityUid, entityName, metadata);
      addToHistory(
        "biographicalAnalysis",
        `Biographical Analysis: ${entityName}`,
        entityUid,
        entityName
      );
    },
    [baseOpen, addToHistory]
  );

  return {
    ...rest,
    open: openWithHistory,
  };
}

/**
 * Hook for managing research report dialog with history tracking
 */
export function useResearchReportDialog() {
  const baseDialog = useEntityDialog("researchReport");
  const { addToHistory } = useDialogHistory();

  const { open: baseOpen, ...rest } = baseDialog;

  const openWithHistory = useCallback(
    (entityUid: string, entityName: string, metadata?: any) => {
      baseOpen(entityUid, entityName, metadata);
      addToHistory(
        "researchReport",
        `Research Report: ${entityName}`,
        entityUid,
        entityName
      );
    },
    [baseOpen, addToHistory]
  );

  return {
    ...rest,
    open: openWithHistory,
  };
}

/**
 * Hook for managing entity merge dialog with history tracking
 * Special case that needs full entity object, not just uid/name
 */
export function useEntityMergeDialog() {
  const isOpen = useUIStore((s) => s.entityMergeDialog.isOpen);
  const sourceEntity = useUIStore((s) => s.entityMergeDialog.sourceEntity);
  const openEntityMergeDialog = useUIStore((s) => s.openEntityMergeDialog);
  const closeEntityMergeDialog = useUIStore((s) => s.closeEntityMergeDialog);
  const { addToHistory } = useDialogHistory();

  // Memoized open function with history tracking
  const openWithHistory = useCallback(
    (sourceEntity: Entity) => {
      openEntityMergeDialog(sourceEntity);
      addToHistory(
        "entityMerge",
        `Merge Entity: ${sourceEntity.name}`,
        sourceEntity.uid,
        sourceEntity.name,
        sourceEntity
      );
    },
    [openEntityMergeDialog, addToHistory]
  );

  // Memoized close function
  const close = useCallback(() => {
    closeEntityMergeDialog();
  }, [closeEntityMergeDialog]);

  return {
    isOpen,
    sourceEntity,
    open: openWithHistory,
    close,
  };
}
