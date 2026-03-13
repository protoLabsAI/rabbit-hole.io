/**
 * Domain Metadata Interface
 *
 * Shared interface for all domain metadata including UI configuration.
 * Ensures consistent structure across all domains.
 */

import type { DomainCardConfig } from "./domain-system/domain-card-config.interface";
import type { DomainLegendConfig } from "./domain-system/legend-config.interface";

export interface DomainUIConfig {
  color: string;
  icon: string;
  entityIcons?: Record<string, string>;
  entityColors?: Record<string, string>;
  card?: DomainCardConfig;
  entityCards?: Record<string, DomainCardConfig>; // Entity-specific card configs
  legend?: DomainLegendConfig;
}

export interface DomainMetadata {
  name: string;
  description: string;
  entityCount: number;
  relationships: readonly string[];
  ui: DomainUIConfig;
}

// ==================== Type Guards ====================

export function isDomainMetadata(obj: unknown): obj is DomainMetadata {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "name" in obj &&
    "description" in obj &&
    "entityCount" in obj &&
    "relationships" in obj &&
    "ui" in obj
  );
}
