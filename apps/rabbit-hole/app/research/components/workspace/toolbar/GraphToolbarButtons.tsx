"use client";

import type { ToolType } from "@protolabsai/freehand-drawing";
import { Icon } from "@protolabsai/icon-system";

import { cn } from "@/lib/utils";

export type GraphLayout = "elk" | "force" | "manual";

interface GraphToolbarButtonsProps {
  currentLayout: GraphLayout;
  onLayoutChange: (layout: GraphLayout) => void;
  onImport?: () => void;
  onExport?: () => void;
  filterPopover?: React.ReactNode;
  onSaveVersion?: () => void;
  onVersionBrowserOpen?: () => void;
  freehandEnabled?: boolean;
  activeDrawingTool?: ToolType;
  onToggleFreehand?: () => void;
  onDrawingToolChange?: (tool: ToolType) => void;
}

export function GraphToolbarButtons({
  currentLayout,
  onLayoutChange,
  onImport,
  onExport,
  filterPopover,
  onSaveVersion,
  onVersionBrowserOpen,
  freehandEnabled = false,
  activeDrawingTool = "move",
  onToggleFreehand,
  onDrawingToolChange,
}: GraphToolbarButtonsProps) {
  return (
    <>
      {/* Version management buttons */}
      {onSaveVersion && (
        <button
          type="button"
          onClick={onSaveVersion}
          className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Save Version"
        >
          <Icon name="bookmark" size={16} />
        </button>
      )}

      {onVersionBrowserOpen && (
        <button
          type="button"
          onClick={onVersionBrowserOpen}
          className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Browse Versions"
        >
          <Icon name="history" size={16} />
        </button>
      )}

      {(onSaveVersion || onVersionBrowserOpen) && (
        <div className="h-4 w-px bg-border mx-1" />
      )}

      {/* Drawing tools — pencil/eraser toggle the freehand-drawing mode. */}
      {onToggleFreehand && onDrawingToolChange && (
        <>
          <button
            type="button"
            onClick={() => {
              if (!freehandEnabled) onToggleFreehand();
              onDrawingToolChange(
                activeDrawingTool === "freehand" ? "move" : "freehand"
              );
            }}
            className={cn(
              "p-2 rounded-md transition-all",
              freehandEnabled && activeDrawingTool === "freehand"
                ? "bg-primary/20 text-primary ring-2 ring-primary/50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title={
              freehandEnabled && activeDrawingTool === "freehand"
                ? "Pencil (active — click to exit)"
                : "Pencil — draw on the canvas"
            }
          >
            <Icon name="pencil" size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!freehandEnabled) onToggleFreehand();
              onDrawingToolChange(
                activeDrawingTool === "eraser" ? "move" : "eraser"
              );
            }}
            className={cn(
              "p-2 rounded-md transition-all",
              freehandEnabled && activeDrawingTool === "eraser"
                ? "bg-primary/20 text-primary ring-2 ring-primary/50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title={
              freehandEnabled && activeDrawingTool === "eraser"
                ? "Eraser (active — click to exit)"
                : "Eraser — drag over strokes to delete"
            }
          >
            <Icon name="eraser" size={16} />
          </button>
          <div className="h-4 w-px bg-border mx-1" />
        </>
      )}

      {/* Filter Entity Types */}
      {filterPopover}

      {/* Separator */}
      {filterPopover && <div className="h-4 w-px bg-border mx-1" />}

      <button
        onClick={() => onLayoutChange("manual")}
        className={cn(
          "p-2 rounded-md transition-all",
          currentLayout === "manual"
            ? "bg-primary/20 text-primary ring-2 ring-primary/50"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        title="Manual Layout - Position nodes yourself (persisted)"
      >
        <Icon name="hand" size={16} />
      </button>
      <button
        onClick={() => onLayoutChange("elk")}
        className={cn(
          "p-2 rounded-md transition-all",
          currentLayout === "elk"
            ? "bg-primary/20 text-primary ring-2 ring-primary/50"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        title="ELK Tree Layout - Hierarchical tree arrangement (temporary)"
      >
        <Icon name="git-branch" size={16} />
      </button>
      <button
        onClick={() => onLayoutChange("force")}
        className={cn(
          "p-2 rounded-md transition-all",
          currentLayout === "force"
            ? "bg-primary/20 text-primary ring-2 ring-primary/50"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        title="Force Layout - Physics-based arrangement (temporary)"
      >
        <Icon name="network" size={16} />
      </button>

      {/* Import/Export separator */}
      {(onImport || onExport) && <div className="h-4 w-px bg-border mx-1" />}

      {/* Import button */}
      {onImport && (
        <button
          onClick={onImport}
          className="p-2 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Import Bundle - Add entities from JSON file"
        >
          <Icon name="upload" size={16} />
        </button>
      )}

      {/* Export button */}
      {onExport && (
        <button
          onClick={onExport}
          className="p-2 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Export Bundle - Download visible entities as JSON"
        >
          <Icon name="download" size={16} />
        </button>
      )}
    </>
  );
}
