/**
 * Playground Registry Types
 *
 * Type definitions for the playground registry system.
 */

export type PlaygroundCategory =
  | "ai-services" // AI APIs and LLMs
  | "media-processing" // Audio/video processing
  | "data-extraction" // Text extraction and parsing
  | "research-tools" // Research and analysis
  | "utilities"; // General utilities

/**
 * Playground Registry Entry
 *
 * Defines metadata for each playground without importing the component.
 * This keeps the registry lightweight and enables dynamic loading.
 */
export interface PlaygroundRegistryEntry {
  /**
   * Unique identifier for the playground
   */
  id: string;

  /**
   * Display name
   */
  name: string;

  /**
   * Brief description
   */
  description: string;

  /**
   * Category for grouping
   */
  category: PlaygroundCategory;

  /**
   * Icon (emoji or icon name)
   */
  icon: string;

  /**
   * Dynamic import function
   */
  importFn: () => Promise<{ default: React.ComponentType<any> }>;

  /**
   * Optional health check URL
   */
  healthCheckUrl?: string;

  /**
   * Service status
   */
  status?: "active" | "experimental" | "deprecated";

  /**
   * Tags for search/filtering
   */
  tags?: string[];

  /**
   * Estimated memory footprint (KB)
   */
  estimatedSize?: number;
}

/**
 * Category metadata
 */
export interface CategoryMetadata {
  label: string;
  icon: string;
  description: string;
}

/**
 * Playground Registry
 */
export interface PlaygroundRegistry {
  playgrounds: PlaygroundRegistryEntry[];
  categories: Record<PlaygroundCategory, CategoryMetadata>;
}
