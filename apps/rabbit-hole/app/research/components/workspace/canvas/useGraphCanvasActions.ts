/**
 * useGraphCanvasActions - Graph operation handlers
 *
 * Handles:
 * - Layout changes (manual, elk, force)
 * - Entity CRUD operations
 * - Import/export completion
 * - File upload operations
 * - Node interactions
 */

import type Graph from "graphology";
import { useCallback, useOptimistic } from "react";

import type { UserTier } from "@proto/auth/client";
import { logUserAction } from "@proto/logger";
import { useToast } from "@proto/ui/hooks";
import { getEntityColor, getEntityImage } from "@proto/utils/atlas";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "@/graph-visualizer/model/graph";
import { vlog } from "@/lib/verbose-logger";

import type { GraphLayout } from "../../../hooks/useGraphLayout";
import { applyLayout } from "../../../lib/layoutAlgorithms";
import type { LayoutType } from "../../../lib/layoutAlgorithms";

interface UseGraphCanvasActionsProps {
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>;
  graphVersion: number;
  handleGraphChange: () => void;
  currentLayout: GraphLayout;
  setCurrentLayout: (layout: GraphLayout) => void;
  savedPositions: Map<string, { x: number; y: number }>;
  setSavedPositions: (positions: Map<string, { x: number; y: number }>) => void;
  layoutSettings: {
    elk: { layerSpacing: number; nodeSpacing: number };
    force: { repulsion: number; linkDistance: number; collisionRadius: number };
  };
  data: any;
  onDataChange: (data: any) => void;
  userId?: string;
  userTier?: UserTier;
  setShowImportDialog: (show: boolean) => void;
  setGraphVersion: React.Dispatch<React.SetStateAction<number>>;
  editDialog: {
    entityUid: string | null;
    entityType: string | null;
  };
  setExpandedNodes: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function useGraphCanvasActions({
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
}: UseGraphCanvasActionsProps) {
  const { toast } = useToast();

  // Layout change handler
  const handleLayoutChange = useCallback(
    async (layoutType: GraphLayout) => {
      vlog.log(`🔄 Layout change: ${currentLayout} → ${layoutType}`);

      if (userId) {
        const sessionId =
          typeof window !== "undefined"
            ? sessionStorage.getItem("sessionId") || undefined
            : undefined;

        logUserAction({
          action: "graph_layout_change",
          page: "/research",
          userId,
          tier: userTier,
          sessionId,
          target: layoutType,
        });
      }

      // When leaving manual mode, snapshot current positions
      if (currentLayout === "manual" && layoutType !== "manual") {
        const snapshot = new Map<string, { x: number; y: number }>();
        graph.forEachNode((nodeId, attrs) => {
          if (attrs.x !== undefined && attrs.y !== undefined) {
            snapshot.set(nodeId, { x: attrs.x, y: attrs.y });
          }
        });
        setSavedPositions(snapshot);
        vlog.log("📸 Snapshotted manual positions:", {
          count: snapshot.size,
          unit: "nodes",
        });
      }

      // When returning to manual mode, restore saved positions
      if (layoutType === "manual") {
        vlog.log("♻️ Restoring manual positions:", {
          count: savedPositions.size,
          unit: "nodes",
        });
        savedPositions.forEach((pos, nodeId) => {
          if (graph.hasNode(nodeId)) {
            graph.mergeNodeAttributes(nodeId, pos);
          }
        });
        setCurrentLayout(layoutType);
        handleGraphChange();

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("research:canvas:fit-view"));
        }, 100);

        onDataChange({
          ...data,
          layoutMode: layoutType,
        });
        return;
      }

      // Apply computed layout (elk/force)
      const options =
        layoutType === "elk"
          ? {
              spacing: layoutSettings.elk.layerSpacing,
              nodeSpacing: layoutSettings.elk.nodeSpacing,
            }
          : {
              strength: -layoutSettings.force.repulsion,
              distance: layoutSettings.force.linkDistance,
              collisionRadius: layoutSettings.force.collisionRadius,
            };

      const fromCache = !(await applyLayout(
        graph,
        layoutType as LayoutType,
        options
      ));
      setCurrentLayout(layoutType);
      handleGraphChange();
      vlog.log(
        fromCache ? `✨ Layout cached` : `✨ Applied ${layoutType} layout`
      );

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("research:canvas:fit-view"));
      }, 100);

      onDataChange({
        ...data,
        layoutMode: layoutType,
      });
    },
    [
      graph,
      handleGraphChange,
      data,
      onDataChange,
      currentLayout,
      savedPositions,
      setSavedPositions,
      setCurrentLayout,
      layoutSettings,
      userId,
      userTier,
    ]
  );

  // Import completion handler
  const handleImportComplete = useCallback(
    (result: any) => {
      const serialized = {
        nodes: graph.nodes().map((nodeId) => ({
          id: nodeId,
          ...graph.getNodeAttributes(nodeId),
        })),
        edges: graph.edges().map((edgeId) => {
          const [source, target] = graph.extremities(edgeId);
          const {
            source: _,
            target: __,
            ...attributes
          } = graph.getEdgeAttributes(edgeId) as any;
          return {
            id: edgeId,
            source,
            target,
            ...attributes,
          };
        }),
      };

      setGraphVersion((v) => v + 1);
      onDataChange({
        ...data,
        graphData: serialized,
      });

      if (result.entitiesAdded > 0 || result.relationshipsAdded > 0) {
        toast({
          title: "Import Successful",
          description: `Added ${result.entitiesAdded} entities and ${result.relationshipsAdded} relationships`,
        });
      }

      if (result.warnings.length > 0) {
        toast({
          title: "Import Warnings",
          description: `${result.warnings.length} warning(s) during import`,
          variant: "default",
        });
      }

      if (result.errors.length > 0) {
        toast({
          title: "Import Errors",
          description: `${result.errors.length} error(s) during import`,
          variant: "destructive",
        });
      }

      setTimeout(() => {
        setShowImportDialog(false);
      }, 2000);
    },
    [data, graph, onDataChange, setGraphVersion, setShowImportDialog, toast]
  );

  // File upload success handler
  const handleFileUploadSuccess = useCallback(
    (uploadData: {
      entityUid: string;
      storageMetadata: Record<string, any>;
    }) => {
      if (!graph.hasNode(uploadData.entityUid)) {
        vlog.log(`⚠️ Node ${uploadData.entityUid} not found in graph`);
        return;
      }

      vlog.log(
        `📤 Updating file entity ${uploadData.entityUid} with storage metadata`
      );

      const currentProps =
        graph.getNodeAttribute(uploadData.entityUid, "properties") || {};

      const updates: any = {
        properties: {
          ...currentProps,
          ...uploadData.storageMetadata,
        },
      };

      if (uploadData.storageMetadata.filename) {
        updates.name = uploadData.storageMetadata.filename;
      }

      graph.mergeNodeAttributes(uploadData.entityUid, updates);
      handleGraphChange();

      toast({
        title: "File Uploaded",
        description: `${uploadData.storageMetadata.filename || "File"} uploaded successfully`,
      });

      vlog.log(`✅ File entity updated in workspace`);
    },
    [graph, handleGraphChange, toast]
  );

  // Node interaction handlers
  const handleNodeClick = useCallback((_event: any, _node: any) => {
    // Reserved for future single-click actions
  }, []);

  const handleNodeDoubleClick = useCallback(
    (node: any) => {
      // Toggle expanded state on double-click
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        const nodeId = node.data?.uid || node.id;
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        return next;
      });
    },
    [setExpandedNodes]
  );

  // React 19: Optimistic updates for entity editing
  const [optimisticGraphVersion, addOptimisticUpdate] = useOptimistic(
    graphVersion,
    (
      currentVersion,
      _update: { uid: string; updates: Partial<GraphNodeAttributes> }
    ) => {
      return currentVersion + 1;
    }
  );

  const handleEntityUpdate = useCallback(
    async (updatedData: any) => {
      if (!editDialog.entityUid) return;

      const { name, tags, aliases, ...customFields } = updatedData;
      const updates = {
        name,
        properties: customFields,
        tags,
        aliases,
      };

      try {
        console.log("🔄 Updating entity:", editDialog.entityUid);

        // React 19: Instant optimistic update
        addOptimisticUpdate({ uid: editDialog.entityUid, updates });

        // Actual graph mutation
        graph.mergeNodeAttributes(editDialog.entityUid, updates);
        handleGraphChange();

        toast({
          title: "Entity Updated",
          description: `${name} saved successfully`,
        });

        logUserAction({
          action: "entity_updated",
          page: "/research",
          userId,
          target: editDialog.entityType || "unknown",
          value: editDialog.entityUid,
        });
      } catch (error) {
        console.error("❌ Update error:", error);
        toast({
          title: "Update Failed",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
        throw error;
      }
    },
    [
      editDialog.entityUid,
      editDialog.entityType,
      graph,
      handleGraphChange,
      toast,
      userId,
      addOptimisticUpdate,
    ]
  );

  // Entity type selector handlers
  const handleEntityTypeSelected = useCallback(
    (
      entityType: string,
      pendingEntityPosition: { flowX: number; flowY: number } | null
    ) => {
      if (!pendingEntityPosition) return;

      const { flowX, flowY } = pendingEntityPosition;
      const uid = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      try {
        graph.addNode(uid, {
          uid,
          name: `New ${entityType}`,
          type: entityType,
          x: flowX,
          y: flowY,
          color: getEntityColor(entityType),
          icon: getEntityImage(entityType),
          size: 10,
        });

        handleGraphChange();

        logUserAction({
          action: "Entity Created",
          page: "research",
          userId,
          target: entityType,
          value: "context_menu_with_type_selector",
        });

        toast({
          title: "Entity Created",
          description: `New ${entityType} added to canvas`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create entity",
          variant: "destructive",
        });
      }
    },
    [graph, handleGraphChange, userId, toast]
  );

  return {
    // Layout
    handleLayoutChange,

    // Import/Export
    handleImportComplete,

    // File operations
    handleFileUploadSuccess,

    // Node interactions
    handleNodeClick,
    handleNodeDoubleClick,

    // Entity operations
    handleEntityUpdate,
    handleEntityTypeSelected,
    optimisticGraphVersion,
  };
}
