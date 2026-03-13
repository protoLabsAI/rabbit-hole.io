/**
 * Panel Hub Types
 *
 * Type definitions for the panel hub system.
 */

export type PanelCategory = string;

/**
 * Panel Registry Entry
 *
 * Defines metadata for each panel without importing the component.
 * This keeps the registry lightweight and enables dynamic loading.
 */
export interface PanelRegistryEntry {
  /**
   * Unique identifier for the panel
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
  category: PanelCategory;

  /**
   * Icon (emoji or icon name)
   */
  icon: string;

  /**
   * Dynamic import function
   */
  importFn: () => Promise<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: React.ComponentType<any>;
  }>;

  /**
   * Panel status
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

  /**
   * Admin-only panel
   */
  adminOnly?: boolean;
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
 * Panel Registry Configuration
 */
export interface PanelHubConfig {
  panels: PanelRegistryEntry[];
  categories: Record<PanelCategory, CategoryMetadata>;
}
