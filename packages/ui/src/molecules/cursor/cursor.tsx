/**
 * Cursor Component
 *
 * Displays a user cursor for showing remote user positions
 * in collaborative editing. Based on shadcn collaborative canvas example.
 */

"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export interface CursorProps {
  x: number;
  y: number;
  name: string;
  color?: string;
  isVisible?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const defaultColors = [
  "#3B82F6", // blue
  "#10B981", // green
  "#EAB308", // yellow
  "#A855F7", // purple
  "#EC4899", // pink
  "#6366F1", // indigo
  "#EF4444", // red
  "#F97316", // orange
];

function getColorForUser(name: string, color?: string): string {
  if (color) return color;
  const hash = name.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return defaultColors[Math.abs(hash) % defaultColors.length];
}

export function Cursor({
  x,
  y,
  name,
  color,
  isVisible = true,
  className,
  style,
}: CursorProps) {
  const cursorColor = getColorForUser(name, color);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-50 transition-all",
        className
      )}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        ...style,
      }}
    >
      {/* Cursor SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md"
      >
        <path
          d="M5.65376 12.3673L13.0564 19.7699L10.9032 20.9998L6.00001 22L7.00001 17.0967L8.22986 14.9435L5.65376 12.3673Z"
          fill={cursorColor}
        />
        <path
          d="M5.65376 12.3673L13.0564 19.7699L10.9032 20.9998L6.00001 22L7.00001 17.0967L8.22986 14.9435L5.65376 12.3673Z"
          fill="white"
          fillOpacity="0.2"
        />
        <path
          d="M12.0244 4.57898L14.0369 18.4933L11.7629 16.2193L10.0781 17.9041L5.65376 12.3673L7.33858 10.6826L5.06454 8.40851L12.0244 4.57898Z"
          fill={cursorColor}
        />
      </svg>

      {/* Name label */}
      <div
        className="absolute top-5 left-5 px-2 py-1 rounded-md text-xs font-medium text-white shadow-md whitespace-nowrap"
        style={{
          backgroundColor: cursorColor,
        }}
      >
        {name}
      </div>
    </div>
  );
}
