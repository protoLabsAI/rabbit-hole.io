/**
 * Graph Context Menu Actions Hook
 *
 * Provides stable context menu action handlers for graph operations.
 * Extracted to prevent infinite re-render loops and improve reusability.
 *
 * Pattern: All callbacks are memoized with stable dependencies.
 * Import/export handlers are passed as refs to avoid circular dependencies.
 */

import type Graph from "graphology";
import { useCallback, useMemo } from "react";

import {
  getUserRoleClient,
  hasMinimumRole,
  USER_ROLES,
} from "@proto/auth/client";
import { logUserAction } from "@proto/logger";
import { useToast } from "@proto/ui/hooks";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "@/graph-visualizer/model/graph";

import type { ResearchMenuActions } from "../../context-menu/registry/researchActions";
import { useConfirmDialog } from "../components/ConfirmDialog";
import { validateBundle } from "../lib/bundle-validator";
import type { ResearchBundle } from "../lib/bundle-validator";

interface UseGraphContextActionsOptions {
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>;
  onGraphChange: () => void;
  userId?: string;
  tabId?: string; // Tab ID for scoping freehand drawings per tab
  expandedNodes: Set<string>;
  setExpandedNodes: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleExport: () => void;
  handleImport: () => void;
  onOpenEntityTypeSelector?: (
    flowX: number,
    flowY: number,
    x: number,
    y: number
  ) => void;
  onOpenEditDialog?: (
    uid: string,
    type: string,
    initialData: Record<string, any>
  ) => void;
  onOpenEnrichmentDialog?: (nodeData: GraphNodeAttributes) => void;
  onOpenFilterPanel?: () => void;
  onOpenFileExtractionDialog?: () => void;
  onOpenResearchWizard?: () => void;
  onOpenMergeDialog?: (bundle: ResearchBundle) => void;
  ydoc?: any; // Yjs document for clearing freehand drawings
}

export function useGraphContextActions({
  graph,
  onGraphChange,
  userId,
  tabId,
  expandedNodes,
  setExpandedNodes,
  handleExport,
  handleImport,
  onOpenEntityTypeSelector,
  onOpenEditDialog,
  onOpenEnrichmentDialog,
  onOpenFilterPanel,
  onOpenFileExtractionDialog,
  onOpenResearchWizard,
  onOpenMergeDialog,
  ydoc,
}: UseGraphContextActionsOptions): ResearchMenuActions {
  const { toast } = useToast();
  const { confirm: confirmDialog } = useConfirmDialog();
  const user = { id: "local-user", firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], primaryEmailAddress: { emailAddress: "local@localhost" } } as any;

  const onAddEntity = useCallback(
    (context?: { flowX?: number; flowY?: number; x?: number; y?: number }) => {
      if (context?.flowX == null || context?.flowY == null) {
        toast({
          title: "Error",
          description: "Could not determine position for new entity",
          variant: "destructive",
        });
        return;
      }

      // Open entity type selector instead of immediately creating entity
      if (onOpenEntityTypeSelector) {
        onOpenEntityTypeSelector(
          context.flowX,
          context.flowY,
          context.x ?? 0,
          context.y ?? 0
        );
      } else {
        // Fallback: create generic entity if selector not available
        const uid = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        const entityType = "Entity";

        try {
          graph.addNode(uid, {
            uid,
            name: "New Entity",
            type: entityType,
            x: context.flowX,
            y: context.flowY,
            color: "#6B7280",
            icon: "📦",
            size: 10,
          });

          onGraphChange();

          logUserAction({
            action: "Entity Created",
            page: "research",
            userId,
            target: entityType,
            value: "context_menu",
          });

          toast({
            title: "Entity Created",
            description: "New entity added to canvas",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to create entity",
            variant: "destructive",
          });
        }
      }
    },
    [graph, onGraphChange, userId, toast, onOpenEntityTypeSelector]
  );

  const onDeleteNode = useCallback(
    async (nodeData: any) => {
      const confirmed = await confirmDialog({
        title: `Delete ${nodeData.name}?`,
        description: "This action cannot be undone.",
        confirmText: "Delete",
        cancelText: "Cancel",
        variant: "destructive",
      });

      if (confirmed) {
        graph.dropNode(nodeData.uid);
        onGraphChange();
        toast({
          title: "Entity Deleted",
          description: `Deleted ${nodeData.name}`,
        });
      }
    },
    [graph, onGraphChange, toast, confirmDialog]
  );

  const onShowNodeDetails = useCallback(
    (nodeData: any) => {
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        const nodeId = nodeData.uid;
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

  const onResetGraph = useCallback(async () => {
    // All session participants can reset graph (simplified permissions)
    const confirmed = await confirmDialog({
      title: "Clear all entities and relationships?",
      description:
        "This action cannot be undone. All data will be permanently deleted.",
      confirmText: "Clear All",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (confirmed) {
      graph.clear();

      // CRITICAL: Also clear freehand drawings from Yjs (scoped per tab)
      if (ydoc && userId) {
        const mapKey = tabId ? `freehandDrawings-${tabId}` : "freehandDrawings";
        const drawingsMap = ydoc.getMap(mapKey);
        ydoc.transact(() => {
          drawingsMap.clear();
        }, userId);
      }

      onGraphChange();
      toast({
        title: "Graph Cleared",
        description: "All entities, relationships, and drawings removed",
      });
    }
  }, [graph, onGraphChange, toast, ydoc, userId, confirmDialog, tabId]);

  const onEditNode = useCallback(
    (nodeData: GraphNodeAttributes) => {
      // Convert graph node attributes to form data
      const initialData = {
        name: nodeData.name,
        ...(nodeData.properties || {}),
        tags: nodeData.tags || [],
        aliases: nodeData.aliases || [],
      };

      // Open edit dialog
      if (onOpenEditDialog) {
        onOpenEditDialog(nodeData.uid, nodeData.type, initialData);
      } else {
        toast({
          title: "Edit Entity",
          description: "Edit dialog not available",
          variant: "destructive",
        });
      }
    },
    [toast, onOpenEditDialog]
  );

  const onResearchEntity = useCallback(
    (nodeData: GraphNodeAttributes) => {
      // Open enrichment config dialog instead of immediate API call
      if (onOpenEnrichmentDialog) {
        onOpenEnrichmentDialog(nodeData);
      } else {
        toast({
          title: "Enrichment Dialog",
          description: "Enrichment dialog not available",
          variant: "destructive",
        });
      }
    },
    [onOpenEnrichmentDialog, toast]
  );

  const onCreateRelationship = useCallback(
    (_nodeData: any) => {
      toast({
        title: "Create Relationship",
        description: "Relationship creation coming soon in workspace mode",
      });
    },
    [toast]
  );

  const onExportBundle = useCallback(() => {
    handleExport();
  }, [handleExport]);

  const onBulkImport = useCallback(() => {
    handleImport();
  }, [handleImport]);

  const onFilterEntityTypes = useCallback(() => {
    if (onOpenFilterPanel) {
      onOpenFilterPanel();
    } else {
      toast({
        title: "Filter Panel",
        description: "Filter panel not available",
        variant: "default",
      });
    }
  }, [onOpenFilterPanel, toast]);

  const onExtractFromFile = useCallback(() => {
    if (onOpenFileExtractionDialog) {
      onOpenFileExtractionDialog();
    } else {
      toast({
        title: "File Extraction",
        description: "File extraction dialog not available",
        variant: "destructive",
      });
    }
  }, [onOpenFileExtractionDialog, toast]);

  const onOpenResearchWizardHandler = useCallback(() => {
    if (onOpenResearchWizard) {
      onOpenResearchWizard();
    } else {
      toast({
        title: "Research Wizard",
        description: "Research wizard not available",
        variant: "destructive",
      });
    }
  }, [onOpenResearchWizard, toast]);

  const onCenterOnNode = useCallback(
    (nodeData: GraphNodeAttributes) => {
      if (!graph.hasNode(nodeData.uid)) {
        toast({
          title: "Error",
          description: "Node not found in graph",
          variant: "destructive",
        });
        return;
      }

      const attrs = graph.getNodeAttributes(nodeData.uid);
      if (attrs.x == null || attrs.y == null) {
        toast({
          title: "Error",
          description: "Node position not available",
          variant: "destructive",
        });
        return;
      }

      // Dispatch event for React Flow to handle centering
      window.dispatchEvent(
        new CustomEvent("research:canvas:center-on-node", {
          detail: { x: attrs.x, y: attrs.y, nodeId: nodeData.uid },
        })
      );

      logUserAction({
        action: "center_on_node",
        page: "research",
        userId,
        target: nodeData.uid,
      });
    },
    [graph, toast, userId]
  );

  const onMergeToNeo4j = useCallback(() => {
    // 1. Check super admin permission
    const userRole = getUserRoleClient(user ?? null);
    const isSuperAdmin = hasMinimumRole(userRole, USER_ROLES.SUPER_ADMIN);

    if (!isSuperAdmin) {
      toast({
        title: "Permission Denied",
        description: "Merge to Neo4j requires super admin access",
        variant: "destructive",
      });
      return;
    }

    // 2. Generate bundle from graph
    const entities = graph.mapNodes((nodeId) => {
      const attrs = graph.getNodeAttributes(nodeId);
      return {
        uid: attrs.uid,
        name: attrs.name,
        type: attrs.type,
        properties: attrs.properties || {},
        tags: attrs.tags || [],
        aliases: attrs.aliases || [],
      };
    });

    const relationships = graph.mapEdges((edgeId) => {
      const attrs = graph.getEdgeAttributes(edgeId);
      return {
        uid: attrs.uid || edgeId,
        source: graph.source(edgeId),
        target: graph.target(edgeId),
        type: attrs.type,
        properties: attrs.properties || {},
      };
    });

    const bundle: ResearchBundle = {
      entities,
      relationships,
      metadata: {
        version: "1.0",
        sessionId: tabId || "local-graph",
        sessionName: "Local Research Graph",
        createdAt: new Date().toISOString(),
        userId: userId || "unknown",
      },
    };

    // 3. Validate bundle
    const validation = validateBundle(bundle);
    if (!validation.valid) {
      toast({
        title: "Invalid Graph Data",
        description: validation.errors[0]?.message || "Graph contains errors",
        variant: "destructive",
      });
      return;
    }

    // 4. Open merge dialog
    if (onOpenMergeDialog) {
      onOpenMergeDialog(bundle);
    } else {
      toast({
        title: "Merge Dialog",
        description: "Merge dialog not available",
        variant: "destructive",
      });
    }
  }, [graph, userId, tabId, toast, user, onOpenMergeDialog]);

  return useMemo(
    () => ({
      onAddEntity,
      onDeleteNode,
      onShowNodeDetails,
      onEditNode,
      onResearchEntity,
      onCreateRelationship,
      onExportBundle,
      onBulkImport,
      onExtractFromFile,
      onOpenResearchWizard: onOpenResearchWizardHandler,
      onResetGraph,
      onFilterEntityTypes,
      onCenterOnNode,
      onMergeToNeo4j,
    }),
    [
      onAddEntity,
      onDeleteNode,
      onShowNodeDetails,
      onEditNode,
      onResearchEntity,
      onCreateRelationship,
      onExportBundle,
      onBulkImport,
      onExtractFromFile,
      onOpenResearchWizardHandler,
      onResetGraph,
      onFilterEntityTypes,
      onCenterOnNode,
      onMergeToNeo4j,
    ]
  );
}
