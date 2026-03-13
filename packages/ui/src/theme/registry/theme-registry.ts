/**
 * Theme Registry
 *
 * Central registry of all available themes for the whitelabel system
 */

import { z } from "zod";

import { defaultTheme } from "../config";
import type { ThemeConfig } from "../config";

import { corporateBlueTheme } from "./examples/corporate-blue.theme";
import { curiousMindsTheme } from "./examples/curious-minds.theme";
import { devEnvironmentTheme } from "./examples/dev-environment.theme";
import { natureGreenTheme } from "./examples/nature-green.theme";
import { notoTheme } from "./examples/noto.theme";
import { prodEnvironmentTheme } from "./examples/prod-environment.theme";
import { svgvalTheme } from "./examples/svgval.theme";

// Registry of all available themes
export const availableThemes = {
  default: defaultTheme,
  "corporate-blue": corporateBlueTheme,
  "curious-minds": curiousMindsTheme,
  "nature-green": natureGreenTheme,
  "dev-environment": devEnvironmentTheme,
  "prod-environment": prodEnvironmentTheme,
  noto: notoTheme,
  svgval: svgvalTheme,
} as const;

// Type for theme names
export type AvailableThemeName = keyof typeof availableThemes;

// Zod schema for theme name validation
export const themeNameSchema = z.enum([
  "default",
  "corporate-blue",
  "curious-minds",
  "nature-green",
  "dev-environment",
  "prod-environment",
  "noto",
  "svgval",
]);

// Validated theme name getter with fallback
export function getValidatedThemeName(
  value: string | undefined,
  fallback: AvailableThemeName = "dev-environment"
): AvailableThemeName {
  const result = themeNameSchema.safeParse(value);

  if (!result.success) {
    console.warn(
      `⚠️ Invalid theme name: "${value}". Using fallback: "${fallback}"`
    );
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
