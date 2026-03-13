/**
 * Relationship UI Configuration
 *
 * STUB: Interface defined for future implementation.
 * See: handoffs/2025-10-04_domain-system-white-label-audit.md Phase 3
 */

export interface RelationshipUIConfig {
  /** Edge color */
  color?: string;

  /** Icon for relationship type */
  icon?: string;

  /** Display label */
  displayLabel?: string;

  /** FUTURE: Edge styling */
  lineStyle?: "solid" | "dashed" | "dotted";
  width?: number;
  arrowStyle?: "triangle" | "circle" | "diamond" | "none";
  category?: string;
  showLabel?: boolean;
}

export interface DomainRelationshipCategoryConfig {
  id: string;
  displayName: string;
  icon: string;
  color: string;
}

// NOTE: Not yet integrated - add to DomainConfig.ui in Phase 3
