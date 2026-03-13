"use client";

import { Icon } from "@proto/icon-system";
import { Badge, Button } from "@proto/ui/atoms";

interface RelationshipRowProps {
  type: string;
  direction: "incoming" | "outgoing";
  targetName: string;
  targetType: string;
  confidence?: number;
  onDelete: () => void;
  onTargetClick?: (targetUid: string) => void;
}

export function RelationshipRow({
  direction,
  targetName,
  targetType,
  confidence,
  onDelete,
  onTargetClick,
}: RelationshipRowProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 group">
      {/* Direction indicator */}
      <div className="flex-shrink-0">
        {direction === "outgoing" ? (
          <Icon
            name="arrow-right"
            size={14}
            className="text-muted-foreground"
          />
        ) : (
          <Icon name="arrow-left" size={14} className="text-muted-foreground" />
        )}
      </div>

      {/* Target entity */}
      <button
        onClick={() => onTargetClick?.(targetName)}
        className="flex-1 text-left text-xs hover:underline truncate"
      >
        <span className="font-medium">{targetName}</span>
        <span className="text-muted-foreground ml-1 text-xs">
          ({targetType})
        </span>
      </button>

      {/* Confidence score */}
      {confidence !== undefined && (
        <Badge variant="secondary" className="flex-shrink-0 text-xs">
          {Math.round(confidence * 100)}%
        </Badge>
      )}

      {/* Delete button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
      >
        <Icon name="trash-2" size={12} className="text-destructive" />
      </Button>
    </div>
  );
}
