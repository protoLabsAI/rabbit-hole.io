"use client";

import { Badge } from "@proto/ui/atoms";

import type { GraphEntity } from "../../hooks/useSearch";

interface GraphResultsProps {
  entities: GraphEntity[];
  onEntityClick?: (uid: string) => void;
}

export function GraphResults({ entities, onEntityClick }: GraphResultsProps) {
  if (entities.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Knowledge Graph
      </h3>
      <div className="flex flex-wrap gap-2">
        {entities.map((entity) => (
          <button
            key={entity.uid}
            onClick={() => onEntityClick?.(entity.uid)}
            className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
          >
            <span className="text-sm font-medium text-foreground">
              {entity.name}
            </span>
            <Badge variant="secondary" className="text-[10px] font-normal">
              {entity.type}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
