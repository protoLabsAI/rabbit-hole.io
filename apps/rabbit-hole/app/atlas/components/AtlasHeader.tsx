"use client";

import { useRouter } from "next/navigation";
import React from "react";

import { useTheme } from "../../context/ThemeProvider";

interface AtlasHeaderProps {
  viewModeIndicator?: React.ReactNode;
  controlButtons?: React.ReactNode;
  onLogoClick?: () => void;
  entityCount?: number;
  relationshipCount?: number;
}

export function AtlasHeader({
  viewModeIndicator,
  controlButtons,
  onLogoClick,
  entityCount,
  relationshipCount,
}: AtlasHeaderProps) {
  const router = useRouter();
  const { branding } = useTheme();

  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick();
    } else {
      router.push(branding?.homeUrl || "/atlas");
    }
  };

  return (
    <div
      className="bg-card/90 shadow-sm border-b border-border flex-shrink-0"
      data-testid="atlas-header"
    >
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <button
            onClick={handleLogoClick}
            className="flex items-center hover:opacity-80 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg px-2 py-1 -mx-2 -my-1"
            data-testid="brand-section"
            title="Go to Atlas home"
          >
            <span className="text-lg font-mono text-foreground">
              rabbit hole
            </span>
          </button>

          {viewModeIndicator && (
            <div className="flex-1 flex justify-center">
              {viewModeIndicator}
            </div>
          )}

          <div className="flex items-center gap-3">
            {(entityCount !== undefined || relationshipCount !== undefined) && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {entityCount ?? 0} entities &middot; {relationshipCount ?? 0} relationships
              </span>
            )}
            {controlButtons}
          </div>
        </div>
      </div>
    </div>
  );
}
