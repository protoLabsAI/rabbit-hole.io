/**
 * Research Page Context Menu Actions
 *
 * Type-safe action interface for research page context menus
 */

export interface ResearchMenuActions {
  // Node actions
  onShowNodeDetails?: (nodeData: any) => void;
  onEditNode?: (nodeData: any) => void;
  onResearchEntity?: (nodeData: any) => void;
  onDeleteNode?: (nodeData: any) => void;
  onCreateRelationship?: (nodeData: any) => void;
  onCenterOnNode?: (nodeData: any) => void;

  // Edge actions
  onShowEdgeDetails?: (edgeData: any) => void;
  onEditEdge?: (edgeData: any) => void;
  onDeleteEdge?: (edgeData: any) => void;
  onReverseEdge?: (edgeData: any) => void;

  // Background actions
  onAddEntity?: (context?: any) => void;
  onOpenResearchWizard?: () => void;
  onFilterEntityTypes?: () => void;
  onSaveSession?: () => void;
  onLoadSession?: () => void;
  onExportBundle?: () => void;
  onBulkImport?: () => void;
  onExtractFromFile?: () => void;
  onMergeToNeo4j?: () => void;
  onImportData?: () => void;
  onResetView?: () => void;
  onFitToScreen?: () => void;
  onToggleLayout?: () => void;
  onShowSettings?: () => void;
  onExportGraph?: () => void;
  onResetGraph?: () => void;
}
