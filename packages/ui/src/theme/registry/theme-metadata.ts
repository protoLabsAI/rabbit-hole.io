/**
 * Theme Display Metadata
 *
 * UI-friendly metadata for theme selection interfaces
 */

import type { AvailableThemeName } from "./theme-registry";

export const themeDisplayInfo: Record<
  AvailableThemeName,
  {
    name: string;
    description: string;
    category: string;
  }
> = {
  default: {
    name: "Default",
    description: "Clean, modern design system",
    category: "Standard",
  },
  "corporate-blue": {
    name: "Corporate Blue",
    description: "Professional blue scheme for enterprise",
    category: "Business",
  },
  "curious-minds": {
    name: "Curious Minds",
    description: "AI & web development learning platform",
    category: "Applications",
  },
  "nature-green": {
    name: "Nature Green",
    description: "Earth-friendly green for sustainability brands",
    category: "Environmental",
  },
  "dev-environment": {
    name: "Development",
    description: "High-contrast theme for development environment",
    category: "Environment",
  },
  "prod-environment": {
    name: "Production",
    description: "Professional theme optimized for production",
    category: "Environment",
  },
  noto: {
    name: "Noto",
    description: "Warm, focused theme for AI-powered writing",
    category: "Applications",
  },
  svgval: {
    name: "SVGval",
    description: "Creative, vibrant theme for SVG illustration generation",
    category: "Applications",
  },
} as const;
