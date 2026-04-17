/**
 * Research Editor - React Flow Based
 *
 * In-memory graph editing with Graphology.
 * No server writes until bundle export/merge.
 *
 * Architecture: Graphology stores graph state, React Flow renders it.
 * Data Flow: See app/research/REACT_FLOW_DATA_FLOW.md
 */

"use client";

import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  type NodeChange,
} from "@xyflow/react";
import type Graph from "graphology";
import throttle from "lodash.throttle";
import React, {
  useCallback,
  useRef,
  useMemo,
  useState,
  useEffect,
} from "react";

import "@xyflow/react/dist/style.css";
import type { UserTier } from "@protolabsai/auth/client";
// DISABLED: Drawing tools - Coming Soon
// import {
//   FreehandNode,
//   RectangleNode,
//   CircleNode,
//   LineNode,
//   TextNode,
//   Freehand,
//   useFreehandDrawing,
//   isDrawingNodeType,
//   type ToolType,
// } from "@protolabsai/freehand-drawing";
import { generateSecureUUID } from "@protolabsai/utils";
import { getEntityColor, getEntityImage } from "@protolabsai/utils/atlas";

import {
  graphToReactFlow,
  applyReactFlowNodeMove,
  applyReactFlowNodeMoves,
} from "../../graph-visualizer/model/adapters/reactflow";
import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "../../graph-visualizer/model/graph";
import { getValidRelationshipsBetweenTypes } from "../lib/relationship-utils";

import { EdgeTypeSelector } from "./dialogs/EdgeTypeSelector";
import { RelationEdge } from "./edges/RelationEdge";
import { EntityCard } from "./nodes/EntityCard";
import { EntityTypeSelector } from "./nodes/EntityTypeSelector";

const nodeTypes = {
  entity: EntityCard,
  // DISABLED: Drawing tools - Coming Soon
  // freehand: FreehandNode,
  // rectangle: RectangleNode,
  // circle: CircleNode,
  // line: LineNode,
  // text: TextNode,
};

const edgeTypes = {
  relation: RelationEdge,
};

interface ResearchEditorProps {
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>;
  nodeCount?: number;
  edgeCount?: number;
  isInteractionLocked?: boolean;
  isDraggingEnabled?: boolean; // Enable/disable node dragging (for computed layouts)
  graphVersion?: number; // Version counter to force re-render on layout changes
  isAgentWorking?: boolean; // Show loading overlay while agent is streaming entities
  onGraphChange: (
    graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>
  ) => void;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
  onNodeDoubleClick?: (node: Node) => void;
  onContextMenu?: (type: string, x: number, y: number, target?: any) => void;
  hiddenEntityTypes?: Set<string>; // Entity types to filter out
  expandedNodes?: Set<string>; // Nodes with expanded details
  onToggleNodeExpanded?: (nodeId: string) => void;
  onToggleEntityType?: (type: string) => void;
  onToggleDomain?: (domain: string, types: string[]) => void;
  provider?: {
    awareness: {
      getStates: () => Map<number, unknown>;
      on: (event: string, handler: () => void) => void;
      off: (event: string, handler: () => void) => void;
      setLocalStateField: (field: string, value: unknown) => void;
    };
  }; // local Y.Doc provider (IndexeddbPersistence). Historically this
  // slot also accepted a HocuspocusProvider for live collaboration;
  // multiplayer was dropped — only local persistence flows in now.
  userId?: string; // User ID for awareness
  updateCursor?: (x: number | null, y: number | null) => void; // Cursor tracking callback
  onCursorsUpdate?: (
    cursors: Array<{
      userId: string;
      name: string;
      color: string;
      x: number;
      y: number;
      opacity: number;
    }>
  ) => void;
  // DISABLED: Drawing tools - Coming Soon
  // Freehand drawing props - kept for easy re-enablement
  ydoc?: any; // Yjs document for freehand sync
  tabId?: string; // Tab ID for scoping freehand drawings per tab
  userTier?: UserTier;
  // onFreehandReady?: (toggle: () => void) => void;
  // onFreehandToggle?: (enabled: boolean) => void;
  // onFreehandToolChange?: (tool: ToolType) => void;
  // onFreehandNodeCreated?: (nodeId: string) => void;
  // onFreehandError?: (error: Error) => void;
  // onFreehandSettingsReady?: (settings: any, onSettingsChange: (updates: any) => void) => void;
  // onFreehandToolChangeReady?: (handleToolChange: (tool: ToolType) => void) => void;
  // onSelectedDrawingNodeChange?: (node: Node | null) => void;
  // onSelectedDrawingNodeUpdateReady?: (updateNode: (updates: any) => void) => void;
}

export function ResearchEditor({
  graph,
  nodeCount: _nodeCount = 0,
  edgeCount: _edgeCount = 0,
  isInteractionLocked = false,
  isDraggingEnabled = true,
  graphVersion = 0,
  isAgentWorking = false,
  onGraphChange,
  onNodeClick,
  onNodeDoubleClick,
  onContextMenu,
  hiddenEntityTypes,
  expandedNodes = new Set(),
  onToggleNodeExpanded,
  onToggleEntityType: _onToggleEntityType,
  onToggleDomain: _onToggleDomain,
  provider,
  userId,
  updateCursor,
  onCursorsUpdate,
  ydoc,
  tabId,
  userTier = "free",
  // DISABLED: Drawing tools - Coming Soon
  // onFreehandReady,
  // onFreehandToggle,
  // onFreehandToolChange,
  // onFreehandNodeCreated,
  // onFreehandError,
  // onFreehandSettingsReady,
  // onFreehandToolChangeReady,
  // onSelectedDrawingNodeChange,
  // onSelectedDrawingNodeUpdateReady,
}: ResearchEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Track whether the agent is currently working so we can show a loading overlay.
  // This state is driven by either the prop OR by window events dispatched from
  // ResearchChatInterface, whichever is most convenient for the parent.
  const [agentWorking, setAgentWorking] = useState(isAgentWorking);
  React.useEffect(() => {
    setAgentWorking(isAgentWorking);
  }, [isAgentWorking]);
  React.useEffect(() => {
    const handleAgentStart = () => setAgentWorking(true);
    const handleAgentStop = () => setAgentWorking(false);
    window.addEventListener("research:canvas:agent-start", handleAgentStart);
    window.addEventListener("research:canvas:agent-stop", handleAgentStop);
    return () => {
      window.removeEventListener(
        "research:canvas:agent-start",
        handleAgentStart
      );
      window.removeEventListener("research:canvas:agent-stop", handleAgentStop);
    };
  }, []);

  // Edge type selector state (node-to-node connection)
  const [pendingConnection, setPendingConnection] = useState<{
    source: string;
    target: string;
    sourceNode: Node;
    targetNode: Node;
  } | null>(null);

  // Edge drop state (background drop to create new entity)
  const [edgeDropState, setEdgeDropState] = useState<{
    sourceNodeId: string;
    sourceNode: Node;
    position: { x: number; y: number };
    screenPosition: { x: number; y: number };
  } | null>(null);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const {
    screenToFlowPosition,
    flowToScreenPosition,
    fitView,
    zoomIn,
    zoomOut,
    setCenter,
    getViewport,
  } = useReactFlow();

  // DISABLED: Drawing tools - Coming Soon
  // Freehand drawing hook and related logic is disabled to prevent memory loading
  const { deleteElements } = useReactFlow();

  /*
  // Memoize callbacks to prevent infinite loops
  const handleFreehandNodeCreated = useCallback(
    (nodeId: string) => {
      onFreehandNodeCreated?.(nodeId);
    },
    [onFreehandNodeCreated]
  );

  const handleFreehandError = useCallback(
    (error: Error) => {
      onFreehandError?.(error);
    },
    [onFreehandError]
  );

  const handleInteractionLockChange = useCallback(
    (locked: boolean) => {
      onFreehandToggle?.(locked);
    },
    [onFreehandToggle]
  );

  // Generic update function for freehand node data (position, dimensions, etc.)
  const updateDrawingNode = useCallback(
    (nodeId: string, updates: Record<string, any>) => {
      if (!ydoc || !userId) return;
      const mapKey = tabId ? `freehandDrawings-${tabId}` : "freehandDrawings";
      const drawingsMap = ydoc.getMap(mapKey);
      const existingData = drawingsMap.get(nodeId);
      if (existingData) {
        ydoc.transact(() => {
          drawingsMap.set(nodeId, { ...existingData, ...updates });
        }, userId);
      }
    },
    [ydoc, userId, tabId]
  );

  const freehand = useFreehandDrawing({
    ydoc,
    userId,
    userTier,
    tabId,
    reactFlowInstance: {
      screenToFlowPosition,
      setNodes,
      setEdges,
      deleteElements,
    },
    onNodeCreated: handleFreehandNodeCreated,
    onError: handleFreehandError,
    onInteractionLockChange: handleInteractionLockChange,
    onResizeEnd: (nodeId, dimensions) => updateDrawingNode(nodeId, dimensions),
    onTextUpdate: (nodeId, text) => updateDrawingNode(nodeId, { text }),
    onNodeDelete: (nodeId) => {
      if (ydoc && userId) {
        const mapKey = tabId ? `freehandDrawings-${tabId}` : "freehandDrawings";
        const drawingsMap = ydoc.getMap(mapKey);
        ydoc.transact(() => {
          drawingsMap.delete(nodeId);
        }, userId);
      }
    },
  });
  */

  // Simplified handleNodesChange - drawing tools disabled
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Apply changes to React Flow state
      onNodesChange(changes);

      // DISABLED: Drawing tools - Coming Soon
      // The freehand-specific selection tracking and Yjs sync is disabled.
      // When re-enabling, restore the selection change handling and Yjs deletion sync.
      /*
      const selectionChanges = changes.filter((change) => change.type === "select");
      if (selectionChanges.length > 0) {
        // ... selection tracking for drawing nodes ...
        freehand.handleNodeSelect(selectedDrawingId);
        // ... update draggable state ...
      }

      if (freehand.isApplyingYjsRef?.current) return;
      // ... sync freehand deletions to Yjs ...
      */
    },
    [onNodesChange]
  );

  // DISABLED: Drawing tools - Coming Soon
  // All freehand useEffect hooks are disabled to prevent loading the drawing system.
  /*
  useEffect(() => {
    if (onFreehandReady) {
      onFreehandReady(freehand.toggle);
    }
  }, [onFreehandReady, freehand.toggle]);

  useEffect(() => {
    onFreehandToolChange?.(freehand.activeTool);
  }, [freehand.activeTool, onFreehandToolChange]);

  useEffect(() => {
    if (onFreehandSettingsReady) {
      onFreehandSettingsReady(freehand.settings, freehand.handleSettingsChange);
    }
  }, [freehand.settings, freehand.handleSettingsChange, onFreehandSettingsReady]);

  useEffect(() => {
    if (onFreehandToolChangeReady) {
      onFreehandToolChangeReady(freehand.handleToolChange);
    }
  }, [freehand.handleToolChange, onFreehandToolChangeReady]);

  useEffect(() => {
    const selectedNode = freehand.selectedNodeId
      ? nodes.find((n) => n.id === freehand.selectedNodeId) || null
      : null;
    onSelectedDrawingNodeChange?.(selectedNode);
  }, [freehand.selectedNodeId, nodes, onSelectedDrawingNodeChange]);

  useEffect(() => {
    if (onSelectedDrawingNodeUpdateReady) {
      onSelectedDrawingNodeUpdateReady(freehand.handleUpdateSelectedNode);
    }
  }, [freehand.handleUpdateSelectedNode, onSelectedDrawingNodeUpdateReady]);
  */

  // Helper: Calculate distance-based animation duration
  const getAnimationDuration = useCallback(
    (targetX: number, targetY: number) => {
      const viewport = getViewport();
      const dx = targetX - viewport.x;
      const dy = targetY - viewport.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Scale duration: 400ms base + 1.0ms per unit of distance
      // Clamped between 400ms (very close) and 3000ms (very far)
      const duration = Math.min(Math.max(400 + distance * 1.0, 400), 3000);
      return duration;
    },
    [getViewport]
  );

  // Listen for zoom control events from parent
  React.useEffect(() => {
    const handleZoomIn = () => zoomIn({ duration: 300 });
    const handleZoomOut = () => zoomOut({ duration: 300 });
    const handleFitView = () =>
      fitView({ padding: 0.2, duration: 800, maxZoom: 1.5 });
    const handleCenterOnNode = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.x != null && detail?.y != null) {
        const duration = getAnimationDuration(detail.x, detail.y);
        const currentZoom = getViewport().zoom;
        setCenter(detail.x, detail.y, { duration, zoom: currentZoom });
      }
    };

    window.addEventListener("research:canvas:zoom-in", handleZoomIn);
    window.addEventListener("research:canvas:zoom-out", handleZoomOut);
    window.addEventListener("research:canvas:fit-view", handleFitView);
    window.addEventListener(
      "research:canvas:center-on-node",
      handleCenterOnNode
    );

    return () => {
      window.removeEventListener("research:canvas:zoom-in", handleZoomIn);
      window.removeEventListener("research:canvas:zoom-out", handleZoomOut);
      window.removeEventListener("research:canvas:fit-view", handleFitView);
      window.removeEventListener(
        "research:canvas:center-on-node",
        handleCenterOnNode
      );
    };
  }, [zoomIn, zoomOut, fitView, setCenter, getAnimationDuration]);

  // Handle entity bundles pushed via CopilotKit action — streams entities one-by-one
  const onGraphChangeRef = React.useRef(onGraphChange);
  React.useEffect(() => {
    onGraphChangeRef.current = onGraphChange;
  }, [onGraphChange]);

  React.useEffect(() => {
    // Track active streaming timers so cleanup can cancel them
    const activeTimers: ReturnType<typeof setTimeout>[] = [];

    const handlePushBundle = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail || !graph) return;

      const {
        entities = [],
        relationships = [],
        entityCitations = {},
      } = detail as {
        entities: Array<{
          uid: string;
          name: string;
          type: string;
          properties?: Record<string, unknown>;
          tags?: string[];
          aliases?: string[];
        }>;
        relationships: Array<{
          uid?: string;
          type: string;
          source: string;
          target: string;
          properties?: Record<string, unknown>;
        }>;
        entityCitations: Record<string, string[]>;
      };

      // Filter to only new (non-duplicate) entities by uid
      const newEntities = entities.filter(
        (entity) => entity.uid && !graph.hasNode(entity.uid)
      );

      if (newEntities.length === 0 && relationships.length === 0) return;

      // Stream entities incrementally — add one every 120ms so they
      // appear on the canvas as the agent finds them rather than all at once.
      const STREAM_INTERVAL_MS = 120;

      newEntities.forEach((entity, index) => {
        const timer = setTimeout(() => {
          // Guard: skip if entity was added by a concurrent event
          if (!entity.uid || graph.hasNode(entity.uid)) return;

          graph.addNode(entity.uid, {
            uid: entity.uid,
            name: entity.name || entity.uid,
            type: entity.type || "Entity",
            x: Math.random() * 800,
            y: Math.random() * 600,
            color: getEntityColor(entity.type || "Entity"),
            icon: getEntityImage(entity.type || "Entity"),
            size: 10,
            properties: {
              ...(entity.properties || {}),
              // Preserve citations on the node
              citations: entityCitations[entity.uid] ?? [],
            },
            tags: entity.tags || [],
            aliases: entity.aliases || [],
          });

          // Notify graph listeners after each entity so the canvas updates live
          onGraphChangeRef.current(graph);

          // Auto-fit view after the last entity arrives
          if (index === newEntities.length - 1) {
            const fitTimer = setTimeout(() => {
              window.dispatchEvent(new CustomEvent("research:canvas:fit-view"));
            }, 150);
            activeTimers.push(fitTimer);

            // After all entities are added, import relationships
            for (const rel of relationships) {
              if (!rel.source || !rel.target) continue;
              if (!graph.hasNode(rel.source) || !graph.hasNode(rel.target))
                continue;

              const edgeKey =
                rel.uid || `${rel.source}-${rel.type}-${rel.target}`;
              if (graph.hasEdge(edgeKey)) continue;

              try {
                graph.addEdgeWithKey(edgeKey, rel.source, rel.target, {
                  uid: edgeKey,
                  type: rel.type || "RELATED_TO",
                  source: rel.source,
                  target: rel.target,
                  confidence:
                    (rel.properties?.confidence as number | undefined) ?? 1.0,
                  properties: rel.properties || {},
                });
              } catch {
                // Edge may already exist under a different key; skip silently
              }
            }

            onGraphChangeRef.current(graph);
          }
        }, index * STREAM_INTERVAL_MS);

        activeTimers.push(timer);
      });

      // If only relationships were pushed (no new entities), import them immediately
      if (newEntities.length === 0 && relationships.length > 0) {
        for (const rel of relationships) {
          if (!rel.source || !rel.target) continue;
          if (!graph.hasNode(rel.source) || !graph.hasNode(rel.target))
            continue;

          const edgeKey = rel.uid || `${rel.source}-${rel.type}-${rel.target}`;
          if (graph.hasEdge(edgeKey)) continue;

          try {
            graph.addEdgeWithKey(edgeKey, rel.source, rel.target, {
              uid: edgeKey,
              type: rel.type || "RELATED_TO",
              source: rel.source,
              target: rel.target,
              confidence:
                (rel.properties?.confidence as number | undefined) ?? 1.0,
              properties: rel.properties || {},
            });
          } catch {
            // Edge may already exist under a different key; skip silently
          }
        }
        onGraphChangeRef.current(graph);
        const fitTimer = setTimeout(() => {
          window.dispatchEvent(new CustomEvent("research:canvas:fit-view"));
        }, 150);
        activeTimers.push(fitTimer);
      }
    };

    window.addEventListener("research:canvas:push-bundle", handlePushBundle);
    return () => {
      window.removeEventListener(
        "research:canvas:push-bundle",
        handlePushBundle
      );
      // Cancel any pending streaming timers on unmount / re-render
      activeTimers.forEach(clearTimeout);
    };
  }, [graph]);

  // Track cursor in flow coordinates (world space, not screen space)
  // Throttled to 100ms (10 updates/sec) - reduced from 60/sec for performance
  useEffect(() => {
    if (!provider?.awareness || !updateCursor || !reactFlowWrapper.current)
      return;

    const wrapper = reactFlowWrapper.current;

    const throttledCursorUpdate = throttle((e: MouseEvent) => {
      // CRITICAL: Must convert viewport coords to canvas-relative coords first
      // e.clientX/Y are relative to browser viewport, not the canvas container
      const rect = wrapper.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;
      const flowPos = screenToFlowPosition({ x: relativeX, y: relativeY });
      updateCursor(flowPos.x, flowPos.y);
    }, 100); // 10 updates/second (83% reduction from 60/sec)

    const handleMouseLeave = () => {
      throttledCursorUpdate.cancel(); // Cancel any pending throttled calls
      updateCursor(null, null);
    };

    wrapper.addEventListener("mousemove", throttledCursorUpdate, {
      passive: true,
    });
    wrapper.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      throttledCursorUpdate.cancel();
      wrapper.removeEventListener("mousemove", throttledCursorUpdate as any);
      wrapper.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [provider, updateCursor, screenToFlowPosition]);

  // Listen for remote users' live drag updates via awareness
  React.useEffect(() => {
    if (!provider?.awareness || !userId) return;

    const handleAwarenessUpdate = () => {
      const states = provider.awareness.getStates();

      states.forEach((state: unknown) => {
        const typedState = state as {
          userId?: string;
          name?: string;
          liveNodePosition?: { nodeId: string; x: number; y: number };
          draggingNode?: string | null;
        };
        if (typedState.userId === userId) return; // Skip own updates

        // Apply remote live drag position
        if (typedState.liveNodePosition) {
          const { nodeId, x, y } = typedState.liveNodePosition;

          setNodes((currentNodes) =>
            currentNodes.map((node) =>
              node.id === nodeId
                ? {
                    ...node,
                    position: { x, y },
                    data: {
                      ...node.data,
                      beingDraggedBy: typedState.name || "Another user",
                    },
                  }
                : node
            )
          );
        } else if (typedState.draggingNode === null) {
          // Clear dragging indicator
          setNodes((currentNodes) =>
            currentNodes.map((node) =>
              node.data?.beingDraggedBy
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      beingDraggedBy: undefined,
                    },
                  }
                : node
            )
          );
        }
      });
    };

    provider.awareness.on("change", handleAwarenessUpdate);

    return () => {
      provider.awareness.off("change", handleAwarenessUpdate);
    };
  }, [provider, userId, setNodes]);

  // Broadcast remote cursors in screen coordinates with viewport clipping
  React.useEffect(() => {
    if (!provider?.awareness || !userId || !onCursorsUpdate) return;

    const FADE_MARGIN = 100; // Fade out 100px from edge

    const handleCursorUpdate = () => {
      const states = provider.awareness.getStates();
      const cursors: Array<{
        userId: string;
        name: string;
        color: string;
        x: number;
        y: number;
        opacity: number;
      }> = [];

      const canvasBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!canvasBounds) return;

      states.forEach((state: unknown) => {
        const typedState = state as {
          userId?: string;
          name?: string;
          color?: string;
          cursor?: { x: number; y: number };
        };
        if (typedState.userId === userId) return; // Skip self

        // State.cursor is in flow coordinates - convert to screen + check visibility
        if (
          typedState.cursor &&
          typeof typedState.cursor.x === "number" &&
          typeof typedState.cursor.y === "number"
        ) {
          const screenPos = flowToScreenPosition({
            x: typedState.cursor.x,
            y: typedState.cursor.y,
          });

          // Check if within viewport bounds (with fade margin)
          const isInBounds =
            screenPos.x >= -FADE_MARGIN &&
            screenPos.x <= canvasBounds.width + FADE_MARGIN &&
            screenPos.y >= -FADE_MARGIN &&
            screenPos.y <= canvasBounds.height + FADE_MARGIN;

          if (isInBounds) {
            // Calculate opacity based on distance from edges
            const distFromLeft = screenPos.x;
            const distFromRight = canvasBounds.width - screenPos.x;
            const distFromTop = screenPos.y;
            const distFromBottom = canvasBounds.height - screenPos.y;

            const minDist = Math.min(
              distFromLeft,
              distFromRight,
              distFromTop,
              distFromBottom
            );
            const opacity =
              minDist < FADE_MARGIN ? Math.max(0.3, minDist / FADE_MARGIN) : 1;

            cursors.push({
              userId: typedState.userId || "unknown",
              name: typedState.name || "User",
              color: typedState.color || "#3B82F6",
              x: screenPos.x,
              y: screenPos.y,
              opacity,
            });
          }
        }
      });

      onCursorsUpdate(cursors);
    };

    // Update on awareness changes
    provider.awareness.on("change", handleCursorUpdate);
    handleCursorUpdate(); // Initial

    // Update on viewport changes (pan/zoom) using RAF for 144Hz support
    let isActive = false;
    let rafId: number | null = null;

    const checkViewport = () => {
      if (isActive) {
        handleCursorUpdate();
        rafId = requestAnimationFrame(checkViewport);
      }
    };

    const setActive = () => {
      if (!isActive) {
        isActive = true;
        rafId = requestAnimationFrame(checkViewport); // Start RAF loop
      }
    };

    const setInactive = () => {
      isActive = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      handleCursorUpdate(); // Final update
    };

    const wrapper = reactFlowWrapper.current;
    wrapper?.addEventListener("mouseenter", setActive);
    wrapper?.addEventListener("mouseleave", setInactive);
    wrapper?.addEventListener("wheel", setActive, { passive: true });

    return () => {
      provider.awareness.off("change", handleCursorUpdate);
      if (rafId) cancelAnimationFrame(rafId);
      wrapper?.removeEventListener("mouseenter", setActive);
      wrapper?.removeEventListener("mouseleave", setInactive);
      wrapper?.removeEventListener("wheel", setActive);
    };
  }, [provider, userId, flowToScreenPosition, onCursorsUpdate]);

  // Handle node drag - trigger save to persist positions
  // Supports multi-select: saves all selected nodes when drag completes
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Clear awareness state
      if (provider?.awareness) {
        provider.awareness.setLocalStateField("draggingNode", null);
        provider.awareness.setLocalStateField("liveNodePosition", null);
      }

      // DISABLED: Drawing tools - Coming Soon
      // Drawing nodes would use Yjs for persistence. Entity nodes use Graphology.
      // if (isDrawingNodeType(node.type ?? "") && node.position) {
      //   updateDrawingNode(node.id, { position: node.position });
      //   return;
      // }

      // Compute selected nodes with valid positions (entity nodes only)
      const selectedNodes = nodes.filter((n) => n.selected && n.position);

      // Multi-select drag: only if dragged node is selected AND multiple nodes are selected
      if (node.selected && selectedNodes.length > 1) {
        // Batch update all selected nodes' positions
        const changes = selectedNodes.map((n) => ({
          nodeId: n.id,
          position: n.position!,
        }));
        applyReactFlowNodeMoves(graph, changes);
      } else if (node.position) {
        // Single-node drag: only update the dragged node
        applyReactFlowNodeMove(graph, node.id, node.position);
      }

      onGraphChange(graph);
    },
    [graph, nodes, onGraphChange, provider]
  );

  // Fit view only on initial load (disabled - user prefers static zoom)
  // React.useEffect(() => {
  //   if (nodes.length > 0 && !hasInitialFit) {
  //     setTimeout(() => {
  //       fitView({ padding: 0.2, duration: 300 });
  //       setHasInitialFit(true);
  //     }, 100);
  //   }
  // }, [nodes.length, hasInitialFit, fitView]);

  // Memoize edges separately (only rebuild when graph structure changes, not when nodes expand)
  const flowEdges = useMemo(() => {
    const { edges } = graphToReactFlow(graph, hiddenEntityTypes);
    return edges;
  }, [graph, graph.order, graph.size, hiddenEntityTypes, graphVersion]);

  // Sync edges to React Flow (only when memoized edges change)
  React.useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  // Memoize available entities list (rebuild when graph structure or attributes change)
  const availableEntities = useMemo(() => {
    return Array.from(graph.nodes()).map((nodeId) => {
      const attrs = graph.getNodeAttributes(nodeId);
      return {
        uid: attrs.uid,
        name: attrs.name,
        type: attrs.type,
      };
    });
  }, [graph, graph.order, graphVersion]);

  // Sync Graphology → React Flow (split into focused memos for performance)

  // 1. Convert graph to React Flow nodes (only when graph structure changes)
  const flowNodes = useMemo(() => {
    const { nodes } = graphToReactFlow(graph, hiddenEntityTypes);
    return nodes;
  }, [graph, graph.order, graph.size, hiddenEntityTypes, graphVersion]);

  // 2. Create stable callback references (prevents child re-renders)
  const toggleCallbacks = useMemo(() => {
    const callbacks = new Map<string, () => void>();
    flowNodes.forEach((node) => {
      callbacks.set(node.id, () => onToggleNodeExpanded?.(node.id));
    });
    return callbacks;
  }, [flowNodes, onToggleNodeExpanded]);

  // 3. Add expanded state (only when expansion changes)
  const nodesWithExpanded = useMemo(() => {
    return flowNodes.map((node) => ({
      ...node,
      zIndex: expandedNodes.has(node.id) ? 1000 : 1,
      data: {
        ...node.data,
        isExpanded: expandedNodes.has(node.id),
      },
    }));
  }, [flowNodes, expandedNodes]);

  // 4. Add callbacks and graph context (only when callbacks/context change)
  const nodesWithCallbacks = useMemo(() => {
    return nodesWithExpanded.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onToggleExpanded: toggleCallbacks.get(node.id),
        graph,
        onGraphChange,
        availableEntities,
        readOnly: isInteractionLocked,
      },
    }));
  }, [
    nodesWithExpanded,
    toggleCallbacks,
    graph,
    onGraphChange,
    availableEntities,
    isInteractionLocked,
  ]);

  // 5. Sync to React Flow (only when final nodes change)
  // DISABLED: Drawing tools - no longer need to preserve drawing nodes
  useEffect(() => {
    setNodes(nodesWithCallbacks);
    // When drawing tools are re-enabled, restore this:
    // setNodes((currentNodes) => {
    //   const drawingNodes = currentNodes.filter((n) => isDrawingNodeType(n.type ?? ""));
    //   return [...nodesWithCallbacks, ...drawingNodes];
    // });
  }, [nodesWithCallbacks, setNodes]);

  // Handle edge creation - show type selector first
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      // Prevent self-loops
      if (connection.source === connection.target) return;

      // Find source and target nodes
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return;

      // Show edge type selector
      setPendingConnection({
        source: connection.source,
        target: connection.target,
        sourceNode,
        targetNode,
      });

      // Clear connection awareness state
      if (provider?.awareness) {
        provider.awareness.setLocalStateField("connectingFrom", null);
        provider.awareness.setLocalStateField("connectionTarget", null);
      }
    },
    [nodes, provider]
  );

  // Handle edge type selection (node-to-node)
  const handleEdgeTypeConfirm = useCallback(
    (type: string) => {
      if (!pendingConnection) return;

      // Generate unique edge ID to handle multiple relationships between same nodes
      // Format: source-target-type-uuid ensures collision-proof uniqueness
      const uuid = generateSecureUUID();
      const edgeId = `${pendingConnection.source}-${pendingConnection.target}-${type}-${uuid}`;

      graph.addEdgeWithKey(
        edgeId,
        pendingConnection.source,
        pendingConnection.target,
        {
          uid: edgeId,
          type: type,
          source: pendingConnection.source,
          target: pendingConnection.target,
          confidence: 1.0,
          properties: {},
        }
      );

      // Use the same unique edge ID in ReactFlow to maintain consistency
      setEdges((eds) =>
        addEdge(
          {
            source: pendingConnection.source,
            target: pendingConnection.target,
            id: edgeId,
            type: "relation",
          },
          eds
        )
      );
      onGraphChange(graph);
      setPendingConnection(null);
    },
    [pendingConnection, graph, onGraphChange, setEdges]
  );

  // Handle entity type selection from edge drop
  const handleEdgeDropEntitySelect = useCallback(
    (entityType: string) => {
      if (!edgeDropState) return;

      // Generate new entity ID
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const newEntityId = `entity:new_${timestamp}_${randomSuffix}`;

      // Create entity at drop position
      const color = getEntityColor(entityType);
      const icon = getEntityImage(entityType);

      graph.addNode(newEntityId, {
        uid: newEntityId,
        name: `New ${entityType}`,
        type: entityType,
        x: edgeDropState.position.x,
        y: edgeDropState.position.y,
        color,
        icon,
        properties: {},
        tags: [],
        aliases: [],
      });

      // Create edge with default RELATED_TO type
      // Generate unique edge ID to handle multiple relationships between same nodes
      const uuid = generateSecureUUID();
      const edgeId = `${edgeDropState.sourceNodeId}-${newEntityId}-RELATED_TO-${uuid}`;
      graph.addEdgeWithKey(edgeId, edgeDropState.sourceNodeId, newEntityId, {
        uid: edgeId,
        type: "RELATED_TO",
        source: edgeDropState.sourceNodeId,
        target: newEntityId,
        confidence: 1.0,
        properties: {},
      });

      setEdges((eds) =>
        addEdge(
          {
            source: edgeDropState.sourceNodeId,
            target: newEntityId,
            id: edgeId,
            type: "relation",
          },
          eds
        )
      );

      onGraphChange(graph);
      setEdgeDropState(null);
    },
    [edgeDropState, graph, onGraphChange, setEdges]
  );

  // Handle connection start (when user drags from handle)
  const connectStartRef = useRef<{ nodeId: string; node: Node } | null>(null);

  const onConnectStart = useCallback(
    (_event: unknown, params: { nodeId: string | null }) => {
      if (!params.nodeId) return;

      const node = nodes.find((n) => n.id === params.nodeId);
      if (node) {
        connectStartRef.current = { nodeId: params.nodeId, node };
      }

      if (provider?.awareness) {
        provider.awareness.setLocalStateField("connectingFrom", params.nodeId);
      }
    },
    [nodes, provider]
  );

  // Handle connection end (when user releases or cancels)
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (provider?.awareness) {
        provider.awareness.setLocalStateField("connectingFrom", null);
        provider.awareness.setLocalStateField("connectionTarget", null);
      }

      // Check if dropped on background (not on a node)
      const target = event.target as HTMLElement;
      const droppedOnPane =
        target.classList.contains("react-flow__pane") ||
        target.classList.contains("react-flow__renderer");

      if (droppedOnPane && connectStartRef.current) {
        // Get coordinates from event (handle both mouse and touch)
        const clientX =
          "clientX" in event ? event.clientX : event.changedTouches[0].clientX;
        const clientY =
          "clientY" in event ? event.clientY : event.changedTouches[0].clientY;

        // Convert screen coordinates to flow coordinates
        const position = screenToFlowPosition({
          x: clientX,
          y: clientY,
        });

        setEdgeDropState({
          sourceNodeId: connectStartRef.current.nodeId,
          sourceNode: connectStartRef.current.node,
          position,
          screenPosition: { x: clientX, y: clientY },
        });
      }

      connectStartRef.current = null;
    },
    [provider, screenToFlowPosition]
  );

  // Stream live position during drag + update cursor to follow node
  // Throttled to 50ms (20 updates/sec) - reduced from 60/sec for performance
  const onNodeDrag = useMemo(
    () =>
      throttle((event: React.MouseEvent, node: Node) => {
        if (!provider?.awareness || !node.position || !updateCursor) return;

        // Update dragging state
        provider.awareness.setLocalStateField("draggingNode", node.id);
        provider.awareness.setLocalStateField("liveNodePosition", {
          nodeId: node.id,
          x: node.position.x,
          y: node.position.y,
        });

        // CRITICAL FIX: During drag, cursor must match node position exactly
        // Using event.clientX/clientY causes desync because React Flow applies
        // constraints/smoothing to node.position while mouse moves freely.
        // Remote viewers see cursor lag behind node if we use raw mouse coords.
        // Solution: Position cursor at node center (node.position is already in flow coords)
        updateCursor(node.position.x, node.position.y);
      }, 50), // 20 updates/second (67% reduction from 60/sec)
    [provider, updateCursor]
  );

  // Handle drop from palette
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Don't allow drops in read-only mode
      if (isInteractionLocked) return;

      const entityType = event.dataTransfer.getData(
        "application/reactflow-entitytype"
      );
      if (!entityType) return;

      // Convert screen coordinates to flow coordinates
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const uid = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      graph.addNode(uid, {
        uid,
        name: `New ${entityType}`,
        type: entityType,
        x: position.x,
        y: position.y,
        color: getEntityColor(entityType),
        icon: getEntityImage(entityType),
        size: 10,
      });

      onGraphChange(graph);
    },
    [graph, onGraphChange, screenToFlowPosition, isInteractionLocked]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  // Handle node context menu
  const onNodeContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent, node: Node) => {
      event.preventDefault();
      event.stopPropagation();
      onContextMenu?.(
        "node",
        event.clientX,
        event.clientY,
        node.data as GraphNodeAttributes
      );
    },
    [onContextMenu]
  );

  // Handle background click - deselect nodes
  // DISABLED: Drawing tools - freehand.handleNodeSelect(null) was here
  const onPaneClick = useCallback(() => {
    // No-op when drawing tools are disabled
  }, []);

  // Handle background context menu
  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();

      // Convert screen coordinates to flow coordinates for entity placement
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Pass both flow and screen coordinates in context
      const context = {
        flowX: flowPosition.x,
        flowY: flowPosition.y,
        x: event.clientX,
        y: event.clientY,
      };

      onContextMenu?.("background", event.clientX, event.clientY, context);
    },
    [onContextMenu, screenToFlowPosition]
  );

  return (
    <div ref={reactFlowWrapper} className="h-full w-full relative">
      {/* React Flow Editor */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeDrag={isDraggingEnabled ? onNodeDrag : undefined}
        onNodeDragStop={isDraggingEnabled ? onNodeDragStop : undefined}
        onNodeClick={(event, node) => onNodeClick?.(event, node)}
        onNodeDoubleClick={(_, node) => onNodeDoubleClick?.(node)}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onDrop={isDraggingEnabled ? onDrop : undefined}
        onDragOver={isDraggingEnabled ? onDragOver : undefined}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        deleteKeyCode="Delete"
        nodesDraggable={isDraggingEnabled}
        nodesConnectable={isDraggingEnabled}
        panOnDrag={!isInteractionLocked} // Default: pan with left mouse drag
        selectionKeyCode="Shift" // Shift+drag for box selection
        multiSelectionKeyCode="Shift" // Shift+click for multi-select
        zoomOnScroll={!isInteractionLocked}
        zoomOnPinch={!isInteractionLocked}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls
          position="top-left"
          showZoom={false}
          showFitView={false}
          showInteractive={false}
        />
        <MiniMap
          position="bottom-right"
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            // Entity nodes: use entity type colors
            const data = node.data as GraphNodeAttributes | undefined;
            return data?.color || "hsl(var(--primary))";
          }}
          maskColor="hsl(var(--background) / 0.8)"
          style={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
            // Larger minimap = smaller relative movements = less sensitivity
            width: 240,
            height: 180,
          }}
          // Interactive features
          pannable={!isInteractionLocked} // Enable drag to pan
          zoomable={!isInteractionLocked} // Enable scroll to zoom
          zoomStep={0.15} // Very small zoom increments for fine control (default: 0.5)
          inversePan={false} // Normal pan direction (set true to invert)
          onClick={(event, position) => {
            // Click to center on clicked position with distance-based animation
            if (!isInteractionLocked && position) {
              const duration = getAnimationDuration(position.x, position.y);
              // Keep current zoom level to avoid jarring zoom changes
              const currentZoom = getViewport().zoom;
              setCenter(position.x, position.y, {
                duration,
                zoom: currentZoom,
              });
            }
          }}
          className="smooth-minimap"
        />
      </ReactFlow>

      {/* DISABLED: Drawing tools - Coming Soon
      {freehand.isEnabled && freehand.activeTool !== "move" && (
        <Freehand
          points={freehand.points}
          isDrawing={freehand.isDrawing}
          settings={freehand.settings}
          activeTool={freehand.activeTool}
          onPointerDown={freehand.handlePointerDown}
          onPointerMove={freehand.handlePointerMove}
          onPointerUp={freehand.handlePointerUp}
          onSettingsChange={freehand.handleSettingsChange}
          onToolChange={freehand.handleToolChange}
          onEraseNodes={freehand.handleEraseNodes}
          onEraseEdges={freehand.handleEraseEdges}
        />
      )}
      */}

      {/* Edge Type Selector Popover (node-to-node) */}
      {pendingConnection && (
        <EdgeTypeSelector
          isOpen={true}
          onClose={() => setPendingConnection(null)}
          sourceNodeName={
            (pendingConnection.sourceNode.data as GraphNodeAttributes).name
          }
          targetNodeName={
            (pendingConnection.targetNode.data as GraphNodeAttributes).name
          }
          availableTypes={getValidRelationshipsBetweenTypes(
            (pendingConnection.sourceNode.data as GraphNodeAttributes).type,
            (pendingConnection.targetNode.data as GraphNodeAttributes).type
          )}
          onConfirm={handleEdgeTypeConfirm}
        />
      )}

      {/* Edge Drop Flow - Select Entity Type */}
      {edgeDropState && (
        <EntityTypeSelector
          isOpen={true}
          onClose={() => setEdgeDropState(null)}
          onSelect={handleEdgeDropEntitySelect}
          anchorPosition={edgeDropState.screenPosition}
        />
      )}

      {/* Agent Working Indicator — pulsing badge in top-right corner of canvas */}
      {agentWorking && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2 rounded-full bg-background/90 border border-border px-3 py-1.5 shadow-sm backdrop-blur-sm pointer-events-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            Agent is working…
          </span>
        </div>
      )}
    </div>
  );
}

export function ResearchEditorWrapper(props: ResearchEditorProps) {
  return (
    <ReactFlowProvider>
      <ResearchEditor {...props} />
    </ReactFlowProvider>
  );
}
