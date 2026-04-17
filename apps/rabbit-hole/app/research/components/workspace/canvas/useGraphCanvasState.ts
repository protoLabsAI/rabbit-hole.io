/**
 * useGraphCanvasState - Centralized state management for GraphCanvas
 *
 * Extracts state management from GraphCanvasIntegrated.tsx to improve maintainability
 * and reduce file size from 1384 lines.
 */

import type Graph from "graphology";
import debounce from "lodash/debounce";
import {
  useState,
  useRef,
  useCallback,
  useTransition,
  useEffect,
  useMemo,
} from "react";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "@/graph-visualizer/model/graph";
import { newGraph, upsertNode } from "@/graph-visualizer/model/graph";
import { vlog } from "@/lib/verbose-logger";

import type { GraphLayout } from "../../../hooks/useGraphLayout";

interface GraphCanvasStateProps {
  initialData: {
    graphData?: any;
    layoutMode?: string;
  };
  disableAutoPersist?: boolean;
  onDataChange: (data: any) => void;
  provider?: any; // IndexeddbPersistence | null (local Y.Doc persistence; multiplayer provider removed)
  userId?: string | null;
}

export function useGraphCanvasState({
  initialData,
  disableAutoPersist,
  onDataChange,
  provider,
  userId,
}: GraphCanvasStateProps) {
  // Initialize graph with starter node or from saved data
  const [graph] = useState<Graph<GraphNodeAttributes, GraphEdgeAttributes>>(
    () => {
      const g = newGraph();

      // Load from saved data if exists
      if (initialData.graphData && initialData.graphData.nodes) {
        vlog.log("📥 Loading graph from saved data:", {
          nodeCount: initialData.graphData.nodes.length,
          edgeCount: initialData.graphData.edges?.length || 0,
        });

        // Restore nodes
        initialData.graphData.nodes.forEach((node: any) => {
          const { id, ...attributes } = node;
          g.addNode(id, attributes);
        });

        // Restore edges
        initialData.graphData.edges?.forEach((edge: any) => {
          const { id, source, target, ...attributes } = edge;
          if (g.hasNode(source) && g.hasNode(target)) {
            g.addEdgeWithKey(id, source, target, attributes);
          }
        });
      } else {
        // Add starter node for new graphs
        vlog.log("🆕 Creating new graph with starter node");
        upsertNode(g, "starter-1", {
          uid: "starter-1",
          name: "Start Here",
          type: "Person",
          x: 250,
          y: 200,
          properties: { bio: "Double-click to edit, right-click for options" },
          tags: ["starter"],
        });
      }

      return g;
    }
  );

  // Core state
  const [graphVersion, setGraphVersion] = useState(0);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    () => new Set()
  );
  const [currentLayout, setCurrentLayout] = useState<GraphLayout>(
    (initialData.layoutMode as GraphLayout) || "manual"
  );
  const [isInteractionLocked, setIsInteractionLocked] = useState(false);
  const [hideEmptyEntities, setHideEmptyEntities] = useState(false);

  // Merged expansion state (local + remote users)
  const [mergedExpandedNodes, setMergedExpandedNodes] = useState<Set<string>>(
    () => new Set()
  );

  // Layout state
  const [savedPositions, setSavedPositions] = useState<
    Map<string, { x: number; y: number }>
  >(() => {
    const map = new Map<string, { x: number; y: number }>();
    graph.forEachNode((nodeId, attrs) => {
      if (attrs.x !== undefined && attrs.y !== undefined) {
        map.set(nodeId, { x: attrs.x, y: attrs.y });
      }
    });
    return map;
  });

  const [layoutSettings, setLayoutSettings] = useState(() => {
    if (typeof window === "undefined")
      return {
        elk: { layerSpacing: 150, nodeSpacing: 120 },
        force: { repulsion: 800, linkDistance: 250, collisionRadius: 120 },
      };
    const saved = localStorage.getItem("graph-layout-settings");
    return saved
      ? JSON.parse(saved)
      : {
          elk: { layerSpacing: 150, nodeSpacing: 120 },
          force: { repulsion: 800, linkDistance: 250, collisionRadius: 120 },
        };
  });

  // Refs
  const isSerializingRef = useRef(false);
  const pendingBundleImported = useRef(false);

  // React 19: useTransition for non-urgent expansion updates
  const [isPendingExpansion, startExpansionTransition] = useTransition();

  // Broadcast local expanded nodes to awareness (debounced to prevent update storms)
  const debouncedSyncExpansion = useMemo(
    () =>
      debounce((nodes: Set<string>) => {
        if (!provider?.awareness || !userId) return;

        const expandedArray = Array.from(nodes);
        provider.awareness.setLocalStateField("expandedNodes", expandedArray);
      }, 100), // 100ms debounce prevents update storms
    [provider, userId]
  );

  useEffect(() => {
    debouncedSyncExpansion(expandedNodes);

    return () => {
      debouncedSyncExpansion.cancel();
    };
  }, [expandedNodes, debouncedSyncExpansion]);

  // Merge remote users' expanded nodes with local (union strategy)
  useEffect(() => {
    if (!provider?.awareness) {
      // No provider - just use local expanded nodes
      setMergedExpandedNodes(expandedNodes);
      return;
    }

    const handleAwarenessChange = () => {
      const states = provider.awareness.getStates();
      const allExpanded = new Set<string>();

      // Add own expanded nodes
      expandedNodes.forEach((id) => allExpanded.add(id));

      // Merge remote users' expanded nodes
      states.forEach((state: any, clientId: number) => {
        if (clientId === provider.awareness.clientID) return; // Skip self

        const remoteExpanded = state.expandedNodes || [];
        remoteExpanded.forEach((id: string) => allExpanded.add(id));
      });

      // Fast set comparison - O(n) instead of O(n log n)
      // Check size first (cheapest check)
      if (mergedExpandedNodes.size !== allExpanded.size) {
        setMergedExpandedNodes(allExpanded);
        return;
      }

      // Sizes match - check if all elements are the same
      // Iterate over smaller set and early-exit on first difference
      for (const id of allExpanded) {
        if (!mergedExpandedNodes.has(id)) {
          setMergedExpandedNodes(allExpanded);
          return;
        }
      }
    };

    provider.awareness.on("change", handleAwarenessChange);
    handleAwarenessChange(); // Initial merge

    return () => {
      provider.awareness.off("change", handleAwarenessChange);
    };
  }, [provider, expandedNodes]);

  // Graph change handler
  const handleGraphChange = useCallback(
    (updatedGraph?: any) => {
      console.log("🔄 Graph changed, incrementing version");
      setGraphVersion((v) => v + 1);

      // In session mode, manually serialize graph
      if (disableAutoPersist) {
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
          ...initialData,
          graphData: { nodes, edges },
        };

        vlog.log("💾 Session mode: Persisting graph change:", {
          nodeCount: nodes.length,
          edgeCount: edges.length,
        });

        onDataChange(newData);
      }
    },
    [disableAutoPersist, graph, initialData, onDataChange]
  );

  return {
    // Graph
    graph,
    graphVersion,
    setGraphVersion,
    handleGraphChange,

    // UI State
    expandedNodes: mergedExpandedNodes, // Use merged state for rendering
    setExpandedNodes, // Keep for local updates
    isInteractionLocked,
    setIsInteractionLocked,
    hideEmptyEntities,
    setHideEmptyEntities,

    // Layout
    currentLayout,
    setCurrentLayout,
    savedPositions,
    setSavedPositions,
    layoutSettings,
    setLayoutSettings,

    // Transitions
    isPendingExpansion,
    startExpansionTransition,

    // Refs
    isSerializingRef,
    pendingBundleImported,
  };
}
