/**
 * Theme Configuration System
 *
 * Main theme configuration interface and default theme
 */

import type { ThemeBranding } from "./branding";
import type { ColorScale, ThemeColors } from "./color-scales";

export type { ColorScale, ThemeColors, ThemeBranding };

export interface ThemeConfig {
  name: string;
  displayName: string;
  description?: string;
  version: string;
  branding?: ThemeBranding;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  typography?: {
    fontFamily?: {
      sans?: string[];
      serif?: string[];
      mono?: string[];
    };
    fontSize?: {
      xs?: string;
      sm?: string;
      base?: string;
      lg?: string;
      xl?: string;
      "2xl"?: string;
      "3xl"?: string;
      "4xl"?: string;
    };
  };
  spacing?: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
  };
  /** Domain customization overrides */
  domainOverrides?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partial<DomainConfig> causes circular dependency
    [domainName: string]: any;
  };
  borderRadius?: {
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
  };
}

// Default theme configuration
export const defaultTheme: ThemeConfig = {
  name: "default",
  displayName: "Default Theme",
  description: "The default Rabbit Hole theme",
  version: "1.0.0",
  branding: {
    name: "rabbit-hole.io",
    tagline: "Alice was on to something",
    logo: "🐰",
    favicon:
      "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐰</text></svg>",
    homeUrl: "/atlas",
  },
  colors: {
    light: {
      primary: {
        50: "#eff6ff",
        100: "#dbeafe",
        200: "#bfdbfe",
        300: "#93c5fd",
        400: "#60a5fa",
        500: "#3b82f6",
        600: "#2563eb",
        700: "#1d4ed8",
        800: "#1e40af",
        900: "#1e3a8a",
        950: "#172554",
      },
      secondary: {
        50: "#f8fafc",
        100: "#f1f5f9",
        200: "#e2e8f0",
        300: "#cbd5e1",
        400: "#94a3b8",
        500: "#64748b",
        600: "#475569",
        700: "#334155",
        800: "#1e293b",
        900: "#0f172a",
        950: "#020617",
      },
      accent: {
        50: "#f0f9ff",
        100: "#e0f2fe",
        200: "#bae6fd",
        300: "#7dd3fc",
        400: "#38bdf8",
        500: "#0ea5e9",
        600: "#0284c7",
        700: "#0369a1",
        800: "#075985",
        900: "#0c4a6e",
        950: "#082f49",
      },
      success: {
        50: "#f0fdf4",
        100: "#dcfce7",
        200: "#bbf7d0",
        300: "#86efac",
        400: "#4ade80",
        500: "#22c55e",
        600: "#16a34a",
        700: "#15803d",
        800: "#166534",
        900: "#14532d",
        950: "#052e16",
      },
      warning: {
        50: "#fffbeb",
        100: "#fef3c7",
        200: "#fde68a",
        300: "#fcd34d",
        400: "#fbbf24",
        500: "#f59e0b",
        600: "#d97706",
        700: "#b45309",
        800: "#92400e",
        900: "#78350f",
        950: "#451a03",
      },
      error: {
        50: "#fef2f2",
        100: "#fee2e2",
        200: "#fecaca",
        300: "#fca5a5",
        400: "#f87171",
        500: "#ef4444",
        600: "#dc2626",
        700: "#b91c1c",
        800: "#991b1b",
        900: "#7f1d1d",
        950: "#450a0a",
      },
      info: {
        50: "#eff6ff",
        100: "#dbeafe",
        200: "#bfdbfe",
        300: "#93c5fd",
        400: "#60a5fa",
        500: "#3b82f6",
        600: "#2563eb",
        700: "#1d4ed8",
        800: "#1e40af",
        900: "#1e3a8a",
        950: "#172554",
      },
      gray: {
        50: "#f9fafb",
        100: "#f3f4f6",
        200: "#e5e7eb",
        300: "#d1d5db",
        400: "#9ca3af",
        500: "#6b7280",
        600: "#4b5563",
        700: "#374151",
        800: "#1f2937",
        900: "#111827",
        950: "#030712",
      },
      background: {
        primary: "#ffffff",
        secondary: "#f8f9fa",
        tertiary: "#f0f1f2",
        muted: "#f3f4f6",
      },
      foreground: {
        primary: "#1a1a1a",
        secondary: "#2a2a2a",
        muted: "#525252",
        inverse: "#ffffff",
      },
      border: {
        primary: "rgba(0, 0, 0, 0.2)",
        secondary: "rgba(0, 0, 0, 0.1)",
        muted: "rgba(0, 0, 0, 0.05)",
      },
      overlay: {
        light: "rgba(255, 255, 255, 0.25)",
        medium: "rgba(255, 255, 255, 0.4)",
        dark: "rgba(0, 0, 0, 0.5)",
      },
    },
    dark: {
      primary: {
        50: "#172554",
        100: "#1e3a8a",
        200: "#1e40af",
        300: "#1d4ed8",
        400: "#2563eb",
        500: "#3b82f6",
        600: "#60a5fa",
        700: "#93c5fd",
        800: "#bfdbfe",
        900: "#dbeafe",
        950: "#eff6ff",
      },
      secondary: {
        50: "#020617",
        100: "#0f172a",
        200: "#1e293b",
        300: "#334155",
        400: "#475569",
        500: "#64748b",
        600: "#94a3b8",
        700: "#cbd5e1",
        800: "#e2e8f0",
        900: "#f1f5f9",
        950: "#f8fafc",
      },
      accent: {
        50: "#082f49",
        100: "#0c4a6e",
        200: "#075985",
        300: "#0369a1",
        400: "#0284c7",
        500: "#0ea5e9",
        600: "#38bdf8",
        700: "#7dd3fc",
        800: "#bae6fd",
        900: "#e0f2fe",
        950: "#f0f9ff",
      },
      success: {
        50: "#052e16",
        100: "#14532d",
        200: "#166534",
        300: "#15803d",
        400: "#16a34a",
        500: "#22c55e",
        600: "#4ade80",
        700: "#86efac",
        800: "#bbf7d0",
        900: "#dcfce7",
        950: "#f0fdf4",
      },
      warning: {
        50: "#451a03",
        100: "#78350f",
        200: "#92400e",
        300: "#b45309",
        400: "#d97706",
        500: "#f59e0b",
        600: "#fbbf24",
        700: "#fcd34d",
        800: "#fde68a",
        900: "#fef3c7",
        950: "#fffbeb",
      },
      error: {
        50: "#450a0a",
        100: "#7f1d1d",
        200: "#991b1b",
        300: "#b91c1c",
        400: "#dc2626",
        500: "#ef4444",
        600: "#f87171",
        700: "#fca5a5",
        800: "#fecaca",
        900: "#fee2e2",
        950: "#fef2f2",
      },
      info: {
        50: "#172554",
        100: "#1e3a8a",
        200: "#1e40af",
        300: "#1d4ed8",
        400: "#2563eb",
        500: "#3b82f6",
        600: "#60a5fa",
        700: "#93c5fd",
        800: "#bfdbfe",
        900: "#dbeafe",
        950: "#eff6ff",
      },
      gray: {
        50: "#030712",
        100: "#111827",
        200: "#1f2937",
        300: "#374151",
        400: "#4b5563",
        500: "#6b7280",
        600: "#9ca3af",
        700: "#d1d5db",
        800: "#e5e7eb",
        900: "#f3f4f6",
        950: "#f9fafb",
      },
      background: {
        primary: "#0f0f0f",
        secondary: "#1a1a1a",
        tertiary: "#262626",
        muted: "#1f2937",
      },
      foreground: {
        primary: "#ffffff",
        secondary: "#f0f0f0",
        muted: "#d0d0d0",
        inverse: "#000000",
      },
      border: {
        primary: "rgba(255, 255, 255, 0.3)",
        secondary: "rgba(255, 255, 255, 0.2)",
        muted: "rgba(255, 255, 255, 0.1)",
      },
      overlay: {
        light: "rgba(0, 0, 0, 0.25)",
        medium: "rgba(0, 0, 0, 0.4)",
        dark: "rgba(0, 0, 0, 0.8)",
      },
    },
  },
};
