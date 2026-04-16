"use client";

/**
 * Graph Canvas - Integrated with ResearchGraphDB
 *
 * Full-featured graph editor with toolbar, palette, filters, and settings.
 * Maintains complete feature parity with original research page.
 *
 * Data Flow: Graphology (in-memory) ↔ React Flow (render) ↔ Yjs (persistence)
 * See: app/research/REACT_FLOW_DATA_FLOW.md for complete sequence diagram
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";

import type { UserTier } from "@protolabsai/auth/client";
import { getEntityTypesByDomain } from "@protolabsai/forms";
// DISABLED: Drawing tools - Coming Soon
// import { InspectorPanel, type ToolType } from "@protolabsai/freehand-drawing";
import { Icon } from "@protolabsai/icon-system";
import { logUserAction } from "@protolabsai/logger";
import type { PartialBundle, RabbitHoleBundleData } from "@protolabsai/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "@protolabsai/ui/atoms";
import { useToast } from "@protolabsai/ui/hooks";
import type { VersionMetadata } from "@protolabsai/yjs-history";

import { useContextMenu } from "@/context-menu";
import type { GraphNodeAttributes } from "@/graph-visualizer/model/graph";
import { vlog } from "@/lib/verbose-logger";

import { useEditEntityDialog } from "../../../hooks/useEditEntityDialog";
import { useGraphContextActions } from "../../../hooks/useGraphContextActions";
import { useGraphImportExport } from "../../../hooks/useGraphImportExport";
import { useMergeToNeo4jDialog } from "../../../hooks/useMergeToNeo4jDialog";
import { useResearchAgentCanvas } from "../../../hooks/useResearchAgentCanvas";
import { useResearchPageState } from "../../../hooks/useResearchPageState";
import { BundleImportDialog } from "../../BundleImportDialog";
import { EditEntityDialog } from "../../dialogs/EditEntityDialog";
import { EntityFilterPanel } from "../../EntityFilterPanel";
import { EntityTypeSelector } from "../../nodes/EntityTypeSelector";
import { ResearchEditorWrapper } from "../../ResearchEditor";
import { VersionBrowserDialog } from "../../VersionBrowserDialog";
import { HorizontalToolbar } from "../HorizontalToolbar";
import { CanvasNavigationToolbar } from "../toolbar/CanvasNavigationToolbar";
import { GraphToolbarButtons } from "../toolbar/GraphToolbarButtons";
import { UtilityPanel } from "../UtilityPanel";

import { CANVAS_REGISTRY } from "./CanvasRegistry";
import { GraphSettings } from "./GraphSettings";
import { useGraphUtilityTabs } from "./GraphUtilityPanel";
import { useGraphCanvasActions } from "./useGraphCanvasActions";
import { useGraphCanvasBundleImport } from "./useGraphCanvasBundleImport";
import { useGraphCanvasState } from "./useGraphCanvasState";
import { useGraphCanvasWizards } from "./useGraphCanvasWizards";

interface GraphCanvasIntegratedProps {
  data: {
    graphData?: any;
    hiddenEntityTypes?: string[]; // @deprecated - Now managed in URL state
    expandedNodes?: string[];
    layoutMode?: string;
  };
  onDataChange: (data: any) => void;
  readOnly?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  ydoc?: any; // Yjs document
  userId?: string; // User ID for transaction origins
  userTier?: UserTier; // User tier for limit enforcement
  canUseAIChat?: boolean; // Tier enforcement for AI chat
  disableAutoPersist?: boolean; // Disable persist effect (for session mode where SessionCanvas handles persistence)
  provider?: any; // HocuspocusProvider for live collaboration
  updateCursor?: (x: number | null, y: number | null) => void; // Cursor tracking callback
  onCursorsUpdate?: (
    cursors: Array<{
      userId: string;
      name: string;
      color: string;
      x: number;
      y: number;
    }>
  ) => void;
  // Collaboration props
  workspaceId?: string;
  tabId?: string;
  tabName?: string;
  canUseCollaboration?: boolean;
  workspaceReady?: boolean;
  activeSessionId?: string | null;
  onSessionCreated?: (sessionId: string, shareLink: string) => void;
  onSessionEnded?: () => void;
  pendingBundle?: RabbitHoleBundleData | null; // Auto-import bundle from URL
  agentPartialBundle?: PartialBundle | null; // Progressive agent bundle streaming
  importMode?: "merge" | "replace" | "overwrite"; // Import mode for bundle imports
  // Version management
  saveVersion?: (
    name: string,
    description?: string,
    tags?: string[]
  ) => Promise<string>;
  loadVersion?: (versionId: string) => Promise<void>;
  listVersions?: () => Promise<VersionMetadata[]>;
}

export function GraphCanvasIntegrated({
  data,
  onDataChange,
  readOnly,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  ydoc,
  userId,
  userTier = "free",
  canUseAIChat = false,
  disableAutoPersist = false,
  provider,
  updateCursor,
  onCursorsUpdate,
  workspaceId,
  tabId,
  tabName,
  canUseCollaboration = false,
  workspaceReady = false,
  activeSessionId,
  onSessionCreated,
  onSessionEnded,
  pendingBundle = null,
  agentPartialBundle = null,
  importMode = "merge",
  saveVersion,
  loadVersion,
  listVersions,
}: GraphCanvasIntegratedProps) {
  const research = useResearchPageState();

  const { toast } = useToast();
  const { openContextMenu, setActions } = useContextMenu();

  // Entity type selector state
  const [entityTypeSelectorOpen, setEntityTypeSelectorOpen] = useState(false);
  const [pendingEntityPosition, setPendingEntityPosition] = useState<{
    flowX: number;
    flowY: number;
    x: number;
    y: number;
  } | null>(null);

  // Edit entity dialog state
  const editDialog = useEditEntityDialog();

  // Merge to Neo4j dialog state
  const mergeDialog = useMergeToNeo4jDialog();

  // Centralized state management
  const state = useGraphCanvasState({
    initialData: data,
    disableAutoPersist,
    onDataChange,
    provider,
    userId,
  });

  // Wizard management
  const wizards = useGraphCanvasWizards({
    graph: state.graph,
    onGraphChange: state.handleGraphChange,
    userId,
    userTier,
    toast,
    logUserAction,
  });

  // Destructure for cleaner access
  const { graph, graphVersion, setGraphVersion, handleGraphChange } = state;
  const { isSerializingRef, pendingBundleImported } = state;
  const { expandedNodes, setExpandedNodes } = state;
  const { currentLayout, setCurrentLayout } = state;
  const { savedPositions, setSavedPositions } = state;
  const { layoutSettings, setLayoutSettings } = state;
  const { isInteractionLocked, setIsInteractionLocked } = state;
  const { hideEmptyEntities, setHideEmptyEntities } = state;
  const { isPendingExpansion, startExpansionTransition } = state;

  // Filter popover state (not moved to state hook - simple local state)
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  // Version browser dialog state
  const [showVersionBrowser, setShowVersionBrowser] = useState(false);

  // DISABLED: Drawing tools - Coming Soon
  // All freehand state, handlers, and components are commented out to prevent memory loading.
  // To re-enable: uncomment the import, state, handlers, props, and InspectorPanel below.
  /*
  const [freehandEnabled, setFreehandEnabled] = useState(false);
  const [inspectorPanelOpen, setInspectorPanelOpen] = useState(false);
  const freehandToggleFnRef = useRef<(() => void) | null>(null);
  const [activeDrawingTool, setActiveDrawingTool] = useState<ToolType>("move");
  const [freehandSettings, setFreehandSettings] = useState<any>({
    color: "217 91% 60%",
    opacity: 0.7,
    size: 8,
    smoothing: 0.5,
    thinning: 0.5,
    eraserSize: 20,
  });
  const freehandSettingsChangeRef = useRef<((updates: any) => void) | null>(null);
  const freehandToolChangeHandlerRef = useRef<((tool: ToolType) => void) | null>(null);
  const updateSelectedDrawingNodeRef = useRef<((updates: any) => void) | null>(null);
  const [selectedDrawingNode, setSelectedDrawingNode] = useState<any>(null);
  const canUseFreehand = true;

  const handleFreehandReady = useCallback((toggle: () => void) => {
    freehandToggleFnRef.current = toggle;
  }, []);

  const handleFreehandToggle = useCallback(
    (enabled: boolean) => {
      setFreehandEnabled(enabled);
      setIsInteractionLocked(enabled && activeDrawingTool !== "move");
    },
    [activeDrawingTool]
  );

  const handleFreehandToolChange = useCallback(
    (tool: ToolType) => {
      setActiveDrawingTool(tool);
      freehandToolChangeHandlerRef.current?.(tool);
      if (freehandEnabled) {
        setIsInteractionLocked(tool !== "move");
      }
    },
    [freehandEnabled]
  );

  const handleToggleFreehand = useCallback(() => {
    if (!freehandEnabled) {
      freehandToggleFnRef.current?.();
    }
    setInspectorPanelOpen((prev) => !prev);
  }, [freehandEnabled]);

  const handleToggleInspectorPanel = useCallback(() => {
    setInspectorPanelOpen((prev) => !prev);
  }, []);

  const handleFreehandSettingsReady = useCallback(
    (settings: any, onSettingsChange: (updates: any) => void) => {
      setFreehandSettings(settings);
      freehandSettingsChangeRef.current = onSettingsChange;
    },
    []
  );

  const handleInspectorSettingsChange = useCallback((updates: any) => {
    freehandSettingsChangeRef.current?.(updates);
  }, []);

  const handleInspectorSelectedNodeUpdate = useCallback((updates: any) => {
    updateSelectedDrawingNodeRef.current?.(updates);
  }, []);

  const handleFreehandToolChangeReady = useCallback(
    (handler: (tool: ToolType) => void) => {
      freehandToolChangeHandlerRef.current = handler;
    },
    []
  );

  const handleSelectedDrawingNodeChange = useCallback((node: any) => {
    setSelectedDrawingNode(node);
  }, []);

  const handleSelectedDrawingNodeUpdateReady = useCallback(
    (updateNode: (updates: any) => void) => {
      updateSelectedDrawingNodeRef.current = updateNode;
    },
    []
  );

  const handleFreehandNodeCreated = useCallback(
    (nodeId: string) => {
      vlog.log(`✏️ Freehand drawing created: ${nodeId}`);
      handleGraphChange();
    },
    [handleGraphChange]
  );

  const handleFreehandError = useCallback(
    (error: Error) => {
      toast({
        title: "Drawing Error",
        description: error.message,
        variant: "destructive",
      });
    },
    [toast]
  );
  */

  // Utility panel collapse state - start collapsed by default
  const [isUtilityPanelCollapsed, setIsUtilityPanelCollapsed] = useState(true);
  const utilityPanelRef = useRef<ImperativePanelHandle | null>(null);

  // Utility panel toggle handler
  const handleToggleUtilityPanel = useCallback(() => {
    setIsUtilityPanelCollapsed((prev) => !prev);
  }, []);

  // Sync collapse state to panel ref (defer to avoid render-time updates)
  useEffect(() => {
    if (!utilityPanelRef.current) return;

    if (isUtilityPanelCollapsed) {
      utilityPanelRef.current.collapse();
    } else {
      // Expand to max height (75%)
      utilityPanelRef.current.resize(75);
    }
  }, [isUtilityPanelCollapsed]);

  // Version management handlers
  const handleSaveVersion = useCallback(async () => {
    if (!saveVersion) return;

    try {
      const timestamp = new Date().toLocaleTimeString();
      const versionId = await saveVersion(
        `Manual Save ${timestamp}`,
        "User-created checkpoint",
        ["manual"]
      );

      toast({
        title: "Version Saved",
        description: "Checkpoint created successfully",
      });

      vlog.log("📸 Version saved:", versionId);
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [saveVersion, toast]);

  const handleOpenVersionBrowser = useCallback(() => {
    setShowVersionBrowser(true);
  }, []);

  const handleRestoreVersion = useCallback(
    async (versionId: string) => {
      if (!loadVersion) return;

      try {
        await loadVersion(versionId);

        toast({
          title: "Version Restored",
          description: "Workspace restored to checkpoint",
        });

        vlog.log("♻️ Version restored:", versionId);
        setShowVersionBrowser(false);
      } catch (error) {
        toast({
          title: "Restore Failed",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    },
    [loadVersion, toast]
  );

  // Auto-import pending bundle from URL (handled by hook)
  useGraphCanvasBundleImport({
    pendingBundle,
    importMode,
    graph,
    pendingBundleImported,
    setCurrentLayout,
    setGraphVersion,
  });

  // Progressive agent bundle streaming — imports entities as agent discovers them
  useResearchAgentCanvas({
    partialBundle: agentPartialBundle,
    graph,
    enabled: canUseAIChat,
    setGraphVersion,
  });

  // Sync graph from Yjs data changes (for undo/redo)
  useEffect(() => {
    if (!data.graphData) return;

    // Skip if this update came from our own serialization
    if (isSerializingRef.current) {
      isSerializingRef.current = false;
      return;
    }

    const incomingNodes = data.graphData.nodes || [];
    const incomingEdges = data.graphData.edges || [];

    vlog.log("🔄 Syncing graph from Yjs:", {
      incomingNodes: incomingNodes.length,
      incomingEdges: incomingEdges.length,
      currentNodes: graph.order,
      currentEdges: graph.size,
    });

    // Clear existing graph
    graph.clear();

    // Restore nodes from incoming data
    incomingNodes.forEach((node: any) => {
      const { id, ...attributes } = node;
      if (!graph.hasNode(id)) {
        graph.addNode(id, attributes);
      }
    });

    // Restore edges from incoming data
    incomingEdges.forEach((edge: any) => {
      const { id, source, target, ...attributes } = edge;
      if (
        graph.hasNode(source) &&
        graph.hasNode(target) &&
        !graph.hasEdge(source, target)
      ) {
        graph.addEdge(source, target, attributes);
      }
    });

    // Force re-render by incrementing graph version
    setGraphVersion((v) => v + 1);
  }, [data.graphData, graph]);

  // Hidden entity types - from URL state (shareable, persistent)
  const hiddenEntityTypes = useMemo(
    () => new Set(research.hiddenTypes || []),
    [research.hiddenTypes]
  );

  // Get capabilities from registry
  const canvasCapabilities = CANVAS_REGISTRY.graph.capabilities;

  // Listen for layout settings changes from GraphSettings panel
  useEffect(() => {
    const handleSettingsChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        setLayoutSettings(customEvent.detail);
      }
    };

    window.addEventListener("layout-settings-changed", handleSettingsChange);
    return () =>
      window.removeEventListener(
        "layout-settings-changed",
        handleSettingsChange
      );
  }, [setLayoutSettings]);

  const handleContextMenu = useCallback(
    (type: string, x: number, y: number, target?: any) => {
      // Pass context as-is (includes flowX/flowY for background menus from ResearchEditor)
      openContextMenu(type === "node" ? "node" : "background", x, y, target);
    },
    [openContextMenu]
  );

  const handleShowAll = useCallback(() => {
    research.showAllTypes();
  }, [research]);

  const handleHideAll = useCallback(() => {
    // Get all entity types and hide them
    const allTypes = Object.values(getEntityTypesByDomain()).flat();
    research.hideAllTypes(allTypes as string[]);
  }, [research]);

  // Memoize array conversion to prevent recreation on every render
  const hiddenEntityTypesArray = useMemo(
    () => Array.from(hiddenEntityTypes),
    [hiddenEntityTypes]
  );

  // Import/Export hook
  const {
    fileInputRef,
    isImporting,
    showImportDialog,
    setShowImportDialog,
    handleImport,
    handleExport,
    handleFileSelect,
  } = useGraphImportExport({
    graph,
    data,
    hiddenEntityTypes: hiddenEntityTypesArray,
    userId,
    userTier,
    onGraphChange: handleGraphChange,
    onDataChange,
  });

  // Actions hook - handles layout, import/export, entity operations
  const actions = useGraphCanvasActions({
    graph,
    graphVersion,
    handleGraphChange,
    currentLayout,
    setCurrentLayout,
    savedPositions,
    setSavedPositions,
    layoutSettings,
    data,
    onDataChange,
    userId,
    userTier,
    setShowImportDialog,
    setGraphVersion,
    editDialog,
    setExpandedNodes,
  });

  // Listen for file upload success events
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        actions.handleFileUploadSuccess(customEvent.detail);
      }
    };

    window.addEventListener("fileUploadSuccess", handler);
    return () => window.removeEventListener("fileUploadSuccess", handler);
  }, [actions.handleFileUploadSuccess]);

  // Entity type selector state
  const handleOpenEntityTypeSelector = useCallback(
    (flowX: number, flowY: number, x: number, y: number) => {
      setPendingEntityPosition({ flowX, flowY, x, y });
      setEntityTypeSelectorOpen(true);
    },
    []
  );

  const handleEntityTypeSelected = useCallback(
    (entityType: string) => {
      actions.handleEntityTypeSelected(entityType, pendingEntityPosition);
      setEntityTypeSelectorOpen(false);
      setPendingEntityPosition(null);
    },
    [actions, pendingEntityPosition]
  );

  // Stable callback for opening filter panel
  const handleOpenFilterPanel = useCallback(() => {
    setShowFilterPopover(true);
  }, []);

  // Wizard handlers from hook
  const handleOpenFileExtractionDialog = wizards.openFileExtractionWizard;
  const handleOpenResearchWizard = wizards.openResearchWizard;
  const handleOpenEnrichmentWizard = wizards.openEnrichmentWizard;

  // Context menu actions - stable hook pattern
  const contextActions = useGraphContextActions({
    graph,
    onGraphChange: handleGraphChange,
    userId,
    tabId,
    expandedNodes,
    setExpandedNodes,
    handleExport,
    handleImport,
    onOpenEntityTypeSelector: handleOpenEntityTypeSelector,
    onOpenEditDialog: editDialog.open,
    onOpenEnrichmentDialog: wizards.openEnrichmentWizard,
    onOpenFilterPanel: handleOpenFilterPanel,
    onOpenFileExtractionDialog: wizards.openFileExtractionWizard,
    onOpenResearchWizard: wizards.openResearchWizard,
    onOpenMergeDialog: mergeDialog.open,
    ydoc,
  });

  // Set actions when they change
  // Note: setActions is stable (Zustand setter), so we only need contextActions in deps
  useEffect(() => {
    setActions(contextActions);
  }, [contextActions, setActions]);

  // Memoize callbacks to prevent utility tab duplication
  const handleToggleEntityType = useCallback(
    (type: string) => {
      research.toggleEntityType(type);
    },
    [research]
  );

  const handleToggleDomain = useCallback(
    (domain: string, types: string[]) => {
      research.toggleDomain(domain, types);
    },
    [research]
  );

  const handleToggleNodeExpanded = useCallback(
    (nodeId: string) => {
      // Mark expansion as non-urgent update (React 19 concurrent feature)
      startExpansionTransition(() => {
        setExpandedNodes((prev) => {
          const next = new Set(prev);
          if (next.has(nodeId)) {
            next.delete(nodeId);
          } else {
            next.add(nodeId);
          }
          return next;
        });
      });
    },
    [startExpansionTransition]
  );

  const entityTypesByDomain = getEntityTypesByDomain();

  // Compute entity counts for filter
  const entityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (graph) {
      graph.forEachNode((nodeId: string, attrs: GraphNodeAttributes) => {
        const type = attrs.type;
        counts.set(type, (counts.get(type) || 0) + 1);
      });
    }
    return counts;
  }, [graph?.order]);

  // Create filter popover for toolbar
  const filterPopover = useMemo(
    () => (
      <Popover open={showFilterPopover} onOpenChange={setShowFilterPopover}>
        <PopoverTrigger asChild>
          <button
            className="p-2 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Filter Entity Types"
          >
            <Icon name="filter" size={16} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-96 h-[600px] p-0 z-[70]" align="start">
          <EntityFilterPanel
            entityTypesByDomain={entityTypesByDomain}
            entityCounts={entityCounts}
            hiddenEntityTypes={hiddenEntityTypes}
            hideEmpty={hideEmptyEntities}
            onToggleEntityType={handleToggleEntityType}
            onToggleDomain={handleToggleDomain}
            onShowAll={handleShowAll}
            onHideAll={handleHideAll}
            onToggleHideEmpty={setHideEmptyEntities}
          />
        </PopoverContent>
      </Popover>
    ),
    [
      showFilterPopover,
      entityTypesByDomain,
      entityCounts,
      hiddenEntityTypes,
      hideEmptyEntities,
      handleToggleEntityType,
      handleToggleDomain,
      handleShowAll,
      handleHideAll,
    ]
  );

  // Get utility panel tabs for graph
  const utilityTabs = useGraphUtilityTabs({
    graph,
    hiddenEntityTypes,
    expandedNodes,
    readOnly,
    onToggleEntityType: handleToggleEntityType,
    onToggleDomain: handleToggleDomain,
    onShowAll: handleShowAll,
    onHideAll: handleHideAll,
    onToggleNodeExpanded: handleToggleNodeExpanded,
  });

  // Persist state changes to parent (will sync via Yjs)
  // ONLY persist node positions when in manual layout mode
  useEffect(() => {
    // Skip if auto-persist is disabled (session mode - SessionCanvas handles persistence)
    if (disableAutoPersist) {
      vlog.log(
        "⏭️ Skipping persistence - disableAutoPersist=true (session mode)"
      );
      return;
    }

    // Skip if we're in a computed layout mode (positions are transient)
    if (currentLayout !== "manual") {
      vlog.log(
        `⏭️ Skipping persistence - in ${currentLayout} mode (transient)`
      );
      return;
    }

    // Serialize graph to JSON (with current positions)
    const nodes = graph.nodes().map((nodeId) => ({
      id: nodeId,
      ...graph.getNodeAttributes(nodeId),
    }));

    const edges = graph.edges().map((edgeId) => {
      const { source, target, ...attributes } = graph.getEdgeAttributes(
        edgeId
      ) as any;
      return {
        id: edgeId,
        source: graph.source(edgeId),
        target: graph.target(edgeId),
        ...attributes,
      };
    });

    const newData = {
      graphData: { nodes, edges },
      // hiddenEntityTypes removed - now in URL state
      // expandedNodes NOT persisted - ephemeral UI state only
      layoutMode: currentLayout,
    };

    vlog.log("💾 Persisting manual layout positions:", {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      layoutMode: currentLayout,
    });

    // Mark that we're serializing to prevent loop
    isSerializingRef.current = true;

    // Save immediately - Yjs handles efficient syncing
    onDataChange(newData);
  }, [
    graph,
    graph.order, // Node count - triggers on node add/remove
    graph.size, // Edge count - triggers on edge add/remove
    hiddenEntityTypes,
    // expandedNodes removed - not persisted
    currentLayout,
    onDataChange,
    graphVersion,
  ]);

  return (
    <div className="relative h-full w-full flex">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Horizontal Toolbar */}
        <HorizontalToolbar
          capabilities={canvasCapabilities.toolbarButtons}
          canvasType="graph"
          canvasSettings={<GraphSettings />}
          canvasData={data}
          canvasButtonsSlot={
            canvasCapabilities.toolbarButtons.layout ? (
              <GraphToolbarButtons
                currentLayout={currentLayout}
                onLayoutChange={actions.handleLayoutChange}
                onImport={handleImport}
                onExport={handleExport}
                filterPopover={filterPopover}
                onSaveVersion={handleSaveVersion}
                onVersionBrowserOpen={handleOpenVersionBrowser}
              />
            ) : null
          }
          onToggleChat={() => research.setChatOpen((prev) => !prev)}
          canUseAIChat={canUseAIChat}
          onToggleUtilityPanel={handleToggleUtilityPanel}
          isUtilityPanelCollapsed={isUtilityPanelCollapsed}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
          workspaceId={workspaceId}
          tabId={tabId}
          tabName={tabName}
          canUseCollaboration={canUseCollaboration}
          workspaceReady={workspaceReady}
          activeSessionId={activeSessionId}
          onSessionCreated={onSessionCreated}
          onSessionEnded={onSessionEnded}
        />

        {/* Bundle Import Dialog */}
        <BundleImportDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          onImportComplete={actions.handleImportComplete}
          graph={graph}
          ydoc={ydoc || null}
          userTier={userTier}
        />

        {/* Wizards (File Extraction, Research, Enrichment) */}
        {wizards.WizardComponents}

        {/* Main content area: Graph + Utility Panel in vertical resizable layout */}
        <ResizablePanelGroup
          direction="vertical"
          className="flex-1"
          autoSaveId="workspace-graph-vertical-layout"
        >
          {/* Graph Panel (top) */}
          <ResizablePanel defaultSize={100} minSize={25}>
            <div className="relative h-full w-full overflow-hidden">
              <ResearchEditorWrapper
                graph={graph}
                nodeCount={graph.order}
                edgeCount={graph.size}
                isInteractionLocked={readOnly || isInteractionLocked}
                isDraggingEnabled={currentLayout === "manual"}
                graphVersion={actions.optimisticGraphVersion}
                onGraphChange={handleGraphChange}
                onNodeClick={actions.handleNodeClick}
                onNodeDoubleClick={actions.handleNodeDoubleClick}
                onContextMenu={handleContextMenu}
                hiddenEntityTypes={hiddenEntityTypes}
                expandedNodes={expandedNodes}
                provider={provider}
                userId={userId}
                updateCursor={updateCursor}
                onCursorsUpdate={onCursorsUpdate}
                onToggleNodeExpanded={handleToggleNodeExpanded}
                onToggleEntityType={handleToggleEntityType}
                onToggleDomain={handleToggleDomain}
                ydoc={ydoc}
                tabId={tabId}
                userTier={userTier}
                // DISABLED: Drawing tools - Coming Soon
                // onFreehandReady={handleFreehandReady}
                // onFreehandToggle={handleFreehandToggle}
                // onFreehandToolChange={handleFreehandToolChange}
                // onFreehandNodeCreated={handleFreehandNodeCreated}
                // onFreehandError={handleFreehandError}
                // onFreehandSettingsReady={handleFreehandSettingsReady}
                // onFreehandToolChangeReady={handleFreehandToolChangeReady}
                // onSelectedDrawingNodeChange={handleSelectedDrawingNodeChange}
                // onSelectedDrawingNodeUpdateReady={handleSelectedDrawingNodeUpdateReady}
              />

              {/* Canvas Navigation Toolbar (bottom-left) - positioned relative to graph panel */}
              <CanvasNavigationToolbar
                isLocked={isInteractionLocked}
                onToggleLock={() =>
                  setIsInteractionLocked(!isInteractionLocked)
                }
              />
            </div>
          </ResizablePanel>

          {/* Resize Handle - hidden (utility panel is toggle-only via toolbar) */}
          <ResizableHandle className="invisible pointer-events-none" />

          {/* Utility Panel (bottom) */}
          <ResizablePanel
            ref={utilityPanelRef}
            defaultSize={0}
            minSize={5}
            maxSize={50}
            collapsible
            collapsedSize={0}
            onCollapse={() => setIsUtilityPanelCollapsed(true)}
            onExpand={() => setIsUtilityPanelCollapsed(false)}
          >
            <UtilityPanel
              canvasTabs={utilityTabs}
              layoutId="workspace-graph-utility"
            />
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Entity Type Selector Popover */}
        <EntityTypeSelector
          isOpen={entityTypeSelectorOpen}
          onClose={() => {
            setEntityTypeSelectorOpen(false);
            setPendingEntityPosition(null);
          }}
          onSelect={handleEntityTypeSelected}
          anchorPosition={
            pendingEntityPosition
              ? { x: pendingEntityPosition.x, y: pendingEntityPosition.y }
              : undefined
          }
        />

        {/* Edit Entity Dialog */}
        {editDialog.isOpen &&
          editDialog.entityType &&
          editDialog.initialData && (
            <EditEntityDialog
              isOpen={editDialog.isOpen}
              entityUid={editDialog.entityUid!}
              entityType={editDialog.entityType as any}
              initialData={editDialog.initialData}
              onClose={editDialog.close}
              onUpdate={actions.handleEntityUpdate}
            />
          )}

        {/* Version Browser Dialog */}
        {listVersions && (
          <VersionBrowserDialog
            isOpen={showVersionBrowser}
            onClose={() => setShowVersionBrowser(false)}
            onLoadVersion={handleRestoreVersion}
            listVersions={listVersions}
          />
        )}
      </div>
      {/* Close main content area */}

      {/* DISABLED: Drawing tools - Coming Soon
      {freehandEnabled && (
        <InspectorPanel
          activeTool={activeDrawingTool}
          settings={freehandSettings}
          selectedNode={selectedDrawingNode}
          onToolChange={handleFreehandToolChange}
          onSettingsChange={handleInspectorSettingsChange}
          onSelectedNodeUpdate={handleInspectorSelectedNodeUpdate}
          isOpen={inspectorPanelOpen}
          onToggle={handleToggleInspectorPanel}
        />
      )}
      */}
    </div>
  );
}
