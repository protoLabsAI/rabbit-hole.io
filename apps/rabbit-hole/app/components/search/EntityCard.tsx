"use client";

import Link from "next/link";

import { Icon } from "@proto/icon-system";

// ─── Types ──────────────────────────────────────────────────────────

export interface GraphEntity {
  uid: string;
  name: string;
  type: string;
  tags: string[];
  connectedEntities: Array<{
    name: string;
    type: string;
    relationship: string;
  }>;
}

// ─── Entity Card ─────────────────────────────────────────────────────

/**
 * Renders a Knowledge Graph entity as an interactive card.
 * Clicking navigates to the entity's Atlas view.
 */
export function EntityCard({ entity }: { entity: GraphEntity }) {
  return (
    <Link href={`/atlas?centerEntity=${entity.uid}`} prefetch={false}>
      <div className="group rounded-lg border border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40 hover:bg-purple-500/10 p-2.5 transition-colors cursor-pointer">
        {/* Name + type + link icon */}
        <div className="flex items-start gap-1.5 mb-1.5">
          <Icon
            name="Database"
            className="h-3 w-3 text-purple-500 mt-0.5 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground leading-snug truncate">
              {entity.name}
            </p>
            {entity.type && (
              <p className="text-[10px] text-purple-400/80 capitalize leading-tight">
                {entity.type}
              </p>
            )}
          </div>
          <Icon
            name="ExternalLink"
            className="h-2.5 w-2.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 flex-shrink-0 mt-0.5"
          />
        </div>

        {/* Tags */}
        {entity.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {entity.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400/80 leading-none"
              >
                {tag}
              </span>
            ))}
            {entity.tags.length > 3 && (
              <span className="text-[9px] text-muted-foreground/40 self-center">
                +{entity.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Connected entities */}
        {entity.connectedEntities.length > 0 && (
          <div className="space-y-0.5">
            {entity.connectedEntities.slice(0, 3).map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-1 text-[10px] text-muted-foreground/60"
              >
                <span className="text-muted-foreground/30 flex-shrink-0">
                  —
                </span>
                <span className="truncate">{c.name}</span>
                <span className="text-[9px] text-muted-foreground/30 flex-shrink-0 truncate max-w-[60px]">
                  {c.relationship}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
