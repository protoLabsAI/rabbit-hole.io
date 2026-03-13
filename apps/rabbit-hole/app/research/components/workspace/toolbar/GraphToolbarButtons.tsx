"use client";

import { Icon } from "@proto/icon-system";
import { Popover, PopoverContent, PopoverTrigger } from "@proto/ui/atoms";

import { cn } from "@/lib/utils";

export type GraphLayout = "elk" | "force" | "manual";

interface GraphToolbarButtonsProps {
  currentLayout: GraphLayout;
  onLayoutChange: (layout: GraphLayout) => void;
  onImport?: () => void;
  onExport?: () => void;
  filterPopover?: React.ReactNode;
  // Version management
  onSaveVersion?: () => void;
  onVersionBrowserOpen?: () => void;
}

export function GraphToolbarButtons({
  currentLayout,
  onLayoutChange,
  onImport,
  onExport,
  filterPopover,
  onSaveVersion,
  onVersionBrowserOpen,
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

      {/* Drawing Tools - Coming Soon */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="p-2 rounded-md transition-colors text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50"
            title="Drawing Tools (Coming Soon)"
          >
            <Icon name="pencil" size={16} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 z-[70]" align="start" side="bottom">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon name="pencil" size={16} className="text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Drawing Tools</h4>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  Coming Soon
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Freehand drawing, shapes, and annotations for your research
              workspace.
            </p>
          </div>
        </PopoverContent>
      </Popover>
      <div className="h-4 w-px bg-border mx-1" />

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
