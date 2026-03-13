/**
 * Domain Card Types
 *
 * Shared interfaces and types for domain-specific node cards.
 */

import type { EntityType } from "@proto/types";

/**
 * Domain names from the type system - all 12 domains
 */
export type DomainName =
  | "biological" // Life sciences - animals, plants, species, etc.
  | "social" // People, organizations, movements, etc.
  | "medical" // Healthcare - diseases, drugs, hospitals, etc.
  | "technology" // Software, hardware, APIs, etc.
  | "geographic" // Countries, cities, regions, etc.
  | "economic" // Markets, currencies, companies, etc.
  | "academic" // Universities, research, publications, etc.
  | "legal" // Laws, courts, cases, contracts, etc.
  | "cultural" // Books, films, art, languages, etc.
  | "infrastructure" // Buildings, bridges, utilities, etc.
  | "transportation" // Vehicles, routes, stations, etc.
  | "astronomical"; // Planets, stars, galaxies, etc.

/**
 * Node data structure for domain cards
 */
export interface DomainNodeData {
  uid: string;
  name: string;
  type: EntityType;
  properties?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Base props for all domain card components
 */
export interface DomainCardProps {
  /** Node data with entity information */
  node: DomainNodeData;

  /** Domain classification */
  domain: DomainName;

  /** Optional custom styling */
  className?: string;

  /** Optional inline styles */
  style?: React.CSSProperties;

  /** Card size variant */
  size?: "compact" | "standard" | "detailed";

  /** Click handler for card interaction */
  onClick?: (node: DomainNodeData) => void;

  /** Whether card is selectable */
  selectable?: boolean;

  /** Whether card is interactive */
  interactive?: boolean;
}

/**
 * Domain card component type
 */
export type DomainCardComponent = React.FC<DomainCardProps>;

/**
 * Base props for domain card components
 */
export interface BaseDomainCardProps extends DomainCardProps {
  children: React.ReactNode;
}

/**
 * Registry of domain card components
 */
export interface DomainCardRegistry {
  [key: string]: DomainCardComponent;
}
