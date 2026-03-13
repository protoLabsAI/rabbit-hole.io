/**
 * Graph Node Configuration
 *
 * STUB: Interface defined for future implementation.
 * See: handoffs/2025-10-04_domain-system-white-label-audit.md Phase 4
 */

export interface DomainNodeConfig {
  /** Base node size */
  size?: number;

  /** Node shape */
  shape?: "ellipse" | "rectangle" | "roundrectangle" | "triangle" | "diamond";

  /** FUTURE: Full styling configuration */
  border?: {
    width?: number;
    style?: "solid" | "dashed" | "dotted";
    color?: string;
  };

  label?: {
    fontSize?: number;
    fontWeight?: "normal" | "bold";
    position?: "center" | "top" | "bottom";
  };
}

// NOTE: Not yet integrated - add to DomainConfig.ui in Phase 4
