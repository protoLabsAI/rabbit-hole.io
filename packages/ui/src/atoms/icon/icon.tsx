"use client";

// eslint-disable-next-line no-restricted-imports -- Icon component is the base abstraction over lucide-react
import * as LucideIcons from "lucide-react";
import React from "react";

export type RegisteredIconName = string;

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  strokeWidth?: number;
  fill?: string;
  "aria-label"?: string;
}

/**
 * Simple Icon wrapper for lucide-react
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  color,
  className,
  strokeWidth = 2,
  fill,
  "aria-label": ariaLabel,
}) => {
  // Convert kebab-case to PascalCase (e.g., "chevron-down" -> "ChevronDown")
  const iconName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Lucide icons have dynamic types
  const IconComponent = (LucideIcons as any)[iconName];

  if (!IconComponent) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`Icon "${name}" (${iconName}) not found in lucide-react`);
    }
    return null;
  }

  return (
    <IconComponent
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      fill={fill || "none"}
      className={className}
      aria-label={ariaLabel || name}
    />
  );
};
