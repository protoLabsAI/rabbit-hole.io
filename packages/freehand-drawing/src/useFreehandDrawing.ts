import type { ReactFlowInstance } from "@xyflow/react";
import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type PointerEvent,
} from "react";
import type { Doc as YDoc } from "yjs";

import type { UserTier } from "@protolabsai/auth/client";
import { generateSecureId } from "@protolabsai/utils";

import type { FreehandSettings } from "./FreehandContextMenu";
import type { ToolType } from "./tools/registry";
import { TOOL_REGISTRY } from "./tools/registry";
import type { Points, FreehandDrawingData } from "./types";

/**
 * Process raw points into flow coordinates and bounding box
 */
function processPoints(
  points: [number, number, number][],
  screenToFlowPosition: (pos: { x: number; y: number }) => {
    x: number;
    y: number;
  },
  brushSize: number
) {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;

  const flowPoints: Points = [];

  for (const point of points) {
    const { x, y } = screenToFlowPosition({ x: point[0], y: point[1] });
    x1 = Math.min(x1, x);
    y1 = Math.min(y1, y);
    x2 = Math.max(x2, x);
    y2 = Math.max(y2, y);
    flowPoints.push([x, y, point[2]]);
  }

  // Adjust for line thickness
  const thickness = brushSize * 0.5;
  x1 -= thickness;
  y1 -= thickness;
  x2 += thickness;
  y2 += thickness;

  // Normalize points relative to bounding box
  for (const flowPoint of flowPoints) {
    flowPoint[0] -= x1;
    flowPoint[1] -= y1;
  }

  const width = x2 - x1;
  const height = y2 - y1;

  return {
    position: { x: x1, y: y1 },
    width,
    height,
    data: { points: flowPoints, initialSize: { width, height } },
  };
}

interface UseFreehandDrawingOptions {
  ydoc?: YDoc;
  userId?: string;
  userTier?: UserTier;
  tabId?: string; // Tab ID for scoping drawings per tab
  onNodeCreated?: (nodeId: string) => void;
  onInteractionLockChange?: (locked: boolean) => void;
  onError?: (error: Error) => void;
  onResizeEnd?: (
    nodeId: string,
    dimensions: { width: number; height: number }
  ) => void;
  onTextUpdate?: (nodeId: string, text: string) => void;
  onNodeDelete?: (nodeId: string) => void;
  // React Flow instance functions (required - pass from parent)
  reactFlowInstance?: {
    screenToFlowPosition: ReactFlowInstance["screenToFlowPosition"];
    setNodes: ReactFlowInstance["setNodes"];
    setEdges: ReactFlowInstance["setEdges"];
    deleteElements: ReactFlowInstance["deleteElements"];
  };
}

/**
 * Hook for managing freehand drawing state and Yjs synchronization
 *
 * Features:
 * - Real-time drawing with perfect-freehand
 * - Automatic Yjs persistence
 * - Drawing attribution (userId)
 * - Interaction locking during drawing
 * - Available to all users (no tier restrictions)
 */
export function useFreehandDrawing({
  ydoc,
  userId = "anonymous",
  userTier = "free",
  tabId,
  onNodeCreated,
  onInteractionLockChange,
  onError,
  onResizeEnd,
  onTextUpdate,
  onNodeDelete,
  reactFlowInstance,
}: UseFreehandDrawingOptions = {}) {
  const pointRef = useRef<Points>([]);
  const [points, setPoints] = useState<Points>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolType>("move");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Read initial color from CSS variable
  const getInitialColor = (): string => {
    if (typeof window === "undefined") return "217 91% 60%"; // Default blue
    const hslValue = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim();
    return hslValue || "217 91% 60%";
  };

  // Drawing settings (merged defaults from tool registry)
  const [settings, setSettings] = useState<FreehandSettings>({
    size: 8,
    opacity: 0.7,
    smoothing: 0.5,
    thinning: 0.5,
    color: getInitialColor(),
    eraserSize: 20,
  });

  // Available to all users - no tier restrictions
  const canUseFreehand = true;

  const handleSettingsChange = useCallback(
    (updates: Partial<FreehandSettings>) => {
      setSettings((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const handleToolChange = useCallback((tool: ToolType) => {
    setActiveTool(tool);
    // Apply default settings for new tool
    const toolConfig = TOOL_REGISTRY[tool];
    if (toolConfig.defaultSettings) {
      setSettings((prev) => ({ ...prev, ...toolConfig.defaultSettings }));
    }
  }, []);

  // Extract React Flow functions
  const screenToFlowPosition = reactFlowInstance?.screenToFlowPosition;
  const setNodes = reactFlowInstance?.setNodes;
  const setEdges = reactFlowInstance?.setEdges;
  const deleteElements = reactFlowInstance?.deleteElements;

  // Sync with Yjs when drawings are created (scoped per tab)
  const syncToYjs = useCallback(
    (nodeId: string, drawingData: FreehandDrawingData) => {
      if (!ydoc) return;

      try {
        const mapKey = tabId ? `freehandDrawings-${tabId}` : "freehandDrawings";
        const drawingsMap = ydoc.getMap(mapKey);
        drawingsMap.set(nodeId, drawingData);
      } catch (error) {
        console.error("Failed to sync freehand drawing to Yjs:", error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    },
    [ydoc, tabId, onError]
  );

  // Track if we're applying Yjs updates using a counter (prevent echo in parent's handleNodesChange)
  // Counter pattern handles rapid successive updates without race conditions
  const isApplyingYjsCountRef = useRef(0);

  // Expose boolean check for parent component
  const isApplyingYjsRef = useMemo(
    () => ({
      get current() {
        return isApplyingYjsCountRef.current > 0;
      },
    }),
    []
  );

  // Track previous tabId to detect actual tab changes
  const prevTabIdRef = useRef<string | undefined>(tabId);

  // Listen for remote drawings from Yjs + restore existing on mount (scoped per tab)
  useEffect(() => {
    if (!ydoc || !setNodes) return;

    // Scope freehand drawings per tab to prevent cross-contamination
    const mapKey = tabId ? `freehandDrawings-${tabId}` : "freehandDrawings";
    const drawingsMap = ydoc.getMap(mapKey);
    const loadedDrawingIds = new Set<string>();

    // CRITICAL: Clear drawing nodes ONLY when tabId actually changes (not on other re-renders)
    const tabChanged = prevTabIdRef.current !== tabId;
    if (tabChanged) {
      prevTabIdRef.current = tabId;

      isApplyingYjsCountRef.current++;
      setNodes((nodes) =>
        nodes.filter(
          (n) =>
            n.type !== "freehand" &&
            n.type !== "rectangle" &&
            n.type !== "circle" &&
            n.type !== "line"
        )
      );
      Promise.resolve().then(() => {
        isApplyingYjsCountRef.current--;
      });
    }

    // CRITICAL: Load existing drawings on mount (observer only catches changes)
    const loadExistingDrawings = () => {
      const existingNodes: any[] = [];

      drawingsMap.forEach((drawingData: any, key: string) => {
        if (loadedDrawingIds.has(key)) return;
        loadedDrawingIds.add(key);

        const toolConfig = TOOL_REGISTRY[drawingData.type as ToolType];
        if (!toolConfig?.nodeFactory) return;

        const node = toolConfig.nodeFactory.fromYjsData(key, drawingData, {
          onResizeEnd,
          onTextUpdate,
          onDelete: handleNodeDelete,
          userId,
        });
        existingNodes.push(node);
      });

      if (existingNodes.length > 0) {
        isApplyingYjsCountRef.current++;
        setNodes((nodes) => {
          const existingIds = new Set(nodes.map((n) => n.id));
          const newNodes = existingNodes.filter((n) => !existingIds.has(n.id));
          return [...nodes, ...newNodes];
        });
        Promise.resolve().then(() => {
          isApplyingYjsCountRef.current--;
        });
      }
    };

    // Load existing drawings immediately
    loadExistingDrawings();

    // Observer for new/updated drawings
    const observer = (event: any) => {
      event.changes.keys.forEach((change: any, key: string) => {
        if (change.action === "add" || change.action === "update") {
          const drawingData = drawingsMap.get(key) as any;

          if (drawingData && setNodes) {
            loadedDrawingIds.add(key);

            const toolConfig = TOOL_REGISTRY[drawingData.type as ToolType];
            if (!toolConfig?.nodeFactory) return;

            const newNode = toolConfig.nodeFactory.fromYjsData(
              key,
              drawingData,
              {
                onResizeEnd,
                onTextUpdate,
                onDelete: handleNodeDelete,
                userId,
              }
            );

            isApplyingYjsCountRef.current++;
            setNodes((nodes) => {
              const existingIndex = nodes.findIndex((n) => n.id === key);
              if (existingIndex !== -1) {
                const updated = [...nodes];
                updated[existingIndex] = newNode;
                return updated;
              }
              return [...nodes, newNode];
            });
            Promise.resolve().then(() => {
              isApplyingYjsCountRef.current--;
            });
          }
        } else if (change.action === "delete") {
          isApplyingYjsCountRef.current++;
          setNodes((nodes) => nodes.filter((n) => n.id !== key));
          loadedDrawingIds.delete(key);
          Promise.resolve().then(() => {
            isApplyingYjsCountRef.current--;
          });
        }
      });
    };

    drawingsMap.observe(observer);
    return () => drawingsMap.unobserve(observer);
  }, [ydoc, userId, setNodes, tabId]);

  const toggle = useCallback(() => {
    setIsEnabled((prev) => !prev);
  }, []);

  // Notify parent of interaction lock changes (deferred to avoid setState-during-render)
  useEffect(() => {
    onInteractionLockChange?.(isEnabled);
  }, [isEnabled, onInteractionLockChange]);

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!isEnabled) return;

      // Move tool doesn't capture pointer events - let React Flow handle selection
      if (activeTool === "move") return;

      // For eraser, only erase on drag - skip single clicks
      if (activeTool === "eraser") {
        (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
        const nextPoints = [
          [e.clientX, e.clientY, e.pressure],
        ] satisfies Points;
        pointRef.current = nextPoints;
        setPoints(nextPoints);
        setIsDrawing(true);
        return;
      }

      // Rectangle tool - store start position in flow coordinates
      if (activeTool === "rectangle") {
        if (!screenToFlowPosition) return;
        (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
        const { x, y } = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        pointRef.current = [[x, y, e.pressure]];
        setPoints([[x, y, e.pressure]]);
        setIsDrawing(true);
        return;
      }

      // Circle tool - store start position in flow coordinates
      if (activeTool === "circle") {
        if (!screenToFlowPosition) return;
        (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
        const { x, y } = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        pointRef.current = [[x, y, e.pressure]];
        setPoints([[x, y, e.pressure]]);
        setIsDrawing(true);
        return;
      }

      // Line tool - store start position in flow coordinates
      if (activeTool === "line") {
        if (!screenToFlowPosition) return;
        (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
        const { x, y } = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        pointRef.current = [[x, y, e.pressure]];
        setPoints([[x, y, e.pressure]]);
        setIsDrawing(true);
        return;
      }

      // Text tool - drag to define text box size
      if (activeTool === "text") {
        if (!screenToFlowPosition) return;
        (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
        const { x, y } = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        pointRef.current = [[x, y, e.pressure]];
        setPoints([[x, y, e.pressure]]);
        setIsDrawing(true);
        return;
      }

      (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
      const nextPoints = [[e.clientX, e.clientY, e.pressure]] satisfies Points;
      pointRef.current = nextPoints;
      setPoints(nextPoints);
      setIsDrawing(true);
    },
    [isEnabled, activeTool, screenToFlowPosition]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!isDrawing || e.buttons !== 1 || activeTool === "move") return;

      // Rectangle tool - only store start + end (2 points)
      if (activeTool === "rectangle") {
        if (!screenToFlowPosition) return;
        const { x, y } = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        const start = pointRef.current[0];
        pointRef.current = [start, [x, y, e.pressure]];
        setPoints([start, [x, y, e.pressure]]);
        return;
      }

      // Circle tool - only store start + end (2 points)
      if (activeTool === "circle") {
        if (!screenToFlowPosition) return;
        const { x, y } = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        const start = pointRef.current[0];
        pointRef.current = [start, [x, y, e.pressure]];
        setPoints([start, [x, y, e.pressure]]);
        return;
      }

      // Line tool - only store start + end (2 points)
      if (activeTool === "line") {
        if (!screenToFlowPosition) return;
        const { x, y } = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        const start = pointRef.current[0];
        pointRef.current = [start, [x, y, e.pressure]];
        setPoints([start, [x, y, e.pressure]]);
        return;
      }

      // Text tool - drag to define box size
      if (activeTool === "text") {
        if (!screenToFlowPosition) return;
        const { x, y } = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        const start = pointRef.current[0];
        pointRef.current = [start, [x, y, e.pressure]];
        setPoints([start, [x, y, e.pressure]]);
        return;
      }

      const currentPoints = pointRef.current;
      const nextPoints = [
        ...currentPoints,
        [e.clientX, e.clientY, e.pressure],
      ] satisfies Points;
      pointRef.current = nextPoints;
      setPoints(nextPoints);
    },
    [isDrawing, activeTool, screenToFlowPosition]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!isDrawing || !screenToFlowPosition || !setNodes) return;

      // Move tool doesn't draw
      if (activeTool === "move") {
        setIsDrawing(false);
        return;
      }

      (e.target as HTMLDivElement).releasePointerCapture(e.pointerId);

      if (points.length < 2) {
        setPoints([]);
        pointRef.current = [];
        setIsDrawing(false);
        return;
      }

      // Eraser tool just clears trail - actual deletion handled by Eraser component
      if (activeTool === "eraser") {
        setPoints([]);
        pointRef.current = [];
        setIsDrawing(false);
        return;
      }

      // Get tool factory
      const toolConfig = TOOL_REGISTRY[activeTool];
      if (!toolConfig?.nodeFactory) {
        setIsDrawing(false);
        return;
      }

      // Validate drawing
      if (
        toolConfig.nodeFactory.validate &&
        !toolConfig.nodeFactory.validate(points)
      ) {
        setPoints([]);
        pointRef.current = [];
        setIsDrawing(false);
        return;
      }

      // Create node using factory
      const nodeId = generateSecureId();
      const newNode = toolConfig.nodeFactory.createNode({
        points,
        settings,
        userId,
        nodeId,
        screenToFlowPosition,
        onResizeEnd,
        onTextUpdate,
        onDelete: handleNodeDelete,
      });

      if (!newNode) {
        setPoints([]);
        pointRef.current = [];
        setIsDrawing(false);
        return;
      }

      // Add to React Flow
      setNodes((nodes) => [...nodes, newNode]);

      // Sync to Yjs
      const yjsData = toolConfig.nodeFactory.createYjsData(newNode);
      syncToYjs(nodeId, yjsData);

      // Auto-select text nodes so they enter edit mode
      if (activeTool === "text") {
        setTimeout(() => {
          setNodes((nodes) =>
            nodes.map((n) =>
              n.id === nodeId
                ? { ...n, selected: true }
                : { ...n, selected: false }
            )
          );
          setSelectedNodeId(nodeId);
        }, 50);
      }

      onNodeCreated?.(nodeId);

      setPoints([]);
      pointRef.current = [];
      setIsDrawing(false);
    },
    [
      isDrawing,
      points,
      screenToFlowPosition,
      setNodes,
      syncToYjs,
      userId,
      onNodeCreated,
      activeTool,
      settings,
      onResizeEnd,
    ]
  );

  const handleEraseNodes = useCallback(
    (nodeIds: string[]) => {
      if (!deleteElements) return;

      // Delete from React Flow
      deleteElements({ nodes: nodeIds.map((id) => ({ id })) });

      // CRITICAL: Also delete from Yjs for remote sync (scoped per tab)
      if (ydoc) {
        const mapKey = tabId ? `freehandDrawings-${tabId}` : "freehandDrawings";
        const drawingsMap = ydoc.getMap<FreehandDrawingData>(mapKey);
        ydoc.transact(() => {
          nodeIds.forEach((nodeId) => {
            drawingsMap.delete(nodeId);
          });
        }, userId);
      }
    },
    [deleteElements, ydoc, userId, tabId]
  );

  const handleEraseEdges = useCallback(
    (edgeIds: string[]) => {
      if (!deleteElements) return;
      deleteElements({ edges: edgeIds.map((id) => ({ id })) });
    },
    [deleteElements]
  );

  // Handle node deletion (for text nodes that auto-delete when empty)
  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      handleEraseNodes([nodeId]);
      onNodeDelete?.(nodeId);
    },
    [handleEraseNodes, onNodeDelete]
  );

  // Handle node selection changes
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  // Update selected node's visual properties
  const handleUpdateSelectedNode = useCallback(
    (updates: Partial<FreehandSettings>) => {
      if (!selectedNodeId || !setNodes || !ydoc) return;

      const mapKey = tabId ? `freehandDrawings-${tabId}` : "freehandDrawings";
      const drawingsMap = ydoc.getMap(mapKey);
      const drawingData = drawingsMap.get(selectedNodeId) as any;

      if (!drawingData) return;

      // Update Yjs data
      const updatedYjsData = { ...drawingData, ...updates };

      // Sync to Yjs first
      ydoc.transact(() => {
        drawingsMap.set(selectedNodeId, updatedYjsData);
      }, userId);

      // Reconstruct node using factory (ensures consistency)
      const toolConfig = TOOL_REGISTRY[drawingData.type as ToolType];
      if (!toolConfig?.nodeFactory) return;

      const updatedNode = toolConfig.nodeFactory.fromYjsData(
        selectedNodeId,
        updatedYjsData,
        { onResizeEnd, onTextUpdate, onDelete: handleNodeDelete, userId }
      );

      // Update in React Flow
      setNodes((nodes) => {
        const nodeIndex = nodes.findIndex((n) => n.id === selectedNodeId);
        if (nodeIndex === -1) return nodes;

        const updated = [...nodes];
        // Preserve selection state
        updated[nodeIndex] = {
          ...updatedNode,
          selected: nodes[nodeIndex].selected,
          draggable: nodes[nodeIndex].draggable,
        };

        return updated;
      });
    },
    [selectedNodeId, setNodes, ydoc, tabId, userId, onResizeEnd, onTextUpdate]
  );

  return {
    isEnabled,
    isDrawing,
    points,
    settings,
    activeTool,
    selectedNodeId,
    canUseFreehand,
    toggle,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleSettingsChange,
    handleToolChange,
    handleEraseNodes,
    handleEraseEdges,
    handleNodeSelect,
    handleUpdateSelectedNode,
    isApplyingYjsRef, // Expose for parent to check
  };
}
