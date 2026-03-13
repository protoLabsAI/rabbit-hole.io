/**
 * Canvas Data Type Definitions
 *
 * Strongly-typed data structures for each canvas type.
 * Uses flat discriminated union with canvasType as discriminant.
 */

import type { CanvasType } from "./workspace";

/**
 * Graph Canvas Data
 *
 * React Flow graph editor with Graphology backend.
 */
export interface GraphCanvasData {
  canvasType: "graph"; // Discriminant
  graphData: any; // Graphology graph structure (complex, keep as any)
  hiddenEntityTypes: string[];
  expandedNodes: string[];
  layoutMode?: string;
}

/**
 * Map Canvas Data
 *
 * Geographic visualization with Sigma.js + Leaflet.
 */
export interface MapCanvasData {
  canvasType: "map"; // Discriminant
  markers: Array<{
    name: string;
    coordinates: [number, number]; // [lng, lat]
    value?: number;
  }>;
  center: { lat: number; lng: number };
  zoom: number;
}

/**
 * Timeline Canvas Data
 *
 * Temporal event visualization.
 */
export interface TimelineCanvasData {
  canvasType: "timeline"; // Discriminant
  events: Array<{
    id: string;
    title: string;
    start: number; // Unix timestamp
    end?: number;
    [key: string]: any; // Extensible properties
  }>;
}

/**
 * Table Canvas Data
 *
 * Data grid view.
 */
export interface TableCanvasData {
  canvasType: "table"; // Discriminant
  columns: Array<{
    id: string;
    label: string;
    type?: string;
    width?: number;
  }>;
  rows: Array<Record<string, any>>;
}

/**
 * Kanban Canvas Data
 *
 * Kanban board view.
 */
export interface KanbanCanvasData {
  canvasType: "kanban"; // Discriminant
  columns: Array<{
    id: string;
    title: string;
    order: number;
  }>;
  cards: Array<{
    id: string;
    columnId: string;
    title: string;
    order: number;
    description?: string;
    [key: string]: any; // Extensible properties
  }>;
}

/**
 * Mindmap Canvas Data
 *
 * Mind map visualization.
 */
export interface MindmapCanvasData {
  canvasType: "mindmap"; // Discriminant
  rootNode: {
    id: string;
    label: string;
    x?: number;
    y?: number;
    [key: string]: any;
  } | null;
  nodes: Array<{
    id: string;
    parentId?: string;
    label: string;
    x?: number;
    y?: number;
    [key: string]: any;
  }>;
}

/**
 * Discriminated union of all canvas data types.
 *
 * Use canvasType as discriminant for type narrowing:
 *
 * @example
 * ```typescript
 * if (canvasData.canvasType === "graph") {
 *   // TypeScript knows: canvasData is GraphCanvasData
 *   console.log(canvasData.hiddenEntityTypes); // ✅ Autocomplete!
 * }
 * ```
 */
export type CanvasData =
  | GraphCanvasData
  | MapCanvasData
  | TimelineCanvasData
  | TableCanvasData
  | KanbanCanvasData
  | MindmapCanvasData;

/**
 * Helper type to extract data type for a specific canvas type.
 *
 * @example
 * ```typescript
 * type GraphData = CanvasDataForType<"graph">; // GraphCanvasData
 * type MapData = CanvasDataForType<"map">;     // MapCanvasData
 * ```
 */
export type CanvasDataForType<T extends CanvasType> = Extract<
  CanvasData,
  { canvasType: T }
>;
