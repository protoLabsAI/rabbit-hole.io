/**
 * Layout Mode Indicator
 *
 * Shows current graph layout mode with visual badge.
 */

"use client";

import { Icon } from "@protolabsai/icon-system";
import type { RegisteredIconName } from "@protolabsai/icon-system";

export type LayoutMode = "saved" | "dagre" | "force";

interface LayoutModeIndicatorProps {
  mode: LayoutMode;
  className?: string;
}

export function LayoutModeIndicator({
  mode,
  className,
}: LayoutModeIndicatorProps) {
  const config: Record<
    LayoutMode,
    {
      icon: RegisteredIconName;
      label: string;
      color: string;
      description: string;
    }
  > = {
    saved: {
      icon: "anchor",
      label: "Saved",
      color: "bg-green-500/90",
      description: "Manual positions preserved",
    },
    dagre: {
      icon: "git-branch",
      label: "Hierarchical",
      color: "bg-blue-500/90",
      description: "Tree layout",
    },
    force: {
      icon: "network",
      label: "Force",
      color: "bg-purple-500/90",
      description: "Physics simulation",
    },
  };

  const modeConfig = config[mode];

  return (
    <div
      className={`flex items-center gap-1.5 ${modeConfig.color} text-white px-2 py-1 rounded text-xs font-medium ${className || ""}`}
      title={modeConfig.description}
    >
      <Icon name={modeConfig.icon} size={12} />
      <span>{modeConfig.label}</span>
    </div>
  );
}
