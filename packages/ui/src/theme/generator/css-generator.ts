/**
 * Theme CSS Generator
 *
 * Generates CSS variables from theme configuration for whitelabel themes
 */

import type { ColorScale, ThemeConfig, ThemeColors } from "../config";

import { hexToRgb, hexToHsl } from "./color-converter";

export class ThemeGenerator {
  /**
   * Generate CSS variables from theme config
   */
  static generateCSSVariables(theme: ThemeConfig): string {
    const lightVars = this.generateColorVariables(theme.colors.light);
    const darkVars = this.generateColorVariables(theme.colors.dark);

    return `
/* Generated Theme: ${theme.displayName} v${theme.version} */
/* ${theme.description || "Custom whitelabel theme"} */

:root {
  /* Theme metadata */
  --theme-name: "${theme.name}";
  --theme-display-name: "${theme.displayName}";
  --theme-version: "${theme.version}";

${lightVars}
  
  /* Theme transitions */
  --theme-transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

/* Dark mode - system preference (lowest priority) */
@media (prefers-color-scheme: dark) {
  :root {
${darkVars}
  }
}

/* Data attribute override for programmatic theme switching (higher priority) */
[data-theme="${theme.name}"] {
${lightVars}
}

/* Explicit light mode override - needed to override system dark mode preference */
[data-theme="${theme.name}"][data-color-scheme="light"] {
${lightVars}
  
  /* Set color-scheme for native UI controls (inputs, scrollbars, dialogs) */
  color-scheme: light;
}

/* Explicit dark mode override */
[data-theme="${theme.name}"][data-color-scheme="dark"] {
${darkVars}
  
  /* Set color-scheme for native UI controls (inputs, scrollbars, dialogs) */
  color-scheme: dark;
}
`.trim();
  }

  /**
   * Generate complete globals.css file from default theme
   */
  static generateGlobalCSS(defaultTheme: ThemeConfig): string {
    const lightVars = this.generateColorVariables(defaultTheme.colors.light);
    const darkVars = this.generateColorVariables(defaultTheme.colors.dark);

    return `@tailwind base;
@tailwind components;
@tailwind utilities;

/* ============================================================================
   WHITELABEL THEME SYSTEM - CSS VARIABLES
   ============================================================================ */
/* Generated from ${defaultTheme.name} theme configuration */
/* DO NOT EDIT MANUALLY - This file is auto-generated */
/* To modify: Update themes/theme.config.ts - changes apply instantly at runtime */

:root {
${lightVars}

  /* Theme transitions */
  --theme-transition:
    background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

/* Dark Mode Variables */
@media (prefers-color-scheme: dark) {
  :root {
${darkVars}
  }

  html {
    color-scheme: dark;
  }
}

/* ============================================================================
   THEME LOADING OPTIMIZATION
   ============================================================================ */

/* Smooth transitions for all theme-related properties */
*,
*::before,
*::after {
  transition: var(--theme-transition);
}

/* Prevent layout shift during theme loading */
* {
  box-sizing: border-box;
}

/* Loading state optimization - prevents flash animations */
.theme-loading * {
  animation-duration: 0.01ms !important;
  animation-delay: -0.01ms !important;
  animation-iteration-count: 1 !important;
  background-attachment: initial !important;
  scroll-behavior: auto !important;
}

/* Theme ready state */
.theme-loaded {
  opacity: 1;
}

/* ============================================================================
   ACCESSIBILITY ENHANCEMENTS
   ============================================================================ */

/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --border: rgba(0, 0, 0, 0.4);
    --overlay-light: rgba(255, 255, 255, 0.4);
    --overlay-medium: rgba(255, 255, 255, 0.6);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --border: rgba(255, 255, 255, 0.5);
      --overlay-light: rgba(0, 0, 0, 0.4);
      --overlay-medium: rgba(0, 0, 0, 0.6);
    }
  }
}`;
  }

  /**
   * Generate color variables for light/dark mode
   */
  private static generateColorVariables(colors: ThemeColors): string {
    const vars: string[] = [];

    // Primary colors
    this.addColorScale(vars, "primary", colors.primary);

    if (colors.secondary) {
      this.addColorScale(vars, "secondary", colors.secondary);
    }

    if (colors.accent) {
      this.addColorScale(vars, "accent", colors.accent);
    }

    // Semantic colors
    this.addColorScale(vars, "success", colors.success);
    this.addColorScale(vars, "warning", colors.warning);
    this.addColorScale(vars, "error", colors.error);
    this.addColorScale(vars, "info", colors.info);
    this.addColorScale(vars, "gray", colors.gray);

    // Background colors (RGB format for opacity support)
    vars.push(`  --background: ${hexToRgb(colors.background.primary)};`);
    vars.push(
      `  --background-secondary: ${hexToRgb(colors.background.secondary)};`
    );
    vars.push(
      `  --background-tertiary: ${hexToRgb(colors.background.tertiary)};`
    );
    vars.push(`  --background-muted: ${hexToRgb(colors.background.muted)};`);

    // Foreground colors (HSL format for Tailwind)
    vars.push(`  --foreground: ${hexToHsl(colors.foreground.primary)};`);
    vars.push(
      `  --foreground-secondary: ${hexToHsl(colors.foreground.secondary)};`
    );
    vars.push(`  --foreground-muted: ${hexToHsl(colors.foreground.muted)};`);
    vars.push(
      `  --foreground-inverse: ${hexToHsl(colors.foreground.inverse)};`
    );

    // Border colors (HSL format for Tailwind)
    vars.push(`  --border: ${hexToHsl(colors.border.primary)};`);
    vars.push(`  --border-secondary: ${hexToHsl(colors.border.secondary)};`);
    vars.push(`  --border-muted: ${hexToHsl(colors.border.muted)};`);

    // Overlay colors
    vars.push(`  --overlay-light: ${colors.overlay.light};`);
    vars.push(`  --overlay-medium: ${colors.overlay.medium};`);
    vars.push(`  --overlay-dark: ${colors.overlay.dark};`);

    // shadcn/ui specific variables (RGB format for backgrounds, HSL for foregrounds)
    vars.push(`  --card: ${hexToRgb(colors.background.secondary)};`);
    vars.push(`  --card-foreground: ${hexToHsl(colors.foreground.primary)};`);
    vars.push(`  --popover: ${hexToRgb(colors.background.primary)};`);
    vars.push(
      `  --popover-foreground: ${hexToHsl(colors.foreground.primary)};`
    );
    vars.push(`  --muted: ${hexToRgb(colors.background.muted)};`);
    vars.push(`  --muted-foreground: ${hexToHsl(colors.foreground.muted)};`);
    const accentColor =
      colors.accent?.[500] || colors.secondary?.[200] || colors.gray[200];
    vars.push(`  --accent: ${hexToRgb(accentColor)};`);
    vars.push(`  --accent-foreground: ${hexToHsl(colors.foreground.primary)};`);
    vars.push(`  --destructive: ${hexToHsl(colors.error[500])};`);
    vars.push(
      `  --destructive-foreground: ${hexToHsl(colors.foreground.inverse)};`
    );
    vars.push(`  --ring: ${hexToHsl(colors.primary[400])};`);
    vars.push(`  --radius: 0.5rem;`);

    return vars.join("\n");
  }

  /**
   * Add color scale variables (HSL format for Tailwind)
   */
  private static addColorScale(
    vars: string[],
    name: string,
    scale: ColorScale | Record<string, unknown>
  ): void {
    Object.entries(scale).forEach(([weight, color]) => {
      vars.push(`  --${name}-${weight}: ${hexToHsl(color as string)};`);
    });
  }

  /**
   * Generate theme CSS file from config
   * @deprecated Use generateCSSVariables() for pure dynamic themes
   */
  static generateThemeFile(theme: ThemeConfig): string {
    console.warn(
      "generateThemeFile is deprecated - use generateCSSVariables() for pure dynamic themes"
    );
    const css = this.generateCSSVariables(theme);

    return `/*
 * ${theme.displayName} Theme - STATIC FILE (DEPRECATED)
 * Version: ${theme.version}
 * ${theme.description || "Custom whitelabel theme"}
 * 
 * WARNING: This is a static file generation method.
 * For the new pure dynamic system, use ThemeProvider which automatically
 * injects CSS variables at runtime via generateCSSVariables().
 */

${css}`;
  }
}

/**
 * Theme DOM utilities
 */
export const themeUtils = {
  /**
   * Apply theme to document
   */
  applyTheme: (themeName: string, colorScheme: "light" | "dark" = "light") => {
    const root = document.documentElement;
    root.setAttribute("data-theme", themeName);
    root.setAttribute("data-color-scheme", colorScheme);
  },

  /**
   * Get current theme
   */
  getCurrentTheme: (): { name: string; colorScheme: string } => {
    const root = document.documentElement;
    return {
      name: root.getAttribute("data-theme") || "default",
      colorScheme: root.getAttribute("data-color-scheme") || "light",
    };
  },

  /**
   * Toggle color scheme
   */
  toggleColorScheme: () => {
    const root = document.documentElement;
    const currentScheme = root.getAttribute("data-color-scheme") || "light";
    const newScheme = currentScheme === "light" ? "dark" : "light";
    root.setAttribute("data-color-scheme", newScheme);
    return newScheme;
  },
};
