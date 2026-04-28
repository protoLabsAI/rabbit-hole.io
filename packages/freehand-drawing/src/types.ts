import type { Node } from "@xyflow/react";

/**
 * Point format: [x, y, pressure]
 */
export type Point = [number, number, number];
export type Points = Point[];

/**
 * Freehand node data structure
 */
export interface FreehandNodeData extends Record<string, unknown> {
  points: Points;
  initialSize: { width: number; height: number };
  color?: string; // HSL format: "217 91% 60%"
  opacity?: number; // 0-1
  size?: number; // Brush size in pixels
  smoothing?: number; // 0-1
  thinning?: number; // 0-1
  userId?: string; // Who created this drawing
  createdAt?: number; // When it was created
  drawingSource?: "local" | "remote"; // Track if drawing came from collaboration
}

/**
 * Freehand node type for React Flow
 */
export type FreehandNodeType = Node<FreehandNodeData, "freehand">;

/**
 * Yjs-persisted drawing data
 * Supports multiple drawing types (freehand, rectangle, etc.)
 */
export interface FreehandDrawingData {
  type?: string; // Node type: "freehand", "rectangle", etc.
  points?: Points; // For freehand drawings
  width: number;
  height: number;
  position: { x: number; y: number };
  // Freehand properties
  color?: string; // HSL format: "217 91% 60%"
  opacity?: number; // 0-1
  size?: number; // Brush size in pixels
  smoothing?: number; // 0-1
  thinning?: number; // 0-1
  // Rectangle/Circle properties
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  // Line properties
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  // Common properties
  userId: string;
  createdAt: number;
}
