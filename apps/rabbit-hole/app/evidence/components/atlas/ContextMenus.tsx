/**
 * Atlas Context Menu - Type Definitions & Utilities
 *
 * Legacy file - only contains type definitions and helper functions.
 * Actual context menu implementation is in app/context-menu/
 */

// Context menu types
export type ContextMenuType =
  | "node"
  | "edge"
  | "background"
  | "legend"
  | "none";

export interface ContextMenuState {
  isOpen: boolean;
  type: ContextMenuType;
  x: number;
  y: number;
  target?: any;
}

export interface ContextMenuActions {
  // Node actions
  onEditNode?: (nodeData: any) => void;
  onDeleteNode?: (nodeData: any) => void;
  onDuplicateNode?: (nodeData: any) => void;
  onExpandConnections?: (nodeData: any) => void;
  onCenterOnNode?: (nodeData: any) => void;
  onShowNodeDetails?: (nodeData: any) => void;
  onCreateRelationship?: (nodeData: any) => void;
  onMergeWithEntity?: (nodeData: any) => void;

  // Rabbit Hole Schema - New node actions
  onViewEgoNetwork?: (nodeData: any) => void;
  onViewTimeline?: (nodeData: any) => void;
  onViewEvidencePack?: (nodeData: any) => void;
  onOpenInResearchMode?: (nodeData: any) => void;

  // Edge actions
  onEditEdge?: (edgeData: any) => void;
  onDeleteEdge?: (edgeData: any) => void;
  onReverseEdge?: (edgeData: any) => void;
  onShowEdgeDetails?: (edgeData: any) => void;

  // Background actions
  onAddEntity?: (position: { x: number; y: number }) => void;
  onImportData?: () => void;
  onExportGraph?: () => void;
  onResetView?: () => void;
  onFitToScreen?: () => void;
  onToggleLayout?: () => void;
  onBulkImport?: () => void;
  onExportBundle?: () => void;
  onShowSettings?: () => void;

  // Legend actions
  onCreateLegend?: () => void;
  onEditLegend?: () => void;
  onDeleteLegend?: () => void;
}

// Helper function to determine context menu type from Cytoscape event
export const getContextMenuType = (
  event: any
): { type: ContextMenuType; target?: any } => {
  const target = event.target;

  if (target === event.cy) {
    // Right-clicked on background
    return { type: "background" };
  } else if (target.isNode && target.isNode()) {
    // Right-clicked on a node
    return { type: "node", target: target.data() };
  } else if (target.isEdge && target.isEdge()) {
    // Right-clicked on an edge
    return { type: "edge", target: target.data() };
  }

  return { type: "none" };
};
