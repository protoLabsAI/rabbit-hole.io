/**
 * Workspace Tab Data Validation
 *
 * Validates tab data structure before persisting to Yjs to prevent corruption.
 * Each canvas type has specific data requirements.
 */

import type { CanvasType } from "../types/workspace";

export function validateTabData(canvasType: CanvasType, data: any): boolean {
  if (!data || typeof data !== "object") {
    return false;
  }

  switch (canvasType) {
    case "graph":
      return validateGraphData(data);
    case "map":
      return validateMapData(data);
    case "timeline":
      return validateTimelineData(data);
    case "table":
      return validateTableData(data);
    case "kanban":
      return validateKanbanData(data);
    case "mindmap":
      return validateMindmapData(data);
    default:
      // Allow unknown canvas types for extensibility
      return true;
  }
}

function validateGraphData(data: any): boolean {
  // Graph must have graphData with nodes array
  if (!data.graphData || typeof data.graphData !== "object") {
    return false;
  }

  const { nodes, edges } = data.graphData;

  // Nodes must be an array
  if (!Array.isArray(nodes)) {
    return false;
  }

  // Edges must be an array if present
  if (edges !== undefined && !Array.isArray(edges)) {
    return false;
  }

  // Validate node structure
  for (const node of nodes) {
    if (!node.id || typeof node.id !== "string") {
      return false;
    }
  }

  // Validate edge structure if present
  if (edges) {
    for (const edge of edges) {
      if (
        !edge.source ||
        !edge.target ||
        typeof edge.source !== "string" ||
        typeof edge.target !== "string"
      ) {
        return false;
      }
    }
  }

  return true;
}

function validateMapData(data: any): boolean {
  // Map must have markers array
  if (!Array.isArray(data.markers)) {
    return false;
  }

  // Validate marker structure
  for (const marker of data.markers) {
    if (!marker.name || !Array.isArray(marker.coordinates)) {
      return false;
    }
    if (
      marker.coordinates.length !== 2 ||
      typeof marker.coordinates[0] !== "number" ||
      typeof marker.coordinates[1] !== "number"
    ) {
      return false;
    }
  }

  return true;
}

function validateTimelineData(data: any): boolean {
  // Timeline must have events array
  if (!Array.isArray(data.events)) {
    return false;
  }

  // Validate event structure
  for (const event of data.events) {
    if (!event.id || !event.date || typeof event.date !== "number") {
      return false;
    }
  }

  return true;
}

function validateTableData(data: any): boolean {
  // Table must have rows and columns
  if (!Array.isArray(data.rows) || !Array.isArray(data.columns)) {
    return false;
  }

  return true;
}

function validateKanbanData(data: any): boolean {
  // Kanban must have columns array
  if (!Array.isArray(data.columns)) {
    return false;
  }

  // Validate column structure
  for (const column of data.columns) {
    if (!column.id || !Array.isArray(column.cards)) {
      return false;
    }
  }

  return true;
}

function validateMindmapData(data: any): boolean {
  // Mindmap must have nodes
  if (!data.rootNode || typeof data.rootNode !== "object") {
    return false;
  }

  return true;
}

/**
 * Get validation error message for debugging
 */
export function getValidationError(
  canvasType: CanvasType,
  data: any
): string | null {
  if (!validateTabData(canvasType, data)) {
    return `Invalid ${canvasType} data structure. Check console for details.`;
  }
  return null;
}
