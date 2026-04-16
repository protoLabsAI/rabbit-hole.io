/**
 * Entity Color Utilities
 *
 * Centralized entity color derivation from domain config.
 * Replaces all hardcoded color arrays throughout the application.
 */

import { domainRegistry } from "@protolabsai/types";

/**
 * Get color for entity UID from domain configuration
 *
 * @param entityUid - Entity UID (e.g., "person:123", "animal:tiger")
 * @returns Hex color from domain config or fallback gray
 */
export function getEntityColor(entityUid: string): string {
  const domain = domainRegistry.getDomainFromUID(entityUid);
  if (!domain) return "#6B7280"; // Fallback gray

  const config = domainRegistry.getDomainConfig(domain);
  return config?.ui.color || "#6B7280";
}

/**
 * Get colors for multiple entities (for charts/analytics)
 *
 * @param entityUids - Array of entity UIDs
 * @returns Map of UID → color
 */
export function getEntityColors(entityUids: string[]): Map<string, string> {
  const colorMap = new Map<string, string>();

  entityUids.forEach((uid) => {
    colorMap.set(uid, getEntityColor(uid));
  });

  return colorMap;
}

/**
 * Get color for entity type
 *
 * @param entityType - Entity type (e.g., "Person", "Animal")
 * @returns Hex color from domain config or fallback
 */
export function getEntityTypeColor(entityType: string): string {
  const domain = domainRegistry.getDomainFromEntityType(entityType);
  if (!domain) return "#6B7280";

  const config = domainRegistry.getDomainConfig(domain);

  // Check for entity-specific color override
  if (config?.ui.entityColors?.[entityType]) {
    return config.ui.entityColors[entityType];
  }

  // Use domain color
  return config?.ui.color || "#6B7280";
}

/**
 * Generate color array for multiple entities (legacy compatibility)
 *
 * @param entityUids - Array of entity UIDs
 * @returns Array of colors matching entity order
 */
export function getEntityColorArray(entityUids: string[]): string[] {
  return entityUids.map(getEntityColor);
}
