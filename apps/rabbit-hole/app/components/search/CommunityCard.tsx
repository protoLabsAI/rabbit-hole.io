"use client";

import { Icon } from "@protolabsai/icon-system";

// ─── Types ──────────────────────────────────────────────────────────

export interface CommunitySummary {
  communityId: number;
  summary: string;
  topEntities: string[];
  entityCount: number;
}

// ─── Community Card ───────────────────────────────────────────────────

/**
 * Renders a GraphRAG community summary as a theme card.
 * Shows the summary text, top entities, and entity count.
 */
export function CommunityCard({ community }: { community: CommunitySummary }) {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 space-y-1.5">
      {/* Header: theme label + entity count */}
      <div className="flex items-center gap-1.5">
        <Icon name="Layers" className="h-3 w-3 text-amber-500 flex-shrink-0" />
        <span className="text-[10px] text-amber-400/80 flex-1 min-w-0">
          Theme {community.communityId}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400/70 flex-shrink-0">
          {community.entityCount} entities
        </span>
      </div>

      {/* Summary text */}
      <p className="text-[11px] text-foreground/80 leading-snug line-clamp-3">
        {community.summary}
      </p>

      {/* Top entities */}
      {community.topEntities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {community.topEntities.slice(0, 4).map((entity) => (
            <span
              key={entity}
              className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400/80 leading-none"
            >
              {entity}
            </span>
          ))}
          {community.topEntities.length > 4 && (
            <span className="text-[9px] text-muted-foreground/40 self-center">
              +{community.topEntities.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
