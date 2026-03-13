/**
 * Playground Registry Exports
 */

export * from "./types";
export { playgroundRegistry } from "./playground-registry";

import { playgroundRegistry } from "./playground-registry";
import type { PlaygroundRegistryEntry, PlaygroundCategory } from "./types";

/**
 * Get playground by ID
 */
export function getPlaygroundById(
  id: string
): PlaygroundRegistryEntry | undefined {
  return playgroundRegistry.playgrounds.find((p) => p.id === id);
}

/**
 * Get playgrounds by category
 */
export function getPlaygroundsByCategory(
  category: PlaygroundCategory
): PlaygroundRegistryEntry[] {
  return playgroundRegistry.playgrounds.filter((p) => p.category === category);
}

/**
 * Get all categories with playground counts
 */
export function getCategoriesWithCounts() {
  const counts = new Map<PlaygroundCategory, number>();

  playgroundRegistry.playgrounds.forEach((p) => {
    counts.set(p.category, (counts.get(p.category) || 0) + 1);
  });

  return Object.entries(playgroundRegistry.categories).map(
    ([category, meta]) => ({
      category: category as PlaygroundCategory,
      ...meta,
      count: counts.get(category as PlaygroundCategory) || 0,
    })
  );
}
