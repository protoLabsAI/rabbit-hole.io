/**
 * Panel Registry Utilities
 */

import type {
  PanelHubConfig,
  PanelRegistryEntry,
  PanelCategory,
} from "../types";

/**
 * Get panel by ID
 */
export function getPanelById(
  config: PanelHubConfig,
  id: string
): PanelRegistryEntry | undefined {
  return config.panels.find((p) => p.id === id);
}

/**
 * Get panels by category
 */
export function getPanelsByCategory(
  config: PanelHubConfig,
  category: PanelCategory
): PanelRegistryEntry[] {
  return config.panels.filter((p) => p.category === category);
}

/**
 * Get all categories with panel counts
 */
export function getCategoriesWithCounts(config: PanelHubConfig) {
  const counts = new Map<PanelCategory, number>();

  config.panels.forEach((p) => {
    counts.set(p.category, (counts.get(p.category) || 0) + 1);
  });

  return Object.entries(config.categories).map(([category, meta]) => ({
    category: category as PanelCategory,
    ...meta,
    count: counts.get(category as PanelCategory) || 0,
  }));
}

/**
 * Filter panels by search query
 */
export function filterPanels(
  panels: PanelRegistryEntry[],
  searchQuery: string
): PanelRegistryEntry[] {
  if (!searchQuery.trim()) {
    return panels;
  }

  const query = searchQuery.toLowerCase();
  return panels.filter(
    (p) =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.tags?.some((tag) => tag.toLowerCase().includes(query))
  );
}
