"use client";

/**
 * Canvas Navigation Toolbar
 *
 * Vertical map-style navigation controls positioned at bottom-left:
 * - Zoom in/out
 * - Fit view
 * - Lock pan/zoom
 */

import { Icon } from "@protolabsai/icon-system";
import { RESEARCH_EVENTS, dispatchResearchEvent } from "@protolabsai/workspace";

import { cn } from "@/lib/utils";

interface CanvasNavigationToolbarProps {
  isLocked: boolean;
  onToggleLock: () => void;
  className?: string;
}

export function CanvasNavigationToolbar({
  isLocked,
  onToggleLock,
  className,
}: CanvasNavigationToolbarProps) {
  return (
    <div
      className={cn(
        "absolute bottom-4 left-4 z-[60] bg-card/95 backdrop-blur rounded-lg shadow-lg border border-border",
        className
      )}
    >
      <div className="flex flex-col gap-0.5 p-1.5">
        {/* Zoom In */}
        <button
          onClick={() => dispatchResearchEvent(RESEARCH_EVENTS.ZOOM_IN)}
          className="p-2.5 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Zoom In"
        >
          <Icon name="plus" size={18} />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => dispatchResearchEvent(RESEARCH_EVENTS.ZOOM_OUT)}
          className="p-2.5 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Zoom Out"
        >
          <Icon name="minus" size={18} />
        </button>

        {/* Separator */}
        <div className="h-px bg-border my-0.5" />

        {/* Fit View */}
        <button
          onClick={() => dispatchResearchEvent(RESEARCH_EVENTS.FIT_VIEW)}
          className="p-2.5 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Fit to View"
        >
          <Icon name="maximize" size={18} />
        </button>

        {/* Separator */}
        <div className="h-px bg-border my-0.5" />

        {/* Lock/Unlock */}
        <button
          onClick={onToggleLock}
          className={cn(
            "p-2.5 rounded-md transition-all",
            isLocked
              ? "bg-primary/20 text-primary ring-2 ring-primary/50"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          title={isLocked ? "Unlock Pan/Zoom" : "Lock Pan/Zoom"}
        >
          {isLocked ? (
            <Icon name="lock" size={18} />
          ) : (
            <Icon name="unlock" size={18} />
          )}
        </button>
      </div>
    </div>
  );
}
