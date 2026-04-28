/**
 * Tool Registry
 *
 * Centralized registry for canvas drawing tools.
 * Provides type-safe, config-driven tool management.
 */

import type { Node } from "@xyflow/react";

import type { FreehandSettings } from "../FreehandContextMenu";
import type { Points } from "../types";

import {
  circleNodeFactory,
  freehandNodeFactory,
  lineNodeFactory,
  rectangleNodeFactory,
  textNodeFactory,
} from "./factories";

export type ToolType =
  | "move"
  | "freehand"
  | "eraser"
  | "rectangle"
  | "circle"
  | "line"
  | "text";

// ==================== Factory Types ====================

/**
 * Context provided to factory createNode function
 */
export interface NodeFactoryContext {
  points: Points;
  settings: FreehandSettings;
  userId: string;
  nodeId: string;
  screenToFlowPosition?: (pos: { x: number; y: number }) => {
    x: number;
    y: number;
  };
  onResizeEnd?: (
    nodeId: string,
    dimensions: { width: number; height: number }
  ) => void;
  onTextUpdate?: (nodeId: string, text: string) => void;
  onDelete?: (nodeId: string) => void;
}

/**
 * Yjs-persisted drawing data structure
 */
export interface YjsData {
  type: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  userId: string;
  createdAt: number;
  [key: string]: any; // Tool-specific data
}

/**
 * Factory interface for tool node creation and synchronization
 */
export interface ToolNodeFactory {
  /** Create React Flow node from drawing interaction */
  createNode: (context: NodeFactoryContext) => Node | null;

  /** Create Yjs sync data from node */
  createYjsData: (node: Node) => YjsData;

  /** Reconstruct node from Yjs data */
  fromYjsData: (
    key: string,
    data: YjsData,
    extras?: Partial<NodeFactoryContext>
  ) => Node;

  /** Validate if drawing meets minimum requirements */
  validate?: (points: Points) => boolean;
}

// ==================== Tool Config ====================

export interface ToolConfig {
  type: ToolType;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  category: "select" | "draw" | "edit" | "shape" | "utility";
  /** Settings interface for this tool */
  defaultSettings?: Partial<FreehandSettings> & {
    eraserSize?: number;
  };
  /** Whether this tool has configurable settings */
  hasSettings: boolean;
  /** Node factory for this tool (optional - not all tools create nodes) */
  nodeFactory?: ToolNodeFactory;
}

/**
 * Tool Registry
 *
 * Add new tools here to make them available in the tool selector.
 */
export const TOOL_REGISTRY: Record<ToolType, ToolConfig> = {
  move: {
    type: "move",
    name: "Move Tool",
    description: "Select and move drawings",
    icon: "pointer",
    category: "select",
    defaultSettings: {},
    hasSettings: false,
  },
  freehand: {
    type: "freehand",
    name: "Pen Tool",
    description: "Draw freehand paths and annotations",
    icon: "pencil",
    category: "draw",
    defaultSettings: {
      size: 8,
      opacity: 0.7,
      smoothing: 0.5,
      thinning: 0.5,
    },
    hasSettings: true,
    nodeFactory: freehandNodeFactory,
  },
  eraser: {
    type: "eraser",
    name: "Eraser Tool",
    description: "Delete freehand drawings by wiping",
    icon: "eraser",
    category: "edit",
    defaultSettings: {
      eraserSize: 20,
    },
    hasSettings: true,
  },
  rectangle: {
    type: "rectangle",
    name: "Rectangle Tool",
    description: "Draw rectangles and squares",
    icon: "square",
    category: "shape",
    defaultSettings: {
      fillColor: "217 91% 60%",
      fillOpacity: 0.3,
      strokeColor: "217 91% 40%",
      strokeWidth: 2,
    },
    hasSettings: true,
    nodeFactory: rectangleNodeFactory,
  },
  circle: {
    type: "circle",
    name: "Circle Tool",
    description: "Draw circles and ellipses",
    icon: "circle",
    category: "shape",
    defaultSettings: {
      fillColor: "217 91% 60%",
      fillOpacity: 0.3,
      strokeColor: "217 91% 40%",
      strokeWidth: 2,
    },
    hasSettings: true,
    nodeFactory: circleNodeFactory,
  },
  line: {
    type: "line",
    name: "Line Tool",
    description: "Draw straight lines",
    icon: "minus",
    category: "shape",
    defaultSettings: {
      strokeColor: "217 91% 40%",
      strokeWidth: 2,
    },
    hasSettings: true,
    nodeFactory: lineNodeFactory,
  },
  text: {
    type: "text",
    name: "Text Tool",
    description: "Add text annotations",
    icon: "type",
    category: "utility",
    defaultSettings: {
      fontSize: 16,
      fontColor: "217 91% 40%",
      fontWeight: "normal",
      textAlign: "left",
      backgroundColor: undefined,
      backgroundOpacity: 0,
      padding: 8,
    },
    hasSettings: true,
    nodeFactory: textNodeFactory,
  },
};

/**
 * Get all tools in a category
 */
export function getToolsByCategory(
  category: ToolConfig["category"]
): ToolConfig[] {
  return Object.values(TOOL_REGISTRY).filter(
    (tool) => tool.category === category
  );
}

/**
 * Get tool config by type
 */
export function getToolConfig(type: ToolType): ToolConfig | undefined {
  return TOOL_REGISTRY[type];
}

/**
 * Get all available tools
 */
export function getAllTools(): ToolConfig[] {
  return Object.values(TOOL_REGISTRY);
}

/**
 * Get all tool types that create drawable nodes
 * (excludes move and eraser which don't create nodes)
 */
export function getDrawableNodeTypes(): string[] {
  return Object.values(TOOL_REGISTRY)
    .filter((tool) => tool.nodeFactory !== undefined)
    .map((tool) => tool.type);
}

/**
 * Check if a node type is a drawing node
 */
export function isDrawingNodeType(nodeType: string): boolean {
  const tool = TOOL_REGISTRY[nodeType as ToolType];
  return tool?.nodeFactory !== undefined;
}
