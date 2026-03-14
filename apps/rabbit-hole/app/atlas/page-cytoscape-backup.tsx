/**
 * Atlas Landing Page - BACKUP FILE (Cytoscape version)
 *
 * ⚠️ This is a backup of the Cytoscape-based implementation.
 * The main implementation now uses AtlasClient.tsx with modern dialog patterns.
 *
 * For native dialog migrations, see AtlasClient.tsx where:
 * - alert() calls have been replaced with Toast notifications
 * - confirm() calls have been replaced with Toast warnings and async handlers
 *
 * AI-powered entity research platform with interactive knowledge graph
 */

"use client";

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
import { useEntityMergeDialog } from "../hooks/ui";
import { GraphDataStandardizer } from "../lib/graph-data-standardizer";
import Toast from "../lib/toast";
import type { CanonicalGraphData } from "../types/canonical-graph";

import { AtlasHeader } from "./components/AtlasHeader";
import { AtlasSettingsPanel } from "./components/AtlasSettingsPanel";
import { ControlButtons } from "./components/ControlButtons";
import { LegendV2 } from "./components/LegendV2";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { TimelineChart } from "./components/TimelineChart";
import { ViewModeIndicator } from "./components/ViewModeIndicator";
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

export default function AtlasPage() {
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
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const apiService = useRef(new AtlasApiService()).current;

  // Core UI state management
  const atlasState = useAtlasState();
  const graphTiles = useGraphTilesNuqs(); // Using nuqs with proper Next.js App Router adapter
  const entityMergeDialog = useEntityMergeDialog();

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
            alert(`🔍 Relationship Analysis: ${relationshipType}
            
Strength Score: ${Math.round(analysis.relationshipStrength.score * 100)}%
Factors: ${analysis.relationshipStrength.factors.join(", ")}

Data Quality: ${analysis.researchInsights.dataQuality.toUpperCase()}
${
  analysis.researchInsights.missingInformation.length > 0
    ? `Missing: ${analysis.researchInsights.missingInformation.join(", ")}`
    : "✅ Complete data available"
}

${
  analysis.contextualAnalysis.networkContext.mutualConnections > 0
    ? `Mutual Connections: ${analysis.contextualAnalysis.networkContext.mutualConnections}`
    : "No mutual connections found"
}`);
          } else {
            alert(`❌ Analysis failed: ${data.error}`);
          }
        })
        .catch((error) => {
          console.error("Relationship analysis error:", error);
          alert(`❌ Analysis error: ${error.message}`);
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
    atlasState.startLoading();
    try {
      const result = await apiService.refreshGraphData();

      if (result.success && result.data) {
        console.log(
          `📊 Received fresh data: ${result.data.nodes.length} nodes, ${result.data.edges.length} edges`
        );

        setGraphData(result.data);

        atlasState.updateExistingEntitiesFromGraphData(result.data);

        console.log(
          `✅ State updated: ${result.data.nodes.length} nodes, ${result.data.edges.length} edges`
        );
      } else {
        console.error("Failed to refresh graph data:", result.error);
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

  // Context menu actions (memoized to prevent infinite loops)
  const contextMenuActions = useMemo<ContextMenuActions>(
    () => ({
      // Node actions
      onShowNodeDetails: async (nodeData) => {
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

      onEditNode: (nodeData) => {
        console.log("Edit node:", nodeData.name);
        atlasState.setSelectedNode(nodeData);
        atlasState.openAddForm();
      },

      onExpandConnections: (nodeData) => {
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

            // Highlight nodes
            connectedNodes.addClass("highlighted");

            // Highlight edges with direction indication
            outgoingEdges.addClass("highlighted-outgoing");
            incomingEdges.addClass("highlighted-incoming");

            // Fade non-connected elements
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
      },

      // Rabbit Hole Schema - New Context Menu Actions
      onViewEgoNetwork: (nodeData) => {
        // Apply optimal ego network settings: 2 hops, 50 nodes max
        graphTiles.centerOnEntity(nodeData.uid, nodeData.name, {
          hops: 2,
          nodeLimit: 50,
        });
      },

      onViewTimeline: async (nodeData) => {
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

      onViewEvidencePack: async (nodeData) => {
        // This would work better for content nodes, but we can show a message for entities
        console.log(`📦 Evidence pack requested for ${nodeData.name}`);
        Toast.info(
          "Evidence Pack Info",
          "For entity evidence, check the Timeline view which shows all supporting sources. Evidence packs are available for specific content items (posts, articles, etc.)."
        );
      },

      onCenterOnNode: (nodeData) => {
        if (cyRef.current && !cyRef.current.destroyed()) {
          try {
            const node = cyRef.current.getElementById(nodeData.uid);
            cyRef.current.animate(
              {
                center: { eles: node },
                zoom: 1.5,
              },
              { duration: 500 }
            );
          } catch (error) {
            console.warn("⚠️ Failed to center on node:", error);
          }
        }
      },

      // Background actions
      onAddEntity: async (position) => {
        const entityName = prompt(
          "Enter the name of the person you want to research:"
        );

        if (!entityName || entityName.trim() === "") {
          return;
        }

        const trimmedName = entityName.trim();
        const useWikipedia = confirm(
          `Research "${trimmedName}" using Wikipedia search?`
        );

        console.log(`🔍 Starting person research for: ${trimmedName}`);

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

      onResetView: () => {
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

            // Update URL state to reflect reset
            graphTiles.setViewport(1, { x: 0, y: 0 });

            console.log("🔄 Graph view reset to default");
          } catch (error) {
            console.warn("⚠️ Failed to reset view:", error);
          }
        }
      },

      onFitToScreen: () => {
        if (cyRef.current && !cyRef.current.destroyed()) {
          try {
            cyRef.current.fit();

            // Update URL state to reflect new fit
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
            }, 100); // Small delay to let Cytoscape finish fit animation
          } catch (error) {
            console.warn("⚠️ Failed to fit to screen:", error);
          }
        }
      },

      onToggleLayout: () => {
        const layouts: ("breadthfirst" | "force" | "atlas")[] = [
          "breadthfirst",
          "force",
          "atlas",
        ];
        const currentIndex = layouts.indexOf(layoutType);
        const nextLayout = layouts[(currentIndex + 1) % layouts.length];
        setLayoutType(nextLayout);
      },

      onBulkImport: () => {
        atlasState.openBulkImport();
      },

      onExportBundle: () => {
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
      },

      onShowSettings: () => {
        setShowSettingsPanel(true);
      },

      // Advanced actions
      onMergeWithEntity: (nodeData) => {
        console.log(`🔗 Initiating merge for entity: ${nodeData.name}`);
        entityMergeDialog.open({
          uid: nodeData.uid,
          name: nodeData.name,
          type: nodeData.type,
          aliases: nodeData.metadata.aliases || [],
          tags: nodeData.metadata.tags || [],
          properties: nodeData.properties || {},
          ...nodeData, // Include all node data for reference
        });
      },

      onDuplicateNode: (nodeData) => {
        console.log(
          `📋 Duplicate functionality not yet implemented for: ${nodeData.name}`
        );
        // TODO: Implement entity duplication
      },

      onDeleteNode: async (nodeData) => {
        const relationshipCount =
          cyRef.current?.getElementById(nodeData.uid)?.connectedEdges()
            .length || 0;

        const message =
          relationshipCount > 0
            ? `Are you sure you want to delete "${nodeData.name}"?\n\nThis will remove the entity and ${relationshipCount} connected relationships from the knowledge graph.`
            : `Are you sure you want to delete "${nodeData.name}"?\n\nThis entity has no relationships and will be permanently removed.`;

        const confirmed = confirm(message);
        if (!confirmed) return;

        try {
          console.log(`🗑️ Deleting entity: ${nodeData.name} (${nodeData.uid})`);

          const response = await fetch("/api/entity-delete", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entityId: nodeData.uid,
              force: true, // Allow deletion even with relationships
            }),
          });

          const result = await response.json();

          if (result.success) {
            console.log(`✅ Entity deleted: ${result.deletedEntity.name}`);
            console.log(
              `   • Relationships deleted: ${result.deletedRelationships}`
            );

            // Refresh the graph to show the deletion
            refreshGraphData();

            // Show success feedback
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

      onCreateRelationship: (nodeData) => {
        console.log(
          `🔗 Create relationship functionality not yet implemented for: ${nodeData.name}`
        );
        // TODO: Implement relationship creation form
      },

      onOpenInResearchMode: (nodeData: any) => {
        if (!isSignedIn) {
          Toast.error(
            "Authentication Required",
            "Please sign in to use research mode"
          );
          return;
        }

        const entityUid = nodeData.uid || nodeData.id;
        console.log(`🔬 Opening research mode for: ${entityUid}`);

        // Navigate to dedicated research page with proper nuqs format
        const params = new URLSearchParams();
        params.set("entity", entityUid);
        params.set("settings", JSON.stringify({ hops: 0, nodeLimit: 50 }));
        const researchUrl = `/research?${params.toString()}`;
        window.location.href = researchUrl;

        Toast.success(
          "Opening Research Mode",
          "Loading entity in isolated research environment"
        );
      },

      // Edge actions
      onShowEdgeDetails: (edgeData) => {
        console.log(`📊 Edge details for: ${edgeData.label}`, edgeData);
        Toast.info(
          `Edge Details: ${edgeData.label}`,
          `Type: ${edgeData.type} • Source: ${edgeData.source} • Target: ${edgeData.target} • UID: ${edgeData.id}`
        );
      },

      onEditEdge: (edgeData) => {
        console.log(
          `✏️ Edit edge functionality not yet implemented for: ${edgeData.label}`
        );
        // TODO: Implement relationship editing form
      },

      onReverseEdge: async (edgeData) => {
        const confirmed = confirm(
          `Reverse the direction of this relationship?\n\nThis will swap the source and target of: "${edgeData.label}"`
        );
        if (!confirmed) return;

        console.log(
          `↩️ Reverse edge functionality not yet implemented for: ${edgeData.label}`
        );
        // TODO: Implement relationship reversal API call
      },

      onDeleteEdge: async (edgeData) => {
        const confirmed = confirm(
          `Are you sure you want to delete this relationship?\n\n"${edgeData.label}" will be permanently removed from the knowledge graph.`
        );
        if (!confirmed) return;

        try {
          console.log(
            `🗑️ Deleting relationship: ${edgeData.label} (${edgeData.id})`
          );

          const response = await fetch("/api/relationship-delete", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              relationshipId: edgeData.id,
            }),
          });

          const result = await response.json();

          if (result.success) {
            console.log(`✅ Relationship deleted: ${edgeData.label}`);

            // Refresh the graph to show the deletion
            refreshGraphData();

            // Show success feedback
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
    }),
    [
      atlasState,
      apiService,
      refreshGraphData,
      graphTiles,
      entityMergeDialog,
      isSignedIn,
    ]
  );

  // Pass actions to context menu system - no event bridge needed
  useEffect(() => {
    setActions(contextMenuActions);
  }, [contextMenuActions, setActions]);

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
      {/* Atlas Header with View Mode and Controls */}
      <AtlasHeader
        viewModeIndicator={
          <ViewModeIndicator
            viewMode={graphTiles.viewMode}
            centerEntity={graphTiles.centerEntity}
            communityId={graphTiles.communityId}
            timeWindow={graphTiles.timeWindow}
            isBounded={graphData?.meta?.bounded || false}
            existingEntities={atlasState.existingEntities}
            activeDateFilter={activeDateFilter}
          />
        }
        controlButtons={
          <ControlButtons
            onOpenBulkImport={atlasState.openBulkImport}
            onOpenAddForm={atlasState.openAddForm}
            onExport={handleExport}
            onResetView={contextMenuActions.onResetView}
            onFitToScreen={contextMenuActions.onFitToScreen}
          />
        }
        onLogoClick={() => {
          // Reset to default atlas view when logo is clicked
          console.log("🏠 Logo clicked: Resetting to full atlas view");
          graphTiles.setViewMode("full-atlas");
          graphTiles.setCenterEntity(null);
          graphTiles.setCommunityId(null);
          graphTiles.setChatMode(false);

          // Clear any selected nodes
          if (cyRef.current && !cyRef.current.destroyed()) {
            cyRef.current
              .elements()
              .removeClass(
                "selected highlighted faded highlighted-outgoing highlighted-incoming highlighted-neutral"
              );
          }
          atlasState.clearSelection();
        }}
      />

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
          console.log("📦 Bulk import completed:", result);
          console.log("🔄 Refreshing graph data after import...");

          // // Immediate refresh to update UI counts
          // refreshGraphData();

          // Also refresh after a delay to ensure all data is processed
          setTimeout(() => {
            console.log("🔄 Secondary refresh after import...");
            refreshGraphData();
          }, 1000);
        }}
      />

      {/* Centralized Dialog Management - Includes Entity Merge Dialog */}
      <DialogRegistry />

      {/* Context Menu - XState System */}
      <ContextMenuRenderer />

      {/* CopilotKit Integration - Protected by Authentication */}
      {/* <CopilotKitActions /> */}
      {/* <CopilotChatInterface placeholder="Ask me to research entities, analyze networks, or explore timelines..." /> */}
    </div>
  );
}
