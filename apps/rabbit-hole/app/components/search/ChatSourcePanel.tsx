"use client";

import { useRef, useState } from "react";

import { Icon } from "@protolabsai/icon-system";

import { CommunityCard } from "./CommunityCard";
import type { CommunitySummary } from "./CommunityCard";
import { EntityCard } from "./EntityCard";
import type { GraphEntity } from "./EntityCard";
import { SourceCard } from "./SourceCard";
import type { ResearchSource } from "./SourceCard";

// ─── Chat Source Panel ───────────────────────────────────────────────

interface ChatSourcePanelProps {
  sources: ResearchSource[];
  entities?: GraphEntity[];
  communities?: CommunitySummary[];
  isStreaming?: boolean;
  highlightedIndex?: number | null;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  /** Suppress desktop panel — render mobile bottom sheet only */
  hideDesktop?: boolean;
}

// ─── Loading skeleton for pending sources ────────────────────────────

function SourceSkeleton({ index }: { index: number }) {
  return (
    <div
      style={{ animationDelay: `${index * 80}ms` }}
      className="rounded-lg border border-border/30 p-3 animate-in fade-in-0 fill-mode-both"
    >
      <div className="flex items-start gap-2">
        <div className="w-5 h-5 rounded bg-muted/50 animate-pulse flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-muted/50 animate-pulse" />
            <div className="h-2.5 w-20 rounded bg-muted/40 animate-pulse" />
          </div>
          <div className="h-3 w-full rounded bg-muted/50 animate-pulse" />
          <div className="h-3 w-3/4 rounded bg-muted/40 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ─── Shared panel content (used by both desktop and mobile) ──────────

function PanelContent({
  sources,
  entities,
  communities,
  isStreaming,
  highlightedIndex,
}: {
  sources: ResearchSource[];
  entities: GraphEntity[];
  communities: CommunitySummary[];
  isStreaming: boolean;
  highlightedIndex?: number | null;
}) {
  return (
    <div className="space-y-2">
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

      {/* Themes section (community summaries) */}
      {communities.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-400/80 px-0.5">
            <Icon name="Layers" className="h-3 w-3" />
            <span>Themes</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400/70 font-normal">
              {communities.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {communities.map((community) => (
              <CommunityCard
                key={community.communityId}
                community={community}
              />
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
          {/* Loading skeleton while streaming and no sources yet */}
          {isStreaming && sources.length === 0 && entities.length === 0 && (
            <div className="space-y-1.5">
              <SourceSkeleton index={0} />
              <SourceSkeleton index={1} />
              <SourceSkeleton index={2} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Collapsible right-side source panel for chat messages (desktop).
 * On mobile (<768px) the panel is hidden; instead it renders as a bottom
 * sheet controlled by the `mobileOpen` / `onMobileClose` props.
 * Sources are numbered to match [N] citation references in the answer text.
 */
export function ChatSourcePanel({
  sources,
  entities = [],
  communities = [],
  isStreaming = false,
  highlightedIndex,
  mobileOpen = false,
  onMobileClose,
  hideDesktop = false,
}: ChatSourcePanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const hadContent = useRef(false);

  const hasContent =
    sources.length > 0 || entities.length > 0 || communities.length > 0;
  if (hasContent) hadContent.current = true;

  // Don't render if we never had content and aren't streaming
  if (!hadContent.current && !isStreaming) return null;

  const totalCount = sources.length + entities.length + communities.length;

  return (
    <>
      {/* ── Desktop: collapsed icon button ─────────────────────────── */}
      {!hideDesktop && collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="hidden md:flex flex-col items-center gap-1 p-2 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-colors flex-shrink-0 animate-in fade-in-0 zoom-in-95 duration-200"
          title={`${totalCount} item${totalCount !== 1 ? "s" : ""}`}
        >
          <Icon name="BookOpen" className="h-4 w-4 text-muted-foreground" />
          <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary/10 text-[9px] font-bold text-primary px-1">
            {totalCount}
          </span>
        </button>
      )}

      {/* ── Desktop: expanded panel ─────────────────────────────────── */}
      {!hideDesktop && !collapsed && (
        <div className="hidden md:block w-52 flex-shrink-0 space-y-2 animate-in fade-in-0 slide-in-from-right-2 duration-200">
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

          <PanelContent
            sources={sources}
            entities={entities}
            communities={communities}
            isStreaming={isStreaming}
            highlightedIndex={highlightedIndex}
          />
        </div>
      )}

      {/* ── Mobile: backdrop ────────────────────────────────────────── */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity duration-300 ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onMobileClose}
      />

      {/* ── Mobile: bottom sheet ────────────────────────────────────── */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${
          mobileOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-background border-t border-border rounded-t-2xl max-h-[70vh] flex flex-col shadow-2xl">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-8 h-1 rounded-full bg-border" />
          </div>

          {/* Sheet header */}
          <div className="flex items-center justify-between px-4 py-2 flex-shrink-0 border-b border-border/50">
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground/70">
              <Icon name="BookOpen" className="h-4 w-4" />
              <span>Sources</span>
              {totalCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-normal">
                  {totalCount}
                </span>
              )}
              {isStreaming && (
                <Icon
                  name="Loader2"
                  className="h-3.5 w-3.5 animate-spin text-primary/60"
                />
              )}
            </div>
            <button
              onClick={onMobileClose}
              className="p-1.5 text-muted-foreground/50 hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
              title="Close"
            >
              <Icon name="X" className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-4 py-3">
            <PanelContent
              sources={sources}
              entities={entities}
              communities={communities}
              isStreaming={isStreaming}
              highlightedIndex={highlightedIndex}
            />
          </div>
        </div>
      </div>
    </>
  );
}
