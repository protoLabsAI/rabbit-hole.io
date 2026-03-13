/**
 * Workspace Usage Tracking
 *
 * Count entities and relationships across all tabs in a Yjs workspace.
 * Used for client-side tier enforcement (local-first architecture).
 */

import * as Y from "yjs";

export interface TabUsage {
  entities: number;
  relationships: number;
  storageBytes: number;
  canvasType: string;
}

export interface WorkspaceUsage {
  totalEntities: number;
  totalRelationships: number;
  totalStorageBytes: number;
  usageByTab: Record<string, TabUsage>;
  tabCount: number;
}

/**
 * Count entities across all tabs in workspace
 * Works with both local Yjs (IndexedDB) and collaborative Yjs (PostgreSQL)
 */
export function countWorkspaceEntities(ydoc: Y.Doc): WorkspaceUsage {
  const tabs = ydoc.getArray("tabs").toArray() as any[];

  let totalEntities = 0;
  let totalRelationships = 0;
  let totalStorageBytes = 0;

  const usageByTab: Record<string, TabUsage> = {};

  for (const tab of tabs) {
    const usage = countTabEntities(tab);
    usageByTab[tab.id] = usage;

    totalEntities += usage.entities;
    totalRelationships += usage.relationships;
    totalStorageBytes += usage.storageBytes;
  }

  return {
    totalEntities,
    totalRelationships,
    totalStorageBytes,
    usageByTab,
    tabCount: tabs.length,
  };
}

/**
 * Count entities in a single tab based on canvas type
 */
export function countTabEntities(tab: any): TabUsage {
  const canvasData = tab.canvasData || {};

  switch (tab.canvasType) {
    case "graph":
      return {
        entities: canvasData.nodes?.length || 0,
        relationships: canvasData.edges?.length || 0,
        storageBytes: estimateTabSize(tab),
        canvasType: "graph",
      };

    case "map":
      return {
        entities:
          (canvasData.markers?.length || 0) + (canvasData.routes?.length || 0),
        relationships: 0,
        storageBytes: estimateTabSize(tab),
        canvasType: "map",
      };

    case "timeline":
      return {
        entities: canvasData.events?.length || 0,
        relationships: canvasData.connections?.length || 0,
        storageBytes: estimateTabSize(tab),
        canvasType: "timeline",
      };

    case "table":
      return {
        entities: canvasData.rows?.length || 0,
        relationships: 0,
        storageBytes: estimateTabSize(tab),
        canvasType: "table",
      };

    case "kanban":
      return {
        entities: canvasData.cards?.length || 0,
        relationships: canvasData.links?.length || 0,
        storageBytes: estimateTabSize(tab),
        canvasType: "kanban",
      };

    case "mindmap":
      return {
        entities: canvasData.nodes?.length || 0,
        relationships: canvasData.connections?.length || 0,
        storageBytes: estimateTabSize(tab),
        canvasType: "mindmap",
      };

    default:
      console.warn(`Unknown canvas type: ${tab.canvasType}`);
      return {
        entities: 0,
        relationships: 0,
        storageBytes: 0,
        canvasType: tab.canvasType,
      };
  }
}

/**
 * Estimate storage size of tab in bytes
 */
function estimateTabSize(tab: any): number {
  try {
    const serialized = JSON.stringify(tab.canvasData || {});
    return serialized.length * 2; // UTF-8 approximation
  } catch {
    return 0;
  }
}

/**
 * Check if adding entities would exceed workspace limit
 */
export function wouldExceedLimit(
  currentUsage: WorkspaceUsage,
  additionalEntities: number,
  additionalRelationships: number,
  limits: { maxEntities: number; maxRelationships: number }
): {
  entities: boolean;
  relationships: boolean;
  entityOverflow: number;
  relationshipOverflow: number;
} {
  const newEntityTotal = currentUsage.totalEntities + additionalEntities;
  const newRelTotal = currentUsage.totalRelationships + additionalRelationships;

  const entitiesExceed =
    limits.maxEntities !== -1 && newEntityTotal > limits.maxEntities;
  const relsExceed =
    limits.maxRelationships !== -1 && newRelTotal > limits.maxRelationships;

  return {
    entities: entitiesExceed,
    relationships: relsExceed,
    entityOverflow: entitiesExceed ? newEntityTotal - limits.maxEntities : 0,
    relationshipOverflow: relsExceed
      ? newRelTotal - limits.maxRelationships
      : 0,
  };
}
