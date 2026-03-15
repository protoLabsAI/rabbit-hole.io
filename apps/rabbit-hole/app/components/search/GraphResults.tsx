"use client";

import { useState } from "react";

import { Icon } from "@proto/icon-system";
import { Badge } from "@proto/ui/atoms";

import type { GraphEntity } from "../../hooks/useSearch";

interface GraphResultsProps {
  entities: GraphEntity[];
  onEntityClick?: (uid: string) => void;
}

const TYPE_ICONS: Record<string, string> = {
  Person: "User",
  Organization: "Building2",
  Technology: "Cpu",
  Software: "Code2",
  Publication: "BookOpen",
  Event: "Calendar",
  Concept: "Lightbulb",
  Methodology: "GitBranch",
  Metric: "BarChart3",
  Practice: "CheckSquare",
  Tool: "Wrench",
  Report: "FileText",
  Book: "BookOpen",
  Media: "Tv",
};

function EntityCard({
  entity,
  onClick,
}: {
  entity: GraphEntity;
  onClick?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const iconName = TYPE_ICONS[entity.type] || "Circle";
  const hasConnections =
    entity.connectedEntities && entity.connectedEntities.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card/60 hover:bg-card/80 transition-all">
      <button
        onClick={() => (hasConnections ? setExpanded(!expanded) : onClick?.())}
        className="w-full text-left p-3 flex items-start gap-3"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
          <Icon name={iconName as any} className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {entity.name}
            </span>
            <Badge
              variant="secondary"
              className="text-[10px] font-normal shrink-0"
            >
              {entity.type}
            </Badge>
          </div>
          {entity.aliases && entity.aliases.length > 0 && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              aka {entity.aliases.slice(0, 2).join(", ")}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            {entity.relationshipCount != null &&
              entity.relationshipCount > 0 && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Icon name="GitFork" className="h-3 w-3" />
                  {entity.relationshipCount} connections
                </span>
              )}
            {entity.tags && entity.tags.length > 0 && (
              <div className="flex gap-1">
                {entity.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {hasConnections && (
          <Icon
            name={expanded ? "ChevronUp" : "ChevronDown"}
            className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1"
          />
        )}
      </button>

      {expanded && hasConnections && (
        <div className="px-3 pb-3 border-t border-border/50">
          <div className="pt-2 space-y-1">
            {entity.connectedEntities!.map((conn, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[11px] text-muted-foreground"
              >
                <span className="text-primary/60 font-mono uppercase text-[9px]">
                  {conn.relationship}
                </span>
                <Icon name="ArrowRight" className="h-2.5 w-2.5" />
                <span className="text-foreground/80">{conn.name}</span>
                <span className="text-muted-foreground/60">({conn.type})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function GraphResults({ entities, onEntityClick }: GraphResultsProps) {
  if (entities.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Icon name="Database" className="h-3.5 w-3.5" />
        Knowledge Graph — {entities.length} entities
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {entities.map((entity) => (
          <EntityCard
            key={entity.uid}
            entity={entity}
            onClick={() => onEntityClick?.(entity.uid)}
          />
        ))}
      </div>
    </div>
  );
}
