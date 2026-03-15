/**
 * Theme Registry
 *
 * Single theme: prod-environment (reading-optimized).
 * This is the only theme. It serves as both "default" and "prod-environment".
 */

import { z } from "zod";

import type { ThemeConfig } from "../config";

import { prodEnvironmentTheme } from "./examples/prod-environment.theme";

// Registry — prod-environment is the only theme, aliased as default
export const availableThemes = {
  default: prodEnvironmentTheme,
  "prod-environment": prodEnvironmentTheme,
} as const;

// Type for theme names
export type AvailableThemeName = keyof typeof availableThemes;

// Zod schema for theme name validation
export const themeNameSchema = z.enum(["default", "prod-environment"]);

// Validated theme name getter with fallback
export function getValidatedThemeName(
  value: string | undefined,
  fallback: AvailableThemeName = "default"
): AvailableThemeName {
  const result = themeNameSchema.safeParse(value);

  if (!result.success) {
    // Any unknown theme falls back to default (prod-environment)
    return fallback;
  }

  return result.data;
}

// Helper functions
export function getTheme(name: AvailableThemeName): ThemeConfig {
  return availableThemes[name];
}

export function getThemeNames(): AvailableThemeName[] {
  return Object.keys(availableThemes) as AvailableThemeName[];
}

export function isValidThemeName(name: string): name is AvailableThemeName {
  return name in availableThemes;
}
