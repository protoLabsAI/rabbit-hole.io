/**
 * Atlas Landing Page - Main Entry Point for Rabbit-Hole.io
 *
 * AI-powered entity research platform with interactive knowledge graph
 */

"use client";

// Force dynamic rendering - uses Clerk and client-only features
export const dynamic = "force-dynamic";

import cytoscape from "cytoscape";
import cise from "cytoscape-cise";
import cola from "cytoscape-cola";
import cytoscapePopper from "cytoscape-popper";
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";

import {
  getUserRoleClient,
  getUserTierClient,
  hasMinimumRole,
  USER_ROLES,
} from "@proto/auth/client";
import {
  getEntityImage,
  getLayoutConfig,
  shouldShowEdgeLabels,
  type ViewMode,
  getPerformanceConfig,
  CytoscapeElementManager,
  CytoscapePerformanceMonitor,
  createViewportCullingHandler,
} from "@proto/utils/atlas";

import { DialogRegistry } from "../components/ui/DialogRegistry";
import { ContextMenuRenderer, useContextMenu } from "../context-menu";
import "../context-menu/registry/atlasMenus.direct"; // Register Atlas menus (direct actions)
import { AddEntityForm } from "../evidence/components/atlas/AddEntityForm";
import { BulkImportPanel } from "../evidence/components/atlas/BulkImportPanel";
import {
  getContextMenuType,
  ContextMenuActions,
} from "../evidence/components/atlas/ContextMenus";
import { FloatingDetailsPanel } from "../evidence/components/atlas/FloatingDetailsPanel";
import { useLegendContextMenu } from "../evidence/components/atlas/LegendContextMenu";
import { createCytoscapeStyles } from "../graph-visualizer/config/default-styles";
import { useEntityMergeDialog, useResearchImportDialog } from "../hooks/ui";
import { GraphDataStandardizer } from "../lib/graph-data-standardizer";
import Toast from "../lib/toast";
import type { CanonicalGraphData } from "../types/canonical-graph";

import { AtlasSettingsPanel } from "./components/AtlasSettingsPanel";
import { LegendV2 } from "./components/LegendV2";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { ResearchModeImportDialog } from "./components/ResearchModeImportDialog";
import { TimelineChart } from "./components/TimelineChart";
import { useAtlasState } from "./hooks/useAtlasState";
import { useGraphTilesNuqs } from "./hooks/useGraphTilesNuqs";
import { useTimeSliceAggregation } from "./hooks/useTimeSliceAggregation";
import { AtlasApiService } from "./services/AtlasApiService";
import {
  createFloatingUIPopperFactory,
  createTooltipContent,
  showTooltip,
  hideTooltip,
  destroyTooltip,
  extractEntityInfo,
} from "./utils/popper-tooltip";

// Types - import early

// Register layout algorithms
cytoscape.use(cise);
cytoscape.use(cola);
cytoscape.use(cytoscapePopper(createFloatingUIPopperFactory()));

export default function AtlasClient() {
<<<<<<< HEAD
  const user = { id: "local-user", firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], primaryEmailAddress: { emailAddress: "local@localhost" } } as any;
  const isSignedIn = true;
=======
  const isSignedIn = true;
  const user = {
    id: "local-user",
    firstName: "Local",
    lastName: "User",
    username: "local-user",
    fullName: "Local User",
    emailAddresses: [{ emailAddress: "local@localhost" }],
    publicMetadata: { tier: "pro" },
    privateMetadata: { stats: {} },
  };
>>>>>>> origin/main
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const apiService = useRef(new AtlasApiService()).current;

  // Role detection for access control
  const userRole = user ? getUserRoleClient(user) : null;
  const isSuperAdmin = userRole
    ? hasMinimumRole(userRole, USER_ROLES.SUPER_ADMIN)
    : false;
  const userTier = user ? getUserTierClient(user) : "free";

  // Core UI state management
  const atlasState = useAtlasState();
  const graphTiles = useGraphTilesNuqs(); // Using nuqs with proper Next.js App Router adapter
  const entityMergeDialog = useEntityMergeDialog();
  const researchImportDialog = useResearchImportDialog();

  // Extract active date filters from nuqs timeWindow (unified URL state management)
  const activeDateFilter = {
    from:
      graphTiles.timeWindow.from !== "2024-01-01"
        ? graphTiles.timeWindow.from
        : undefined,
    to:
      graphTiles.timeWindow.to !== new Date().toISOString().split("T")[0]
        ? graphTiles.timeWindow.to
        : undefined,
  };

  const [layoutType, setLayoutType] = useState<
    "breadthfirst" | "force" | "atlas"
  >("atlas");
  const [showLabels, setShowLabels] = useState(true);
  const [highlightConnections, setHighlightConnections] = useState(true);
  const [graphData, setGraphData] = useState<CanonicalGraphData | null>(null);
  // Removed: showImportForm, isImporting - not currently used
  const [hiddenEntityTypes, setHiddenEntityTypes] = useState<Set<string>>(
    new Set()
  );
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [settingsPosition, setSettingsPosition] = useState<
    "top-left" | "top-right" | "bottom-left" | "bottom-right"
  >("bottom-right");
  const [showTimeline, setShowTimeline] = useState(false);

  // Timeline aggregation data for time slice mode
  const timelineAggregation = useTimeSliceAggregation(
    graphTiles.timeWindow,
    graphTiles.centerEntity || undefined,
    showTimeline && graphTiles.viewMode === "timeslice"
  );

  // Dialog states now managed by UIContext

  // Research report handler (updated to use events)
  const handleOpenResearchReport = useCallback(
    (entityUid: string, entityName: string) => {
      console.log(`📊 Opening research report for: ${entityName}`);
      // Dispatch event - now handled by UIContext
      window.dispatchEvent(
        new CustomEvent("openResearchReport", {
          detail: { entityUid, entityName },
        })
      );
    },
    []
  );

  // Family analysis handler (updated to use events)
  const handleOpenFamilyAnalysis = useCallback(
    (entityUid: string, entityName: string) => {
      console.log(`👨‍👩‍👧‍👦 Opening family analysis for: ${entityName}`);
      // Dispatch event - now handled by UIContext
      window.dispatchEvent(
        new CustomEvent("openFamilyAnalysis", {
          detail: { entityUid, entityName },
        })
      );
    },
    []
  );

  // Listen for navigation and relationship analysis events (non-dialog events remain)
  useEffect(() => {
    const handleEntityNavigationEvent = (event: CustomEvent) => {
      const { entityUid, entityName, egoSettings } = event.detail;
      console.log(`🔗 Navigating to entity: ${entityName} (${entityUid})`);
      // Center on the entity and switch to ego view with custom settings
      graphTiles.centerOnEntity(entityUid, entityName, egoSettings);
    };

    const handleRelationshipAnalysisEvent = (event: CustomEvent) => {
      const {
        sourceEntityUid,
        sourceEntityName,
        targetEntityUid,
        relationshipType,
      } = event.detail;
      console.log(
        `🔍 Analyzing ${relationshipType} relationship: ${sourceEntityName} → ${targetEntityUid}`
      );

      // For now, show a rich analysis alert with API call
      fetch(
        `/api/relationship-analysis/individual/${sourceEntityUid}?target=${targetEntityUid}&type=${relationshipType}`
      )
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            const analysis = data.data.analysis;
            const scorePercent = Math.round(
              analysis.relationshipStrength.score * 100
            );
            const factors = analysis.relationshipStrength.factors.join(", ");
            const dataQuality =
              analysis.researchInsights.dataQuality.toUpperCase();
            const missingInfo =
              analysis.researchInsights.missingInformation.length > 0
                ? `Missing: ${analysis.researchInsights.missingInformation.join(", ")}`
                : "✅ Complete data available";
            const mutualConnections =
              analysis.contextualAnalysis.networkContext.mutualConnections > 0
                ? `Mutual Connections: ${analysis.contextualAnalysis.networkContext.mutualConnections}`
                : "No mutual connections found";

            Toast.info(
              `🔍 Relationship Analysis: ${relationshipType}`,
              `Strength: ${scorePercent}% • Factors: ${factors} • Quality: ${dataQuality} • ${missingInfo} • ${mutualConnections}`
            );
          } else {
            Toast.error(`Analysis failed`, data.error);
          }
        })
        .catch((error) => {
          console.error("Relationship analysis error:", error);
          Toast.error(`Analysis error`, error.message);
        });
    };

    // Dialog events now handled by UIContext automatically

    // Only register non-dialog events (dialog events handled by UIContext)
    window.addEventListener(
      "navigateToEntity",
      handleEntityNavigationEvent as EventListener
    );
    window.addEventListener(
      "analyzeRelationship",
      handleRelationshipAnalysisEvent as EventListener
    );

    return () => {
      window.removeEventListener(
        "navigateToEntity",
        handleEntityNavigationEvent as EventListener
      );
      window.removeEventListener(
        "analyzeRelationship",
        handleRelationshipAnalysisEvent as EventListener
      );
    };
  }, [graphTiles]);

  // URL parameter handling is now managed by useGraphTilesNuqs hook

  // Context menu state
  const { contextMenu, openContextMenu, closeContextMenu, setActions } =
    useContextMenu();

  // Entity type filtering
  const toggleEntityType = useCallback((entityType: string) => {
    setHiddenEntityTypes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entityType)) {
        newSet.delete(entityType);
      } else {
        newSet.add(entityType);
      }
      return newSet;
    });
  }, []);

  const showAllEntityTypes = useCallback(() => {
    setHiddenEntityTypes(new Set());
  }, []);

  // Enhanced entity filtering for Legend v2
  const toggleMultipleEntityTypes = useCallback(
    (entityTypes: string[], visible: boolean) => {
      setHiddenEntityTypes((prev) => {
        const newSet = new Set(prev);
        entityTypes.forEach((type) => {
          if (visible) {
            newSet.delete(type);
          } else {
            newSet.add(type);
          }
        });
        return newSet;
      });
    },
    []
  );

  const isolateEntityTypes = useCallback(
    (entityTypes: string[]) => {
      if (!graphData) return;

      // Get all entity types from current graph data
      const allTypes = new Set(graphData.nodes.map((node) => node.type));

      // Hide all types except the ones being isolated
      const typesToHide = Array.from(allTypes).filter(
        (type) => !entityTypes.includes(type)
      );
      setHiddenEntityTypes(new Set(typesToHide));
    },
    [graphData]
  );

  // Legend context menu hook
  const { handleLegendRightClick } = useLegendContextMenu(
    toggleEntityType,
    (sentiment: string) => {
      console.log(`Filter by ${sentiment} sentiment`);
      // TODO: Implement sentiment filtering
    },
    () => {
      console.log("Show legend settings");
      // TODO: Implement legend settings
    },
    openContextMenu
  );

  // Export handler for ControlButtons
  const handleExport = useCallback(() => {
    const filters: any = {};

    // Add entity type filters if any are hidden
    if (hiddenEntityTypes.size > 0) {
      const visibleTypes = [
        "person",
        "organization",
        "platform",
        "movement",
        "event",
      ].filter((type) => !hiddenEntityTypes.has(type));
      if (visibleTypes.length > 0) {
        filters.entityTypes = visibleTypes;
      }
    }

    // Add time window if in timeslice mode
    if (graphTiles.viewMode === "timeslice") {
      filters.timeWindow = {
        from: graphTiles.timeWindow.from,
        to: graphTiles.timeWindow.to,
      };
    }

    apiService.triggerExportDownload(filters);
  }, [
    hiddenEntityTypes,
    graphTiles.viewMode,
    graphTiles.timeWindow,
    apiService,
  ]);

  // Load graph data with Rabbit Hole Schema support
  useEffect(() => {
    const loadGraphData = async () => {
      console.log("🔄 Loading graph data with params:", {
        viewMode: graphTiles.viewMode,
        centerEntity: graphTiles.centerEntity,
        egoSettings: graphTiles.egoSettings,
      });

      atlasState.startLoading();
      try {
        const result = await apiService.loadGraphData({
          viewMode: graphTiles.viewMode,
          centerEntity: graphTiles.centerEntity,
          communityId: graphTiles.communityId,
          timeWindow: graphTiles.timeWindow,
          egoSettings: graphTiles.egoSettings,
        });

        if (result.success && result.data) {
          setGraphData(result.data);

          // Populate existing entities for form dropdowns
          atlasState.updateExistingEntitiesFromGraphData(result.data);

          console.log(
            `📊 Loaded ${graphTiles.viewMode} with ${result.data.nodes.length} nodes, ${result.data.edges.length} edges`
          );

          if (result.data.meta?.bounded) {
            console.log("🔒 Bounded view - showing subset for performance");
          }
        } else {
          console.error("Failed to load graph data:", result.error);
          setGraphData(null);
        }
      } catch (error) {
        console.error("Error loading graph data:", error);
        setGraphData(null);
      } finally {
        atlasState.finishLoading();
      }
    };

    loadGraphData();
  }, [
    graphTiles.viewMode,
    graphTiles.centerEntity,
    graphTiles.communityId,
    graphTiles.timeWindow,
    graphTiles.egoSettings,
  ]);

  // URL parameter handling is now managed by useGraphTilesNuqs hook

  // URL management is now handled by useGraphTilesNuqs hook

  // Refresh graph data after adding entities/relationships
  const refreshGraphData = useCallback(async () => {
    console.log("🔄 refreshGraphData: Starting...");
    atlasState.startLoading();
    try {
      console.log("🔍 refreshGraphData: Calling API service...");
      const result = await apiService.refreshGraphData();
      console.log("🔍 refreshGraphData: API result:", {
        success: result.success,
        hasData: !!result.data,
        nodeCount: result.data?.nodes?.length,
        edgeCount: result.data?.edges?.length,
      });

      if (result.success && result.data) {
        console.log(
          `📊 Received fresh data: ${result.data.nodes.length} nodes, ${result.data.edges.length} edges`
        );

        console.log("🔍 refreshGraphData: Calling setGraphData...");
        setGraphData(result.data);

        console.log("🔍 refreshGraphData: Updating existing entities...");
        atlasState.updateExistingEntitiesFromGraphData(result.data);

        console.log(
          `✅ State updated: ${result.data.nodes.length} nodes, ${result.data.edges.length} edges`
        );
      } else {
        console.error("❌ refreshGraphData: Failed:", result.error);
      }
    } catch (error) {
      console.error("Error refreshing graph data:", error);
    } finally {
      atlasState.finishLoading();
    }
  }, [apiService]);

  // Handle form submissions
  const handleEntityAdded = useCallback(
    (entity: any) => {
      console.log("🎉 Entity added:", entity.label);
      setTimeout(() => refreshGraphData(), 500);
    },
    [refreshGraphData]
  );

  const handleRelationshipAdded = useCallback(
    (relationship: any) => {
      console.log("🎉 Relationship added:", relationship.label);
      setTimeout(() => refreshGraphData(), 500);
    },
    [refreshGraphData]
  );

  // Extract individual action handlers for stable references
  const handleShowNodeDetails = useCallback(
    async (nodeData: any) => {
      atlasState.setSelectedNode(nodeData);
      atlasState.setIsLoadingNodeDetails(true);
      try {
        const result = await apiService.loadNodeDetails(nodeData.uid);
        if (result.success) {
          atlasState.setSelectedNodeDetails(result.data);
        }
      } catch (error) {
        console.error("Error loading node details:", error);
      } finally {
        atlasState.setIsLoadingNodeDetails(false);
      }
    },
    [atlasState, apiService]
  );

  const handleEditNode = useCallback(
    (nodeData: any) => {
      console.log("Edit node:", nodeData.name);
      atlasState.setSelectedNode(nodeData);
      atlasState.openAddForm();
    },
    [atlasState]
  );

  const handleExpandConnections = useCallback((nodeData: any) => {
    if (cyRef.current && !cyRef.current.destroyed()) {
      try {
        const node = cyRef.current.getElementById(nodeData.uid);
        const connectedEdges = node.connectedEdges();
        const connectedNodes = connectedEdges
          .sources()
          .union(connectedEdges.targets());
        const outgoingEdges = node.outgoers("edge");
        const incomingEdges = node.incomers("edge");
        cyRef.current
          .elements()
          .removeClass(
            "highlighted faded highlighted-outgoing highlighted-incoming highlighted-neutral"
          );
        connectedNodes.addClass("highlighted");
        outgoingEdges.addClass("highlighted-outgoing");
        incomingEdges.addClass("highlighted-incoming");
        cyRef.current
          .elements()
          .not(connectedNodes)
          .not(connectedEdges)
          .not(node)
          .addClass("faded");
      } catch (error) {
        console.warn("⚠️ Failed to expand connections:", error);
      }
    }
  }, []);

  const handleViewEgoNetwork = useCallback(
    (nodeData: any) => {
      graphTiles.centerOnEntity(nodeData.uid, nodeData.name, {
        hops: 2,
        nodeLimit: 50,
      });
    },
    [graphTiles]
  );

  const handleViewTimeline = useCallback(
    async (nodeData: any) => {
      console.log(`📅 Loading timeline for ${nodeData.name}`);
      try {
        const result = await apiService.loadTimeline(nodeData.uid);
        if (result.success) {
          const { timeline, summary } = result.data;
          Toast.info(
            `Timeline for ${nodeData.name}`,
            `Total events: ${timeline.length} • Date range: ${summary.dateRange.earliest} to ${summary.dateRange.latest} • Activity types: ${Object.keys(summary.relationshipTypes).join(", ")}`
          );
        }
      } catch (error) {
        console.error("Error loading timeline:", error);
      }
    },
    [apiService]
  );

  const handleViewEvidencePack = useCallback(async (nodeData: any) => {
    console.log(`📦 Evidence pack requested for ${nodeData.name}`);
    Toast.info(
      "Evidence Pack Info",
      "For entity evidence, check the Timeline view which shows all supporting sources. Evidence packs are available for specific content items (posts, articles, etc.)."
    );
  }, []);

  const handleCenterOnNode = useCallback((nodeData: any) => {
    if (cyRef.current && !cyRef.current.destroyed()) {
      try {
        const node = cyRef.current.getElementById(nodeData.uid);
        cyRef.current.animate(
          { center: { eles: node }, zoom: 1.5 },
          { duration: 500 }
        );
      } catch (error) {
        console.warn("⚠️ Failed to center on node:", error);
      }
    }
  }, []);

  const handleAddEntity = useCallback(
    async (position: any) => {
      const entityName = prompt(
        "Enter the name of the person you want to research:"
      );
      if (!entityName || entityName.trim() === "") return;
      const trimmedName = entityName.trim();
      // Default to using Wikipedia search - non-destructive operation
      const useWikipedia = true;
      console.log(
        `🔍 Starting person research for: ${trimmedName} (using Wikipedia)`
      );
      try {
        const existingEntities =
          graphData?.nodes.map((node) => ({
            id: node.uid,
            name: node.name,
            type: node.type || "unknown",
          })) || [];
        const result = await apiService.entityResearch({
          targetPersonName: trimmedName,
          researchDepth: "detailed",
          focusAreas: [
            "biographical",
            "political",
            "business",
            "relationships",
          ],
          existingPersonEntities: existingEntities,
          dataSourceConfig: {
            wikipedia: {
              enabled: useWikipedia,
              maxResults: 2,
              maxContentLength: 4000,
            },
          },
        });
        if (result.success && result.data.structuredEntity) {
          console.log("✅ AI research completed, adding entity...");
          refreshGraphData();
        }
      } catch (error) {
        console.error("❌ Person research failed:", error);
        Toast.error(`Failed to research "${trimmedName}"`, String(error));
      }
    },
    [graphData, apiService, refreshGraphData]
  );

  const handleResetView = useCallback(() => {
    if (cyRef.current && !cyRef.current.destroyed()) {
      try {
        cyRef.current
          .elements()
          .removeClass(
            "selected highlighted faded highlighted-outgoing highlighted-incoming highlighted-neutral highlighted-hostile highlighted-supportive"
          );
        cyRef.current.fit();
        cyRef.current.zoom(1);
        cyRef.current.center();
        atlasState.clearSelection();
        graphTiles.setViewport(1, { x: 0, y: 0 });
        console.log("🔄 Graph view reset to default");
      } catch (error) {
        console.warn("⚠️ Failed to reset view:", error);
      }
    }
  }, [atlasState, graphTiles]);

  const handleFitToScreen = useCallback(() => {
    if (cyRef.current && !cyRef.current.destroyed()) {
      try {
        cyRef.current.fit();
        setTimeout(() => {
          try {
            const newZoom = cyRef.current?.zoom() ?? 1;
            const newPan = cyRef.current?.pan() ?? { x: 0, y: 0 };
            graphTiles.setViewport(Math.round(newZoom * 100) / 100, {
              x: Math.round(newPan.x),
              y: Math.round(newPan.y),
            });
            console.log("🎯 Graph fitted to screen");
          } catch (error) {
            console.warn(
              "⚠️ Failed to update viewport state after fit:",
              error
            );
          }
        }, 100);
      } catch (error) {
        console.warn("⚠️ Failed to fit to screen:", error);
      }
    }
  }, [graphTiles]);

  const handleToggleLayout = useCallback(() => {
    const layouts: ("breadthfirst" | "force" | "atlas")[] = [
      "breadthfirst",
      "force",
      "atlas",
    ];
    const currentIndex = layouts.indexOf(layoutType);
    const nextLayout = layouts[(currentIndex + 1) % layouts.length];
    setLayoutType(nextLayout);
  }, [layoutType]);

  const handleBulkImport = useCallback(() => {
    atlasState.openBulkImport();
  }, [atlasState]);

  const handleExportBundle = useCallback(() => {
    const filters: any = {};
    if (hiddenEntityTypes.size > 0) {
      const visibleTypes = [
        "person",
        "organization",
        "platform",
        "movement",
        "event",
      ].filter((type) => !hiddenEntityTypes.has(type));
      if (visibleTypes.length > 0) filters.entityTypes = visibleTypes;
    }
    if (graphTiles.viewMode === "timeslice") {
      filters.timeWindow = {
        from: graphTiles.timeWindow.from,
        to: graphTiles.timeWindow.to,
      };
    }
    apiService.triggerExportDownload(filters);
  }, [hiddenEntityTypes, graphTiles, apiService]);

  const handleShowSettings = useCallback(() => {
    setShowSettingsPanel(true);
  }, []);

  const handleMergeWithEntity = useCallback(
    (nodeData: any) => {
      console.log(`🔗 Initiating merge for entity: ${nodeData.name}`);
      entityMergeDialog.open({
        uid: nodeData.uid,
        name: nodeData.name,
        type: nodeData.type,
        aliases: nodeData.metadata.aliases || [],
        tags: nodeData.metadata.tags || [],
        properties: nodeData.properties || {},
        ...nodeData,
      });
    },
    [entityMergeDialog]
  );

  const handleDuplicateNode = useCallback((nodeData: any) => {
    console.log(
      `📋 Duplicate functionality not yet implemented for: ${nodeData.name}`
    );
  }, []);

  const handleDeleteNode = useCallback(async (nodeData: any) => {
    const relationshipCount =
      cyRef.current?.getElementById(nodeData.uid)?.connectedEdges().length || 0;

    // Show warning toast instead of blocking confirm dialog
    Toast.error(
      "Delete Entity",
      relationshipCount > 0
        ? `Deleting "${nodeData.name}" will remove this entity and ${relationshipCount} connected relationships. Use the context menu to confirm.`
        : `Deleting "${nodeData.name}" will permanently remove this entity. Use the context menu to confirm.`
    );

    // For production, this operation should be triggered through a proper dialog
    // For now, we'll require a second explicit action through the context menu
    console.log(
      `⚠️ Delete confirmation required for: ${nodeData.name} (${nodeData.uid})`
    );
  }, []);

  const handleConfirmDeleteNode = useCallback(
    async (nodeData: any) => {
      try {
        console.log(`🗑️ Deleting entity: ${nodeData.name} (${nodeData.uid})`);
        const response = await fetch("/api/entity-delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityId: nodeData.uid, force: true }),
        });
        const result = await response.json();
        if (result.success) {
          console.log(`✅ Entity deleted: ${result.deletedEntity.name}`);
          console.log(
            `   • Relationships deleted: ${result.deletedRelationships}`
          );
          refreshGraphData();
          Toast.success(
            `Successfully deleted "${result.deletedEntity.name}"!`,
            `Entity removed • ${result.deletedRelationships} relationships deleted`
          );
        } else {
          throw new Error(result.error || "Failed to delete entity");
        }
      } catch (error) {
        console.error("Failed to delete entity:", error);
        Toast.error("Failed to delete entity", String(error));
      }
    },
    [refreshGraphData]
  );

  const handleCreateRelationship = useCallback((nodeData: any) => {
    console.log(
      `🔗 Create relationship functionality not yet implemented for: ${nodeData.name}`
    );
  }, []);

  const handleDeleteEdge = useCallback(async (edgeData: any) => {
    // Show warning toast instead of blocking confirm dialog
    Toast.error(
      "Delete Relationship",
      `The relationship "${edgeData.label}" will be permanently removed from the knowledge graph. Use the context menu to confirm.`
    );
    console.log(
      `⚠️ Delete confirmation required for relationship: ${edgeData.label} (${edgeData.id})`
    );
  }, []);

  const handleConfirmDeleteEdge = useCallback(
    async (edgeData: any) => {
      try {
        console.log(
          `🗑️ Deleting relationship: ${edgeData.label} (${edgeData.id})`
        );
        const response = await fetch("/api/relationship-delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relationshipId: edgeData.id }),
        });
        const result = await response.json();
        if (result.success) {
          console.log(
            `✅ Relationship deleted: ${result.deletedRelationship.label}`
          );
          refreshGraphData();
          Toast.success(
            `Successfully deleted relationship "${edgeData.label}"!`
          );
        } else {
          throw new Error(result.error || "Failed to delete relationship");
        }
      } catch (error) {
        console.error("Failed to delete relationship:", error);
        Toast.error("Failed to delete relationship", String(error));
      }
    },
    [refreshGraphData]
  );

  const handleOpenInResearchMode = useCallback(
    (nodeData: any) => {
      if (!isSignedIn) {
        Toast.error(
          "Authentication Required",
          "Please sign in to use research mode"
        );
        return;
      }
      // Open configuration dialog instead of direct navigation
      researchImportDialog.open(nodeData);
    },
    [isSignedIn, researchImportDialog]
  );

  const handleShowEdgeDetails = useCallback((edgeData: any) => {
    console.log(`📊 Edge details for: ${edgeData.label}`, edgeData);
    Toast.info(
      `Edge Details: ${edgeData.label}`,
      `Type: ${edgeData.type} • Source: ${edgeData.source} • Target: ${edgeData.target} • UID: ${edgeData.id}`
    );
  }, []);

  const handleEditEdge = useCallback((edgeData: any) => {
    console.log(
      `✏️ Edit edge functionality not yet implemented for: ${edgeData.label}`
    );
  }, []);

  const handleReverseEdge = useCallback(async (edgeData: any) => {
    Toast.info(
      "Reverse Relationship",
      `This will swap the source and target of "${edgeData.label}". Feature coming soon.`
    );
    console.log(
      `↩️ Reverse edge functionality not yet implemented for: ${edgeData.label}`
    );
  }, []);

  // Compose context menu actions from stable handlers
  const contextMenuActions = useMemo<ContextMenuActions>(
    () => ({
      // Action handlers
      onShowNodeDetails: handleShowNodeDetails,
      ...(isSuperAdmin && { onEditNode: handleEditNode }),
      onExpandConnections: handleExpandConnections,
      onViewEgoNetwork: handleViewEgoNetwork,
      onViewTimeline: handleViewTimeline,
      onViewEvidencePack: handleViewEvidencePack,
      onCenterOnNode: handleCenterOnNode,
      ...(isSuperAdmin && { onAddEntity: handleAddEntity }),
      onResetView: handleResetView,
      onFitToScreen: handleFitToScreen,
      onToggleLayout: handleToggleLayout,
      ...(isSuperAdmin && { onBulkImport: handleBulkImport }), // Super admin only
      onExportBundle: handleExportBundle,
      onShowSettings: handleShowSettings,
      ...(isSuperAdmin && {
        onMergeWithEntity: handleMergeWithEntity,
        onDuplicateNode: handleDuplicateNode,
        onDeleteNode: handleDeleteNode,
        onCreateRelationship: handleCreateRelationship,
        onDeleteEdge: handleDeleteEdge,
      }),
      onOpenInResearchMode: handleOpenInResearchMode,
      onShowEdgeDetails: handleShowEdgeDetails,
      ...(isSuperAdmin && {
        onEditEdge: handleEditEdge,
        onReverseEdge: handleReverseEdge,
      }),
    }),
    [
      isSuperAdmin,
      handleShowNodeDetails,
      handleEditNode,
      handleExpandConnections,
      handleViewEgoNetwork,
      handleViewTimeline,
      handleViewEvidencePack,
      handleCenterOnNode,
      handleAddEntity,
      handleResetView,
      handleFitToScreen,
      handleToggleLayout,
      handleBulkImport,
      handleExportBundle,
      handleShowSettings,
      handleMergeWithEntity,
      handleDuplicateNode,
      handleDeleteNode,
      handleCreateRelationship,
      handleDeleteEdge,
      handleOpenInResearchMode,
      handleShowEdgeDetails,
      handleEditEdge,
      handleReverseEdge,
    ]
  );

  // Use ref to store latest actions, only set once to avoid infinite loop
  const actionsRef = useRef(contextMenuActions);
  actionsRef.current = contextMenuActions;

  useEffect(() => {
    // Pass stable ref wrapper - context menu reads from ref at invocation time
    setActions({
      get onShowNodeDetails() {
        return actionsRef.current.onShowNodeDetails;
      },
      get onEditNode() {
        return actionsRef.current.onEditNode;
      },
      get onExpandConnections() {
        return actionsRef.current.onExpandConnections;
      },
      get onViewEgoNetwork() {
        return actionsRef.current.onViewEgoNetwork;
      },
      get onViewTimeline() {
        return actionsRef.current.onViewTimeline;
      },
      get onViewEvidencePack() {
        return actionsRef.current.onViewEvidencePack;
      },
      get onCenterOnNode() {
        return actionsRef.current.onCenterOnNode;
      },
      get onAddEntity() {
        return actionsRef.current.onAddEntity;
      },
      get onResetView() {
        return actionsRef.current.onResetView;
      },
      get onFitToScreen() {
        return actionsRef.current.onFitToScreen;
      },
      get onToggleLayout() {
        return actionsRef.current.onToggleLayout;
      },
      get onBulkImport() {
        return actionsRef.current.onBulkImport;
      },
      get onExportBundle() {
        return actionsRef.current.onExportBundle;
      },
      get onShowSettings() {
        return actionsRef.current.onShowSettings;
      },
      get onMergeWithEntity() {
        return actionsRef.current.onMergeWithEntity;
      },
      get onDuplicateNode() {
        return actionsRef.current.onDuplicateNode;
      },
      get onDeleteNode() {
        return actionsRef.current.onDeleteNode;
      },
      get onCreateRelationship() {
        return actionsRef.current.onCreateRelationship;
      },
      get onDeleteEdge() {
        return actionsRef.current.onDeleteEdge;
      },
      get onOpenInResearchMode() {
        return actionsRef.current.onOpenInResearchMode;
      },
      get onShowEdgeDetails() {
        return actionsRef.current.onShowEdgeDetails;
      },
      get onEditEdge() {
        return actionsRef.current.onEditEdge;
      },
      get onReverseEdge() {
        return actionsRef.current.onReverseEdge;
      },
    });
  }, [setActions]); // Only run once on mount

  // Transform canonical data to Cytoscape format - simplified
  const transformData = useCallback(() => {
    if (!graphData) return [];

    // Use standardizer for direct transformation (handles connection counts internally)
    const { nodes, edges } = GraphDataStandardizer.toCytoscape(graphData);

    console.log(
      `🔧 Canonical → Cytoscape: ${graphData.nodes.length} nodes → ${nodes.length} Cytoscape nodes`
    );
    console.log(
      `📊 Canonical → Cytoscape: ${graphData.edges.length} edges → ${edges.length} Cytoscape edges`
    );

    return [...nodes, ...edges];
  }, [graphData]);

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || !graphData || atlasState.isLoading) return;

    const elements = transformData();
    console.log("🔍 Cytoscape elements count:", elements.length);

    if (elements.length === 0) {
      console.warn("⚠️ No elements to render in Cytoscape");
      return;
    }

    try {
      const cy = cytoscape({
        container: containerRef.current,
        elements: elements,

        // Use theme-aware styles from graph-visualizer config
        style: createCytoscapeStyles({
          showLabels,
          viewMode: graphTiles.viewMode,
        }),

        layout: {
          ...getLayoutConfig("atlas"),
          // Disable animations for full atlas view with many nodes
          animate: graphTiles.viewMode === "full-atlas" ? false : "end",
        } as any,
        minZoom: 0.2,
        maxZoom: 4,
        boxSelectionEnabled: false,
      });

      // Node click handler with connection highlighting
      cy.on("tap", "node", async (event) => {
        try {
          const node = event.target;
          const nodeData = node.data("originalNode");

          if (!nodeData) {
            console.warn("⚠️ Node data missing");
            return;
          }

          // Clear previous selections
          cy.elements().removeClass(
            "selected highlighted faded highlighted-outgoing highlighted-incoming highlighted-neutral"
          );

          // Select the clicked node
          node.addClass("selected");
          atlasState.setSelectedNode(nodeData);

          // Highlight connections if enabled
          if (highlightConnections) {
            // Get all connected edges and nodes
            const connectedEdges = node.connectedEdges();
            const connectedNodes = connectedEdges
              .sources()
              .union(connectedEdges.targets());

            // Highlight outgoing relationships differently
            const outgoingEdges = node.outgoers("edge");
            const incomingEdges = node.incomers("edge");

            // Apply different highlighting for direction
            outgoingEdges.addClass("highlighted-outgoing");
            incomingEdges.addClass("highlighted-incoming");

            // Highlight connected nodes
            connectedNodes.addClass("highlighted");

            // Fade non-connected elements
            cy.elements()
              .not(connectedNodes)
              .not(connectedEdges)
              .not(node)
              .addClass("faded");

            console.log(
              `🔗 Highlighted ${connectedNodes.length - 1} connected nodes, ${outgoingEdges.length} outgoing, ${incomingEdges.length} incoming`
            );
          }

          // Load enhanced node details
          atlasState.setIsLoadingNodeDetails(true);
          try {
            const result = await apiService.loadNodeDetails(nodeData.uid);

            if (result.success) {
              atlasState.setSelectedNodeDetails(result.data);
            }
          } catch (error) {
            console.error("Error loading node details:", error);
          } finally {
            atlasState.setIsLoadingNodeDetails(false);
          }
        } catch (error) {
          console.error("❌ Node click handler error:", error);
        }
      });

      // Double-click to switch to ego network (Rabbit Hole feature)
      cy.on("dbltap", "node", (event) => {
        try {
          const node = event.target;
          const nodeData = node.data("originalNode");

          if (nodeData) {
            console.log(
              `🎯 Double-click: Switching to ego network for ${nodeData.name} (hops=2, nodeLimit=50)`
            );
            // Apply optimal double-click settings: 2 hops, 50 nodes max
            graphTiles.centerOnEntity(nodeData.uid, nodeData.name, {
              hops: 2,
              nodeLimit: 50,
            });
          }
        } catch (error) {
          console.warn("⚠️ Double-click handler error:", error);
        }
      });

      // Background click handler
      cy.on("tap", (event) => {
        try {
          if (event.target === cy) {
            cy.elements().removeClass(
              "selected highlighted faded highlighted-outgoing highlighted-incoming highlighted-neutral"
            );
            atlasState.setSelectedNode(null);
            atlasState.setSelectedNodeDetails(null);
          }
        } catch (error) {
          console.warn("⚠️ Background click handler error:", error);
        }
      });

      // Context menu handler
      cy.on("cxttap", (event) => {
        try {
          event.preventDefault();
          const { type, target } = getContextMenuType(event);

          openContextMenu(
            type,
            event.originalEvent.clientX,
            event.originalEvent.clientY,
            target
          );
        } catch (error) {
          console.warn("⚠️ Context menu handler error:", error);
        }
      });

      // Tooltip hover handlers
      let currentTooltip: HTMLElement | null = null;
      let showTooltipTimeout: NodeJS.Timeout | null = null;
      let hideTooltipTimeout: NodeJS.Timeout | null = null;

      cy.on("mouseover", "node", (event) => {
        try {
          const node = event.target;

          // Clear any existing hide timeout
          if (hideTooltipTimeout) {
            clearTimeout(hideTooltipTimeout);
            hideTooltipTimeout = null;
          }

          // If there's already a tooltip for this node, don't create a new one
          if (node.data("tooltip")) {
            const existingTooltip = node.data("tooltip");
            showTooltip(existingTooltip);
            currentTooltip = existingTooltip;
            return;
          }

          // Clear any existing show timeout
          if (showTooltipTimeout) {
            clearTimeout(showTooltipTimeout);
            showTooltipTimeout = null;
          }

          // Set a delay before showing the tooltip (500ms)
          showTooltipTimeout = setTimeout(() => {
            try {
              // Extract entity information
              const { name, uid } = extractEntityInfo(node);

              // Create tooltip content
              const tooltipContent = createTooltipContent(name, uid);

              // Create popper instance
              const popperInstance = node.popper({
                content: () => tooltipContent,
                popper: {
                  placement: "top",
                },
              });

              currentTooltip = tooltipContent;

              // Show tooltip immediately after creation
              showTooltip(tooltipContent);

              // Store references for cleanup
              node.data("tooltip", tooltipContent);
              node.data("popperInstance", popperInstance);

              showTooltipTimeout = null;
            } catch (error) {
              console.warn("⚠️ Tooltip creation error:", error);
            }
          }, 500); // 500ms delay before showing tooltip
        } catch (error) {
          console.warn("⚠️ Tooltip mouseover error:", error);
        }
      });

      cy.on("mouseout", "node", (event) => {
        try {
          const node = event.target;

          // Clear any pending show timeout
          if (showTooltipTimeout) {
            clearTimeout(showTooltipTimeout);
            showTooltipTimeout = null;
          }

          const tooltip = node.data("tooltip");
          if (tooltip) {
            // Hide tooltip immediately
            hideTooltip(tooltip);

            // Cleanup after animation
            hideTooltipTimeout = setTimeout(() => {
              destroyTooltip(tooltip);
              node.removeData("tooltip");
              node.removeData("popperInstance");
              if (currentTooltip === tooltip) {
                currentTooltip = null;
              }
              hideTooltipTimeout = null;
            }, 200); // Match the CSS transition duration
          }
        } catch (error) {
          console.warn("⚠️ Tooltip mouseout error:", error);
        }
      });

      // Add entity icons
      cy.ready(() => {
        try {
          cy.nodes().forEach((node) => {
            const entityType = node.data("type");
            const emoji = getEntityImage(entityType);

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (ctx) {
              canvas.width = 64;
              canvas.height = 64;
              ctx.font = "48px Arial";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(emoji, 32, 32);

              const imageUrl = canvas.toDataURL();
              node.style({
                "background-image": imageUrl,
                "background-fit": "contain",
                "background-width": "70%",
                "background-height": "70%",
              });
            }
          });
        } catch (error) {
          console.warn("⚠️ Failed to add entity icons:", error);
        }
      });

      // Auto-fit graph when visiting atlas homepage (no zoom/pan params)
      try {
        const hasCustomViewport =
          graphTiles.zoom !== 1 ||
          graphTiles.pan.x !== 0 ||
          graphTiles.pan.y !== 0;

        if (hasCustomViewport) {
          // Restore zoom and pan from URL state
          cy.zoom(graphTiles.zoom);
          cy.pan(graphTiles.pan);
          console.log(
            `🔍 Restored viewport: zoom=${graphTiles.zoom}, pan=(${graphTiles.pan.x}, ${graphTiles.pan.y})`
          );
        } else {
          // Auto-fit graph to screen when no custom viewport
          cy.fit();
          setTimeout(() => {
            try {
              const newZoom = cy.zoom();
              const newPan = cy.pan();
              graphTiles.setViewport(Math.round(newZoom * 100) / 100, {
                x: Math.round(newPan.x),
                y: Math.round(newPan.y),
              });
              console.log("🎯 Auto-fitted graph to screen on homepage visit");
            } catch (error) {
              console.warn(
                "⚠️ Failed to update viewport after auto-fit:",
                error
              );
            }
          }, 100);
        }
      } catch (error) {
        console.warn("⚠️ Failed to handle viewport state:", error);
      }

      // Add zoom and pan event listeners for URL persistence
      let viewportUpdateTimeout: NodeJS.Timeout;

      const handleViewportChange = () => {
        // Debounce viewport updates to avoid too many URL changes
        clearTimeout(viewportUpdateTimeout);
        viewportUpdateTimeout = setTimeout(() => {
          try {
            const currentZoom = cy.zoom();
            const currentPan = cy.pan();

            // Only update if values have actually changed (avoid infinite loops)
            const zoomChanged = Math.abs(currentZoom - graphTiles.zoom) > 0.01;
            const panChanged =
              Math.abs(currentPan.x - graphTiles.pan.x) > 1 ||
              Math.abs(currentPan.y - graphTiles.pan.y) > 1;

            if (zoomChanged || panChanged) {
              graphTiles.setViewport(
                Math.round(currentZoom * 100) / 100, // Round to 2 decimal places
                {
                  x: Math.round(currentPan.x),
                  y: Math.round(currentPan.y),
                }
              );
            }
          } catch (error) {
            console.warn("⚠️ Failed to update viewport state:", error);
          }
        }, 300); // 300ms debounce
      };

      cy.on("zoom pan", handleViewportChange);

      cyRef.current = cy;

      // Performance optimizations for large datasets
      const performanceConfig = getPerformanceConfig(elements.length);
      const elementManager = new CytoscapeElementManager(cy, performanceConfig);
      const performanceMonitor = new CytoscapePerformanceMonitor();

      // Setup viewport culling for large datasets
      if (performanceConfig.viewportCullingEnabled) {
        const viewportHandler = createViewportCullingHandler(
          cy,
          performanceConfig
        );
        cy.on("zoom pan", viewportHandler);

        console.log(
          `🚀 Performance optimization enabled: ${elements.length} elements, viewport culling: ${performanceConfig.viewportCullingEnabled}`
        );
      }

      // Log performance configuration
      if (elements.length > 1000) {
        console.log("🔧 Large dataset detected:", {
          elements: elements.length,
          maxElements: performanceConfig.maxElements,
          batchSize: performanceConfig.batchSize,
          viewportCulling: performanceConfig.viewportCullingEnabled,
          animations: performanceConfig.animationsEnabled,
        });
      }

      return () => {
        // Cleanup viewport update timeout
        clearTimeout(viewportUpdateTimeout);

        // Cleanup tooltips before destroying cytoscape
        if (currentTooltip) {
          destroyTooltip(currentTooltip);
          currentTooltip = null;
        }
        if (showTooltipTimeout) {
          clearTimeout(showTooltipTimeout);
          showTooltipTimeout = null;
        }
        if (hideTooltipTimeout) {
          clearTimeout(hideTooltipTimeout);
          hideTooltipTimeout = null;
        }

        // Cleanup any remaining tooltips from nodes
        if (cy && !(cy as any).destroyed()) {
          (cy as any).nodes().forEach((node: any) => {
            const tooltip = node.data("tooltip");
            if (tooltip) {
              destroyTooltip(tooltip);
              node.removeData("tooltip");
              node.removeData("popperInstance");
            }
          });

          (cy as any).destroy();
        }
      };
    } catch (error) {
      console.error("❌ Cytoscape initialization failed:", error);
      console.error("🔍 Elements that caused error:", elements);
    }
  }, [
    transformData,
    showLabels,
    highlightConnections,
    graphData,
    atlasState.isLoading,
    graphTiles.viewMode, // Re-initialize when view mode changes for edge label control
  ]);

  // Apply entity type filtering
  useEffect(() => {
    if (cyRef.current && !cyRef.current.destroyed()) {
      try {
        // Show all nodes first
        cyRef.current.nodes().style("display", "element");

        // Hide nodes of hidden entity types
        hiddenEntityTypes.forEach((entityType) => {
          cyRef
            .current!.nodes(`[type="${entityType}"]`)
            .style("display", "none");
        });

        // Hide edges where either source or target node is hidden
        cyRef.current.edges().forEach((edge) => {
          const sourceNode = cyRef.current!.getElementById(edge.data("source"));
          const targetNode = cyRef.current!.getElementById(edge.data("target"));

          if (
            sourceNode.style("display") === "none" ||
            targetNode.style("display") === "none"
          ) {
            edge.style("display", "none");
          } else {
            edge.style("display", "element");
          }
        });

        console.log(
          `🔍 Filtered view: hiding ${hiddenEntityTypes.size} entity types`
        );
      } catch (error) {
        console.warn("⚠️ Failed to apply entity type filtering:", error);
      }
    }
  }, [hiddenEntityTypes]);

  // Update layout when type changes
  useEffect(() => {
    if (cyRef.current && graphData && !cyRef.current.destroyed()) {
      try {
        console.log(`🔄 Switching to "${layoutType}" layout...`);

        // Clean the layout type (remove any CSS classes)
        const cleanLayoutType = layoutType.split(" ")[0] as
          | "breadthfirst"
          | "force"
          | "atlas";
        console.log(`🧹 Cleaned layout type: "${cleanLayoutType}"`);

        // Stop any running layouts
        cyRef.current.stop();

        // Apply new layout with conditional animation
        const layoutConfig = getLayoutConfig(cleanLayoutType);

        // Disable animations for full atlas view to improve performance
        if (
          graphTiles.viewMode === "full-atlas" &&
          cleanLayoutType === "atlas"
        ) {
          layoutConfig.animate = false;
          console.log(
            "📐 Layout config (animations disabled for full atlas):",
            layoutConfig
          );
        } else {
          console.log("📐 Layout config:", layoutConfig);
        }

        const layout = cyRef.current.layout(layoutConfig);

        layout.on("layoutstart", () => {
          console.log(`▶️ ${cleanLayoutType} layout started`);
        });

        layout.on("layoutstop", () => {
          console.log(`✅ ${cleanLayoutType} layout completed`);
        });

        layout.run();
      } catch (error) {
        console.error(`❌ Failed to apply ${layoutType} layout:`, error);
        console.error("Error details:", error);
      }
    }
  }, [layoutType, graphTiles.viewMode]);

  // Update label visibility
  useEffect(() => {
    if (cyRef.current && !cyRef.current.destroyed()) {
      try {
        cyRef.current
          .style()
          .selector("node")
          .style("label", showLabels ? "data(label)" : "")
          .update();

        // Use view-mode-specific edge label logic
        const shouldShowEdges = shouldShowEdgeLabels(
          graphTiles.viewMode as ViewMode,
          showLabels
        );
        cyRef.current
          .style()
          .selector("edge")
          .style("label", shouldShowEdges ? "data(label)" : "")
          .update();

        console.log(
          `🔧 Updated edge labels: ${shouldShowEdges ? "visible" : "hidden"} for ${graphTiles.viewMode} mode`
        );
      } catch (error) {
        console.warn("⚠️ Failed to update label visibility:", error);
      }
    }
  }, [showLabels, graphTiles.viewMode]); // Include viewMode for dynamic updates

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph Visualization Area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Loading Overlay */}
          <LoadingOverlay
            isLoading={atlasState.isLoading}
            viewMode={graphTiles.viewMode}
            graphData={graphData}
          />

          {/* Timeline Chart for Time Slice Mode */}
          {showTimeline && graphTiles.viewMode === "timeslice" && graphData && (
            <div className="absolute top-4 left-4 right-4 z-10">
              <div className="bg-card/95 rounded-lg shadow-lg border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Timeline Navigation
                  </h3>
                  <button
                    onClick={() => setShowTimeline(false)}
                    className="text-muted-foreground hover:text-foreground text-sm"
                  >
                    ✕
                  </button>
                </div>
                <TimelineChart
                  data={timelineAggregation.data?.bins || []}
                  granularity={timelineAggregation.data?.granularity || "day"}
                  timeWindow={graphTiles.timeWindow}
                  onTimeRangeSelect={graphTiles.setTimeWindow}
                  height={150}
                  className="bg-background rounded border border-border"
                />
              </div>
            </div>
          )}

          {/* Main Graph Visualization */}
          <div
            ref={containerRef}
            className="w-full h-full"
            style={{ cursor: "grab" }}
          />

          {/* Floating Details Panel */}
          {atlasState.selectedNode && atlasState.selectedNodeDetails && (
            <FloatingDetailsPanel
              node={atlasState.selectedNodeDetails}
              onClose={() => {
                cyRef.current
                  ?.elements()
                  .removeClass(
                    "selected highlighted faded highlighted-outgoing highlighted-incoming highlighted-neutral"
                  );
                atlasState.clearSelection();
              }}
              isLoading={atlasState.isLoadingNodeDetails}
              onOpenResearchReport={handleOpenResearchReport}
              isSignedIn={isSignedIn}
            />
          )}

          {/* Settings Panel */}
          <AtlasSettingsPanel
            isOpen={showSettingsPanel}
            onClose={() => setShowSettingsPanel(false)}
            position={settingsPosition}
            viewMode={graphTiles.viewMode}
            centerEntity={graphTiles.centerEntity}
            communityId={graphTiles.communityId}
            timeWindow={graphTiles.timeWindow}
            egoSettings={graphTiles.egoSettings}
            layoutType={layoutType}
            showLabels={showLabels}
            highlightConnections={highlightConnections}
            showTimeline={showTimeline}
            edgeCount={graphData?.edges.length || 0}
            onViewModeChange={graphTiles.setViewMode}
            onCenterEntityChange={(entityId, entityLabel) => {
              if (entityId) {
                graphTiles.centerOnEntity(entityId, entityLabel);
              } else {
                graphTiles.setCenterEntity(null);
              }
            }}
            onCommunityIdChange={graphTiles.setCommunityId}
            onTimeWindowChange={graphTiles.setTimeWindow}
            onEgoSettingsChange={(settings) => {
              graphTiles.setEgoSettings({
                hops: settings.hops,
                nodeLimit: settings.nodeLimit,
                sentiments: null,
              });
            }}
            onLayoutTypeChange={(type) => {
              console.log(`🎛️ Layout changed to: ${type}`);
              setLayoutType(type);
            }}
            onShowLabelsChange={setShowLabels}
            onHighlightConnectionsChange={setHighlightConnections}
            onShowTimelineChange={setShowTimeline}
            existingEntities={atlasState.existingEntities}
          />

          {/* Legend V2 - Enhanced with domain filtering */}
          <LegendV2
            graphData={graphData}
            hiddenEntityTypes={hiddenEntityTypes}
            onToggleEntityType={toggleEntityType}
            onToggleMultipleEntityTypes={toggleMultipleEntityTypes}
            onShowAllEntityTypes={showAllEntityTypes}
            onIsolateEntityTypes={isolateEntityTypes}
            settingsPosition={settingsPosition}
            viewMode={graphTiles.viewMode}
            maxVisibleItems={10}
          />
        </div>
      </div>

      {/* Add Entity Form */}
      <AddEntityForm
        isVisible={atlasState.showAddForm}
        onClose={() => atlasState.closeAddForm()}
        onEntityAdded={handleEntityAdded}
        onRelationshipAdded={handleRelationshipAdded}
        existingEntities={atlasState.existingEntities}
      />

      {/* Bulk Import Panel */}
      <BulkImportPanel
        isVisible={atlasState.showBulkImport}
        onClose={() => atlasState.closeBulkImport()}
        onImportComplete={(result) => {
          console.log("🎉 onImportComplete: Callback triggered!");
          console.log("📦 Bulk import completed:", result);
          console.log("🔄 Refreshing graph data after import...");

          // // Immediate refresh to update UI counts
          // refreshGraphData();

          // Also refresh after a delay to ensure all data is processed
          setTimeout(() => {
            console.log("🔄 Secondary refresh after import (1s delay)...");
            refreshGraphData();
          }, 1000);
        }}
      />

      {/* Centralized Dialog Management - Includes Entity Merge Dialog */}
      <DialogRegistry />

      {/* Research Mode Import Dialog */}
      <ResearchModeImportDialog
        isOpen={researchImportDialog.isOpen}
        entityUid={researchImportDialog.entityUid}
        entityName={researchImportDialog.entityName}
        onClose={researchImportDialog.close}
        userTier={userTier}
      />

      {/* Context Menu - XState System */}
      <ContextMenuRenderer />

      {/* CopilotKit Integration - Protected by Authentication */}
      {/* <CopilotKitActions /> */}
      {/* <CopilotChatInterface placeholder="Ask me to research entities, analyze networks, or explore timelines..." /> */}
    </div>
  );
}
