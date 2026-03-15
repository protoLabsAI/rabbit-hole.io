/**
 * Theme Display Metadata
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
    name: "Rabbit Hole",
    description: "Reading-optimized theme with warm tones",
    category: "Standard",
  },
  "prod-environment": {
    name: "Rabbit Hole",
    description: "Reading-optimized theme with warm tones",
    category: "Standard",
  },
} as const;
