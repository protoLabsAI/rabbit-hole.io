/**
 * Canvas-Specific Limit Definitions
 *
 * Extensible configuration for entity counting per canvas type.
 */

import type { TabUsage } from "./index";

export interface CanvasLimits {
  entityTypes: string[];
  relationshipTypes: string[];
  storageProperties: string[];
  maxEntitiesPerTab?: number;
}

export const CANVAS_LIMITS: Record<string, CanvasLimits> = {
  graph: {
    entityTypes: ["nodes"],
    relationshipTypes: ["edges"],
    storageProperties: ["nodes", "edges", "layout"],
  },

  map: {
    entityTypes: ["markers", "routes", "polygons"],
    relationshipTypes: [],
    storageProperties: ["markers", "routes", "polygons", "bounds"],
  },

  timeline: {
    entityTypes: ["events", "milestones"],
    relationshipTypes: ["connections"],
    storageProperties: ["events", "milestones", "connections"],
  },

  table: {
    entityTypes: ["rows"],
    relationshipTypes: [],
    storageProperties: ["rows", "columns", "filters"],
  },

  kanban: {
    entityTypes: ["cards"],
    relationshipTypes: ["links"],
    storageProperties: ["cards", "columns", "links"],
  },

  mindmap: {
    entityTypes: ["nodes"],
    relationshipTypes: ["connections"],
    storageProperties: ["nodes", "connections", "layout"],
  },
};

/**
 * Strongly typed canvas counting
 */
export function countCanvasEntities<T extends keyof typeof CANVAS_LIMITS>(
  canvasType: T,
  canvasData: any
): TabUsage {
  const limits = CANVAS_LIMITS[canvasType];

  let entities = 0;
  for (const entityType of limits.entityTypes) {
    entities += canvasData[entityType]?.length || 0;
  }

  let relationships = 0;
  for (const relType of limits.relationshipTypes) {
    relationships += canvasData[relType]?.length || 0;
  }

  let storageBytes = 0;
  for (const prop of limits.storageProperties) {
    if (canvasData[prop]) {
      storageBytes += JSON.stringify(canvasData[prop]).length * 2;
    }
  }

  return {
    entities,
    relationships,
    storageBytes,
    canvasType,
  };
}
