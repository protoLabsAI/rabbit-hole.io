/**
 * Research Import Dialog Hook
 *
 * Manages state for the Atlas → Research Mode import configuration dialog.
 * Follows the pattern established by useEntityDialog.
 */

import { useState, useCallback } from "react";

interface ResearchImportDialogState {
  isOpen: boolean;
  nodeData: any | null;
  entityUid: string | null;
  entityName: string | null;
}

export function useResearchImportDialog() {
  const [state, setState] = useState<ResearchImportDialogState>({
    isOpen: false,
    nodeData: null,
    entityUid: null,
    entityName: null,
  });

  const open = useCallback((nodeData: any) => {
    setState({
      isOpen: true,
      nodeData,
      entityUid: nodeData.uid || nodeData.id,
      entityName: nodeData.name || nodeData.label,
    });
  }, []);

  const close = useCallback(() => {
    setState({
      isOpen: false,
      nodeData: null,
      entityUid: null,
      entityName: null,
    });
  }, []);

  return {
    isOpen: state.isOpen,
    nodeData: state.nodeData,
    entityUid: state.entityUid,
    entityName: state.entityName,
    open,
    close,
  };
}
