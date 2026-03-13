/**
 * Icon Discovery Utilities
 */

import { iconRegistry } from "./registry";
import type { IconCategory, IconDefinition } from "./types";

/**
 * List all registered icons
 */
export function listAllIcons(): IconDefinition[] {
  return iconRegistry.listNames().map((name) => {
    const icon = iconRegistry.get(name);
    if (!icon) {
      throw new Error(`Icon "${name}" not found in registry`);
    }
    return icon;
  });
}

/**
 * List icons by category
 */
export function listByCategory(category: IconCategory): IconDefinition[] {
  return iconRegistry.listByCategory(category);
}

/**
 * Search icons by name, alias, or description
 */
export function searchIcons(query: string): IconDefinition[] {
  return iconRegistry.search(query);
}

/**
 * Get all categories with counts
 */
export function getCategorySummary(): Record<IconCategory, number> {
  return iconRegistry.getCategoryCounts();
}

/**
 * Get icon by name or alias
 */
export function getIcon(nameOrAlias: string): IconDefinition | undefined {
  return iconRegistry.get(nameOrAlias);
}

/**
 * Check if icon exists
 */
export function hasIcon(nameOrAlias: string): boolean {
  return iconRegistry.has(nameOrAlias);
}

/**
 * Get all icon names (including aliases)
 */
export function getAllIconNames(): string[] {
  const definitions = listAllIcons();
  const names: string[] = [];

  definitions.forEach((def) => {
    names.push(def.name);
    if (def.aliases) {
      names.push(...def.aliases);
    }
  });

  return names.sort();
}
