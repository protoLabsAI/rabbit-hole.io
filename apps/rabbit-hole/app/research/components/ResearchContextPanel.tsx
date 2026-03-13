"use client";

/**
 * ResearchContextPanel
 *
 * Displays documents added to the research context.
 * Shows file name, type, size, and allows removal.
 */

import { Icon } from "@proto/icon-system";
import { Badge, Button } from "@proto/ui/atoms";

import type { ContextFile } from "../hooks/useResearchContext";

const CATEGORY_ICONS: Record<string, string> = {
  document: "file-text",
  audio: "music",
  video: "film",
  text: "file-text",
};

interface ResearchContextPanelProps {
  contextFiles: ContextFile[];
  onRemove: (fileId: string) => void;
}

export function ResearchContextPanel({
  contextFiles,
  onRemove,
}: ResearchContextPanelProps) {
  if (contextFiles.length === 0) return null;

  return (
    <div className="border-t border-border px-4 py-2">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon name="folder" size={14} className="text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Research Context ({contextFiles.length})
        </span>
      </div>
      <div className="space-y-1">
        {contextFiles.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1"
          >
            <Icon
              name={(CATEGORY_ICONS[file.category] || "file") as any}
              size={12}
              className="text-muted-foreground shrink-0"
            />
            <span className="flex-1 truncate" title={file.name}>
              {file.name}
            </span>
            <Badge variant="secondary" className="text-[10px] px-1 py-0">
              {Math.round(file.textLength / 1000)}k
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0"
              onClick={() => onRemove(file.id)}
            >
              <Icon name="x" size={10} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
