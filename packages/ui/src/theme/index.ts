/**
 * @proto/ui/theme
 *
 * Complete whitelabel theming system with dynamic CSS variables,
 * View Transitions API animations, and React integration
 *
 * @example
 * ```tsx
 * // Theme Configuration
 * import { ThemeConfig, defaultTheme } from "@proto/ui/theme";
 *
 * // Theme Registry
 * import {
 *   getTheme,
 *   getThemeNames,
 *   availableThemes,
 *   type AvailableThemeName,
 * } from "@proto/ui/theme";
 *
 * // Theme Provider
 * import { ThemeProvider, useTheme } from "@proto/ui/theme";
 *
 * // Theme Generator
 * import { ThemeGenerator, validateTheme } from "@proto/ui/theme";
 *
 * // View Transitions
 * import { startThemeTransition, useThemeTransition } from "@proto/ui/theme";
 *
 * // Theme Selector UI
 * import { ThemeSelector, CompactThemeSelector } from "@proto/ui/theme";
 * ```
 */

// Configuration & Types
export * from "./config";

// Generator & Utilities
export * from "./generator";

// Theme Registry
export * from "./registry";

// View Transitions
export * from "./transitions";

// React Provider & Hooks
export * from "./provider";

// UI Components
export * from "./components";
