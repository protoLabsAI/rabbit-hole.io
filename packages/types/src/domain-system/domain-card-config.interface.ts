/**
 * Domain Card Configuration System
 *
 * Defines card rendering behavior in domain configs.
 * Enables configuration-based card rendering without hardcoded components.
 */

import type React from "react";

/**
 * Node data structure passed to cards
 */
export interface DomainNodeData {
  uid: string;
  name: string;
  type: string;
  properties?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Props passed to domain card components
 */
export interface DomainCardProps {
  node: DomainNodeData;
  domain: string;
  size?: "compact" | "standard" | "detailed";
  className?: string;
  style?: React.CSSProperties;
  onClick?: (node: DomainNodeData) => void;
  selectable?: boolean;
  interactive?: boolean;
}

/**
 * Field formatter function type
 */
export type FieldFormatter = (
  value: any,
  node: DomainNodeData,
  context?: any
) => React.ReactNode | string;

/**
 * Field configuration for card rendering
 */
export interface DomainCardFieldConfig {
  /** Property name in node.properties */
  property: string;

  /** Display label */
  label: string;

  /** Field type for rendering */
  type?: "text" | "badge" | "link" | "date" | "number" | "status" | "custom";

  /** Conditional visibility */
  visible?: (node: DomainNodeData) => boolean;

  /** Custom formatter */
  formatter?: FieldFormatter;

  /** Display order (lower numbers first) */
  order?: number;

  /** Size-specific visibility */
  sizes?: ("compact" | "standard" | "detailed")[];

  /** Section ID this field belongs to */
  section?: string;
}

/**
 * Section grouping configuration
 */
export interface DomainCardSection {
  /** Section identifier */
  id: string;

  /** Section title */
  title: string;

  /** Conditional visibility */
  visible?: (node: DomainNodeData) => boolean;

  /** Display order */
  order?: number;

  /** Whether section can be collapsed */
  collapsible?: boolean;

  /** Default collapsed state */
  defaultCollapsed?: boolean;
}

/**
 * Layout configuration for card rendering
 */
export interface DomainCardLayout {
  type: "default" | "grid" | "list" | "table";
  columns?: number;
  spacing?: "compact" | "normal" | "relaxed";
}

/**
 * Complete domain card configuration
 */
export interface DomainCardConfig {
  /** Card component or "default" for generic renderer */
  component?: React.ComponentType<DomainCardProps> | "default";

  /** Field configurations */
  fields: DomainCardFieldConfig[];

  /** Section grouping */
  sections?: DomainCardSection[];

  /** Custom property formatters */
  formatters?: Record<string, FieldFormatter>;

  /** Layout configurations by size */
  layout?: {
    compact?: DomainCardLayout;
    standard?: DomainCardLayout;
    detailed?: DomainCardLayout;
  };

  /** Extend from another domain */
  extends?: string;

  /** Override inherited configuration */
  overrides?: Partial<DomainCardConfig>;

  /** Entity-specific overrides */
  entityOverrides?: Record<string, Partial<DomainCardConfig>>;
}

/**
 * Component registry for custom card components
 */
export interface DomainCardComponentRegistry {
  [domainName: string]: React.ComponentType<DomainCardProps>;
}
