/**
 * Production Environment Theme
 *
 * Optimized for prolonged reading and search use.
 * Evidence-based color choices:
 * - Light mode: warm off-white (#F8F7F4) bg, off-black (#1C1C1E) text
 * - Dark mode: off-black (#141414) bg, off-white (#E0E0E0) text
 * - Contrast ratio ~12:1 (comfortable range, avoids halation)
 * - Warm tints reduce blue light and match indoor ambient lighting
 *
 * Sources: NN/g dark mode research, APCA Lc 90 body text target,
 * Material Design dark theme, Perplexity/Linear/iA Writer color analysis
 */

import { ThemeConfig } from "../../config";

export const prodEnvironmentTheme: ThemeConfig = {
  name: "prod-environment",
  displayName: "Production Environment",
  description: "Professional theme optimized for production use",
  version: "1.0.0",
  branding: {
    name: "rabbit-hole.io",
    tagline: "Alice was on to something",
    logo: "/rabbit-hole.svg",
    favicon: "/favicon.svg",
    homeUrl: "/",
  },
  colors: {
    light: {
      primary: {
        50: "#f8fafc",
        100: "#f1f5f9",
        200: "#e2e8f0",
        300: "#cbd5e1",
        400: "#94a3b8",
        500: "#475569", // Muted slate primary for production
        600: "#334155",
        700: "#1e293b",
        800: "#0f172a",
        900: "#020617",
        950: "#020617",
      },
      secondary: {
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
      accent: {
        50: "#f8fafc",
        100: "#f1f5f9",
        200: "#e2e8f0",
        300: "#cbd5e1",
        400: "#94a3b8",
        500: "#64748b", // Subtle accent color for production
        600: "#475569",
        700: "#334155",
        800: "#1e293b",
        900: "#0f172a",
        950: "#020617",
      },
      success: {
        50: "#f0fdf4",
        100: "#dcfce7",
        200: "#bbf7d0",
        300: "#86efac",
        400: "#4ade80",
        500: "#16a34a", // Slightly muted green for prod
        600: "#15803d",
        700: "#166534",
        800: "#14532d",
        900: "#052e16",
        950: "#052e16",
      },
      warning: {
        50: "#fffbeb",
        100: "#fef3c7",
        200: "#fde68a",
        300: "#fcd34d",
        400: "#fbbf24",
        500: "#d97706", // More conservative warning color
        600: "#b45309",
        700: "#92400e",
        800: "#78350f",
        900: "#451a03",
        950: "#451a03",
      },
      error: {
        50: "#fef2f2",
        100: "#fee2e2",
        200: "#fecaca",
        300: "#fca5a5",
        400: "#f87171",
        500: "#dc2626", // Professional red for errors
        600: "#b91c1c",
        700: "#991b1b",
        800: "#7f1d1d",
        900: "#450a0a",
        950: "#450a0a",
      },
      info: {
        50: "#f0f9ff",
        100: "#e0f2fe",
        200: "#bae6fd",
        300: "#7dd3fc",
        400: "#38bdf8",
        500: "#0284c7", // Subtle info blue
        600: "#0369a1",
        700: "#075985",
        800: "#0c4a6e",
        900: "#082f49",
        950: "#082f49",
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
        primary: "#F8F7F4", // Warm off-white — reduces blue light, matches Perplexity
        secondary: "#F0EFEC", // Sidebar, chrome
        tertiary: "#E8E7E4",
        muted: "#EEEDEA",
      },
      foreground: {
        primary: "#1C1C1E", // Off-black body text — ~12:1 contrast on #F8F7F4
        secondary: "#48484A", // Secondary text
        muted: "#8E8E93", // Metadata, placeholders
        inverse: "#F8F7F4",
      },
      border: {
        primary: "rgba(60, 60, 67, 0.18)", // Warm gray borders
        secondary: "rgba(60, 60, 67, 0.10)",
        muted: "rgba(60, 60, 67, 0.05)",
      },
      overlay: {
        light: "rgba(255, 255, 255, 0.25)",
        medium: "rgba(255, 255, 255, 0.4)",
        dark: "rgba(71, 85, 105, 0.5)",
      },
    },
    dark: {
      primary: {
        50: "#020617",
        100: "#0f172a",
        200: "#1e293b",
        300: "#334155",
        400: "#475569",
        500: "#64748b", // Lighter slate for dark prod theme
        600: "#94a3b8",
        700: "#cbd5e1",
        800: "#e2e8f0",
        900: "#f1f5f9",
        950: "#f8fafc",
      },
      secondary: {
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
      accent: {
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
        primary: "#141414", // Off-black — avoids halation, allows elevation
        secondary: "#1C1C1E", // Elevated surface (cards, panels)
        tertiary: "#2C2C2E", // Modals, popovers
        muted: "#242426",
      },
      foreground: {
        primary: "#E0E0E0", // Off-white body text — ~87% white, comfortable
        secondary: "#A0A0A0", // Secondary text
        muted: "#6B6B6B", // Metadata, placeholders
        inverse: "#141414",
      },
      border: {
        primary: "rgba(255, 255, 255, 0.12)", // Subtle light borders
        secondary: "rgba(255, 255, 255, 0.08)",
        muted: "rgba(255, 255, 255, 0.04)",
      },
      overlay: {
        light: "rgba(20, 20, 20, 0.25)",
        medium: "rgba(20, 20, 20, 0.4)",
        dark: "rgba(20, 20, 20, 0.8)",
      },
    },
  },
};
