/**
 * Default Cytoscape Styling Configuration
 *
 * Extracted from AtlasPage lines 842-961 with dynamic configuration support.
 * Provides base styles for nodes, edges, highlighting, and selection states.
 *
 * Theme-aware: Uses CSS variables from the theme system for proper dark/light mode support
 */

import type { GraphStyleConfig } from "./types";

/**
 * Get computed CSS variable value from the document root
 * Converts HSL format to RGB hex for Cytoscape compatibility
 */
function getCSSVariable(
  variableName: string,
  fallback: string = "#000000"
): string {
  if (typeof window === "undefined") return fallback;

  const root = document.documentElement;
  const value = getComputedStyle(root).getPropertyValue(variableName).trim();

  if (!value) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `CSS variable ${variableName} not found, using fallback: ${fallback}`
      );
    }
    return fallback;
  }

  // If it's an HSL value (e.g., "222.2 84% 4.9%"), convert to hex
  if (value.includes("%")) {
    try {
      const hslValues = value.split(/\s+/);
      if (hslValues.length === 3) {
        const h = parseFloat(hslValues[0]);
        const s = parseFloat(hslValues[1]) / 100;
        const l = parseFloat(hslValues[2]) / 100;
        const hexColor = hslToHex(h, s, l);
        if (process.env.NODE_ENV === "development") {
          console.log(
            `Converted ${variableName}: hsl(${h}, ${s * 100}%, ${l * 100}%) -> ${hexColor}`
          );
        }
        return hexColor;
      }
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.error(`Failed to convert ${variableName}:`, e);
      }
      return fallback;
    }
  }

  // If it's already a hex or named color
  if (value.startsWith("#")) return value;

  if (process.env.NODE_ENV === "development") {
    console.warn(
      `Unknown format for ${variableName}: ${value}, using fallback`
    );
  }
  return fallback;
}

/**
 * Convert HSL to Hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Get theme colors for graph styling
 * Uses dark-friendly fallbacks that work in both light and dark modes
 */
export function getThemeColors() {
  const colors = {
    foreground: getCSSVariable("--foreground", "#1f2937"), // Dark gray for light mode
    mutedForeground: getCSSVariable("--muted-foreground", "#6b7280"),
    primary: getCSSVariable("--primary", "#3b82f6"),
    success: getCSSVariable("--success", "#10b981"),
    border: getCSSVariable("--border", "#9ca3af"), // Medium gray for visibility
  };

  if (process.env.NODE_ENV === "development") {
    console.log("🎨 Theme colors for graph:", colors);
  }
  return colors;
}

/**
 * Helper function to determine if edge labels should be shown
 * Based on view mode and label visibility settings
 */
export function shouldShowEdgeLabels(
  viewMode?: string,
  showLabels?: boolean
): boolean {
  if (!showLabels) return false;

  // Only show edge labels in focused views like "ego" mode
  // Hide in full atlas view for performance
  return viewMode === "ego" || viewMode === "focused";
}

/**
 * Generate Cytoscape style array with configurable label visibility
 * Uses theme colors for proper dark/light mode support
 */
export function createCytoscapeStyles(
  options: {
    showLabels?: boolean;
    showEdgeLabels?: boolean;
    viewMode?: string;
  } = {}
): Array<{ selector: string; style: Record<string, any> }> {
  const {
    showLabels = true,
    showEdgeLabels,
    viewMode = "full-atlas",
  } = options;
  // If showEdgeLabels explicitly provided, use it; otherwise use viewMode logic
  const showEdgeLabelsResolved =
    showEdgeLabels !== undefined
      ? showEdgeLabels
      : shouldShowEdgeLabels(viewMode, showLabels);

  // Get theme colors
  const colors = getThemeColors();

  return [
    // Node styling
    {
      selector: "node",
      style: {
        width: "data(size)",
        height: "data(size)",
        "background-color": "data(color)",
        "background-opacity": 0.1,
        "border-width": 3,
        "border-color": "data(color)",
        "border-opacity": 0.8,
        label: showLabels ? "data(label)" : "",
        color: colors.foreground, // Theme-aware text color
        "text-valign": "bottom",
        "text-halign": "center",
        "font-size": "11px",
        "font-weight": 600,
        "text-wrap": "wrap",
        "text-max-width": "100px",
        "text-margin-y": 8,
        "overlay-opacity": 0,
      },
    },

    // Edge styling
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": colors.border, // Theme-aware edge color
        "target-arrow-color": colors.border,
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        opacity: 0.6,
        label: showEdgeLabelsResolved ? "data(label)" : "",
        "font-size": "9px",
        color: colors.mutedForeground, // Theme-aware text color
        "text-rotation": "autorotate",
        "text-margin-y": -10,
      },
    },

    // Selected node
    {
      selector: "node.selected",
      style: {
        "border-width": 5,
        "border-color": colors.primary, // Theme-aware selection color
        "background-opacity": 0.3,
        "z-index": 999,
      },
    },

    // Highlighted connections
    {
      selector: "node.highlighted",
      style: {
        "border-color": colors.primary, // Theme-aware highlight color
        "border-width": 4,
        "background-opacity": 0.25,
      },
    },

    // Outgoing relationship highlighting (from selected node)
    {
      selector: "edge.highlighted-outgoing",
      style: {
        "line-color": colors.success, // Theme-aware success/green color
        "target-arrow-color": colors.success,
        width: 4,
        opacity: 1,
        "z-index": 100,
      },
    },

    // Incoming relationship highlighting (to selected node)
    {
      selector: "edge.highlighted-incoming",
      style: {
        "line-color": colors.primary, // Theme-aware primary/blue color
        "target-arrow-color": colors.primary,
        width: 4,
        opacity: 1,
        "z-index": 100,
      },
    },

    // Neutral highlighted edges
    {
      selector: "edge.highlighted-neutral",
      style: {
        "line-color": colors.mutedForeground, // Theme-aware muted color
        "target-arrow-color": colors.mutedForeground,
        width: 3,
        opacity: 1,
        "z-index": 100,
      },
    },

    // Faded elements
    {
      selector: "node.faded",
      style: {
        opacity: 0.3,
      },
    },

    {
      selector: "edge.faded",
      style: {
        opacity: 0.2,
      },
    },
  ];
}

/**
 * Default styling configuration
 */
export const defaultStyles: GraphStyleConfig = {
  showLabels: true,
  showEdgeLabels: false, // Default to false for performance
  styles: createCytoscapeStyles(),
};

/**
 * Create custom style configuration with overrides
 */
export function createStyleConfig(
  overrides: Partial<GraphStyleConfig> = {}
): GraphStyleConfig {
  const config = {
    ...defaultStyles,
    ...overrides,
  };

  // Regenerate styles if label settings changed
  if (
    overrides.showLabels !== undefined ||
    overrides.showEdgeLabels !== undefined
  ) {
    config.styles = createCytoscapeStyles({
      showLabels: config.showLabels,
      showEdgeLabels: config.showEdgeLabels,
    });
  }

  return config;
}
