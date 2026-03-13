/**
 * Domain Legend Configuration
 *
 * Controls how domain appears in legends and filters.
 */

export interface DomainLegendConfig {
  /** Show domain in legend */
  visible?: boolean;

  /** Display order in legend (lower first) */
  order?: number;

  /** Group name for legend grouping */
  group?: string;

  /** Collapsed by default */
  defaultCollapsed?: boolean;

  /** Show entity count badge */
  showEntityCount?: boolean;

  /** Show visibility toggle */
  showToggle?: boolean;

  /** Custom label for legend (override displayName) */
  legendLabel?: string;

  /** Badge text (e.g., "NEW", "BETA", "PRO") */
  badge?: string;

  /** Badge color */
  badgeColor?: string;
}
