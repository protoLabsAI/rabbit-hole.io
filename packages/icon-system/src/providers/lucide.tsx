"use client";

import * as LucideIcons from "lucide-react";
import React from "react";

import type { IconProviderProps } from "../types";

/**
 * Lucide Icon Provider
 *
 * Uses static imports for reliability. Tree-shaking is preserved
 * through webpack/vite dead code elimination of unused exports.
 */
export const LucideProvider: React.FC<IconProviderProps> = ({
  definition,
  size,
  color,
  strokeWidth = 2,
  fill = "none",
  className,
}) => {
  const IconComponent = (LucideIcons as any)[definition.identifier];

  if (!IconComponent || typeof IconComponent !== "function") {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`Icon "${definition.identifier}" not found in lucide-react`);
    }
    return null;
  }

  return (
    <IconComponent
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      fill={fill}
      className={className}
    />
  );
};
