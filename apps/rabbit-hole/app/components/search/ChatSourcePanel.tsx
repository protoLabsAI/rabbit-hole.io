"use client";

import { useState } from "react";

import { Icon } from "@proto/icon-system";

import { EntityCard } from "./EntityCard";
import type { GraphEntity } from "./EntityCard";
import { SourceCard } from "./SourceCard";
import type { ResearchSource } from "./SourceCard";

// ─── Chat Source Panel ───────────────────────────────────────────────

interface ChatSourcePanelProps {
  sources: ResearchSource[];
  entities?: GraphEntity[];
  isStreaming?: boolean;
  highlightedIndex?: number | null;
}

/**
 * Collapsible right-side source panel for chat messages.
 * Populates from tool invocation results as they stream in.
 * Sources are numbered to match [N] citation references in the answer text.
 */
export function ChatSourcePanel({
  sources,
  entities = [],
  isStreaming = false,
  highlightedIndex,
}: ChatSourcePanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (sources.length === 0 && entities.length === 0 && !isStreaming) return null;

  const totalCount = sources.length + entities.length;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-colors flex-shrink-0"
        title={`${totalCount} item${totalCount !== 1 ? "s" : ""}`}
      >
        <Icon name="BookOpen" className="h-4 w-4 text-muted-foreground" />
        <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary/10 text-[9px] font-bold text-primary px-1">
          {totalCount}
        </span>
      </button>
    );
  }

  return (
    <div className="w-52 flex-shrink-0 space-y-2 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/70">
          <Icon name="BookOpen" className="h-3.5 w-3.5" />
          <span>Sources</span>
          {totalCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-normal">
              {totalCount}
            </span>
          )}
          {isStreaming && (
            <Icon
              name="Loader2"
              className="h-3 w-3 animate-spin text-primary/60"
            />
          )}
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors rounded"
          title="Collapse sources"
        >
          <Icon name="ChevronRight" className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Knowledge Graph section */}
      {entities.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-purple-400/80 px-0.5">
            <Icon name="Database" className="h-3 w-3" />
            <span>Knowledge Graph</span>
            <span className="px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400/70 font-normal">
              {entities.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {entities.map((entity) => (
              <EntityCard key={entity.uid} entity={entity} />
            ))}
          </div>
        </div>
      )}

      {/* Source list */}
      {(sources.length > 0 || (isStreaming && entities.length === 0)) && (
        <div className="space-y-1.5">
          {sources.length > 0 && entities.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-foreground/50 px-0.5">
              <Icon name="Globe" className="h-3 w-3" />
              <span>Web Sources</span>
            </div>
          )}
          {sources.map((source, i) => (
            <SourceCard
              key={`${source.url}-${i}`}
              source={source}
              index={i}
              isHighlighted={highlightedIndex === i + 1}
            />
          ))}
          {isStreaming && sources.length === 0 && entities.length === 0 && (
            <div className="text-xs text-muted-foreground/60 py-2 text-center">
              Gathering sources...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
