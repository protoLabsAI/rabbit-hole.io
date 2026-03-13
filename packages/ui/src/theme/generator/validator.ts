/**
 * Theme Validation Utilities
 *
 * Validates theme configurations and generated CSS
 */

import type { ThemeConfig, ThemeColors } from "../config";

/**
 * Validate theme configuration
 */
export function validateTheme(theme: ThemeConfig): string[] {
  const errors: string[] = [];

  if (!theme.name) {
    errors.push("Theme name is required");
  }

  if (!theme.displayName) {
    errors.push("Theme display name is required");
  }

  if (!theme.version) {
    errors.push("Theme version is required");
  }

  // Validate required color scales
  const requiredScales = [
    "primary",
    "success",
    "warning",
    "error",
    "info",
    "gray",
  ];

  for (const mode of ["light", "dark"] as const) {
    const colors = theme.colors[mode];

    for (const scale of requiredScales) {
      if (!colors[scale as keyof ThemeColors]) {
        errors.push(`Missing ${scale} color scale for ${mode} mode`);
      }
    }

    // Validate background colors
    if (!colors.background?.primary) {
      errors.push(`Missing background.primary for ${mode} mode`);
    }

    // Validate foreground colors
    if (!colors.foreground?.primary) {
      errors.push(`Missing foreground.primary for ${mode} mode`);
    }
  }

  return errors;
}

/**
 * Validate generated CSS against theme configuration
 */
export function validateGeneratedCSS(css: string): string[] {
  const errors: string[] = [];

  // Required CSS variables that must be present
  const requiredVars = [
    // Primary colors
    "--primary-50",
    "--primary-100",
    "--primary-200",
    "--primary-300",
    "--primary-400",
    "--primary-500",
    "--primary-600",
    "--primary-700",
    "--primary-800",
    "--primary-900",
    "--primary-950",

    // Semantic colors
    "--success-500",
    "--warning-500",
    "--error-500",
    "--info-500",

    // Layout colors
    "--background",
    "--background-secondary",
    "--background-tertiary",
    "--background-muted",
    "--foreground",
    "--foreground-secondary",
    "--foreground-muted",
    "--foreground-inverse",
    "--border",
    "--border-secondary",
    "--border-muted",
    "--overlay-light",
    "--overlay-medium",
    "--overlay-dark",

    // shadcn/ui compatibility
    "--card",
    "--card-foreground",
    "--popover",
    "--popover-foreground",
    "--muted",
    "--muted-foreground",
    "--accent",
    "--accent-foreground",
    "--destructive",
    "--destructive-foreground",
    "--ring",
    "--radius",
  ];

  // Check for missing required variables
  const missingVars = requiredVars.filter((varName) => !css.includes(varName));
  if (missingVars.length > 0) {
    errors.push(`Missing required CSS variables: ${missingVars.join(", ")}`);
  }

  // Validate dark mode presence
  if (!css.includes("@media (prefers-color-scheme: dark)")) {
    errors.push("Missing dark mode CSS variables");
  }

  // Validate Tailwind imports
  if (!css.includes("@tailwind base")) {
    errors.push("Missing @tailwind base import");
  }
  if (!css.includes("@tailwind components")) {
    errors.push("Missing @tailwind components import");
  }
  if (!css.includes("@tailwind utilities")) {
    errors.push("Missing @tailwind utilities import");
  }

  // Validate theme metadata
  if (!css.includes("DO NOT EDIT MANUALLY")) {
    errors.push("Missing auto-generated warning comment");
  }

  return errors;
}
