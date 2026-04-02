"use client";

import { useState, useRef } from "react";

import { Icon } from "@proto/icon-system";

import { CommunityCard } from "./CommunityCard";
import type { CommunitySummary } from "./CommunityCard";
import { EntityCard } from "./EntityCard";
import type { GraphEntity } from "./EntityCard";
import { SourceCard } from "./SourceCard";
import type { ResearchSource } from "./SourceCard";
import type { ActivityEvent, ResearchLayoutProps } from "./types";

// ─── Phase constants ─────────────────────────────────────────────────

const PHASE_LABELS: Record<string, { icon: string; label: string }> = {
  scope: { icon: "FileSearch", label: "Planning" },
  "plan-review": { icon: "ListChecks", label: "Plan Review" },
  research: { icon: "Search", label: "Researching" },
  evaluating: { icon: "Brain", label: "Evaluating" },
  synthesis: { icon: "FileText", label: "Writing" },
  complete: { icon: "CheckCircle2", label: "Complete" },
};

const ALL_PHASES = [
  "scope",
  "plan-review",
  "research",
  "evaluating",
  "synthesis",
  "complete",
];

// ─── Activity Entry ──────────────────────────────────────────────────

function ActivityEntry({ event }: { event: ActivityEvent }) {
  const [expanded, setExpanded] = useState(false);

  let icon = "Circle";
  let label = event.type;
  let detail = "";
  let color = "text-muted-foreground";
  let isFinding = false;

  switch (event.type) {
    case "phase.started":
      icon = PHASE_LABELS[event.data?.phase]?.icon || "Play";
      label = PHASE_LABELS[event.data?.phase]?.label || event.data?.phase;
      color = "text-primary";
      break;
    case "phase.completed":
      icon = "CheckCircle2";
      label = `${PHASE_LABELS[event.data?.phase]?.label || event.data?.phase} complete`;
      color = "text-green-500";
      break;
    case "search.started":
      icon =
        event.data?.source === "graph"
          ? "Database"
          : event.data?.source === "wikipedia"
            ? "BookOpen"
            : event.data?.source === "communities"
              ? "Layers"
              : "Globe";
      label = `Searching ${event.data?.source}`;
      detail = event.data?.query || "";
      break;
    case "search.completed":
      icon = "CheckCircle2";
      label = `Found ${event.data?.resultCount} result${event.data?.resultCount !== 1 ? "s" : ""}`;
      detail = event.data?.query || "";
      color = "text-green-500/70";
      break;
    case "research.dimension":
      icon = "Compass";
      label = `Dimension ${(event.data?.index ?? 0) + 1}/${event.data?.total}`;
      detail = event.data?.dimension || "";
      color = "text-primary";
      break;
    case "research.compressing":
      icon = "Minimize2";
      label = "Compressing findings";
      detail = event.data?.dimension || "";
      break;
    case "research.compressed":
      icon = "FileCheck";
      label = "Notes saved";
      detail = event.data?.dimension || "";
      color = "text-green-500/70";
      break;
    case "research.finding":
      icon = "Lightbulb";
      label = event.data?.text || "Key finding";
      color = "text-blue-500";
      isFinding = true;
      break;
    case "research.evaluation":
      icon = event.data?.complete ? "CheckCircle2" : "RefreshCw";
      label = event.data?.complete
        ? "Coverage sufficient"
        : `${event.data?.gaps?.length} gaps found — researching deeper`;
      color = event.data?.complete ? "text-green-500" : "text-blue-500";
      break;
    case "scope.completed":
      icon = "ListChecks";
      label = `${event.data?.dimensions?.length || 0} research dimensions`;
      detail = event.data?.dimensions?.join(", ") || "";
      break;
    case "report.completed":
      icon = "FileText";
      label = "Report generated";
      color = "text-green-500";
      break;
    case "research.completed":
      icon = "PartyPopper";
      label = "Research complete";
      detail = event.data?.duration
        ? `${Math.round(event.data.duration / 1000)}s · ${event.data?.sourcesCount} sources · ${event.data?.iterations} iteration(s)`
        : "";
      color = "text-green-500";
      break;
    case "research.cancelled":
      icon = "XCircle";
      label = "Cancelled";
      color = "text-muted-foreground";
      break;
    case "research.error":
      icon = "AlertCircle";
      label = "Error";
      detail = event.data?.message || "";
      color = "text-destructive";
      break;
  }

  const time = new Date(event.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div
      className={`flex items-start gap-2 py-1.5 rounded px-2 -mx-2 ${
        isFinding
          ? "bg-blue-500/5 border border-blue-500/10 my-1"
          : "cursor-pointer hover:bg-muted/30"
      }`}
      onClick={() => detail && !isFinding && setExpanded(!expanded)}
    >
      <Icon
        name={icon as any}
        className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${color}`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs ${color} ${isFinding ? "font-medium" : ""}`}
          >
            {label}
          </span>
          <span className="text-[10px] text-muted-foreground/40 ml-auto flex-shrink-0">
            {time}
          </span>
        </div>
        {(expanded || isFinding) && detail && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Step Indicator (phase progress) ────────────────────────────────

export function StepIndicator({ currentPhase }: { currentPhase: string }) {
  const currentIndex = ALL_PHASES.indexOf(currentPhase);
  const displayPhases = [
    { key: "scope", label: "Plan" },
    { key: "research", label: "Research" },
    { key: "synthesis", label: "Write" },
    { key: "complete", label: "Done" },
  ];

  return (
    <div className="flex items-center gap-1">
      {displayPhases.map((phase, i) => {
        const phaseIndex = ALL_PHASES.indexOf(phase.key);
        const isActive =
          currentIndex >= phaseIndex &&
          (i === displayPhases.length - 1 ||
            currentIndex < ALL_PHASES.indexOf(displayPhases[i + 1].key));
        const isDone = currentIndex > phaseIndex && !isActive;

        return (
          <div key={phase.key} className="flex items-center gap-1">
            {i > 0 && (
              <div
                className={`w-6 h-px ${isDone || isActive ? "bg-primary/40" : "bg-border"}`}
              />
            )}
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                isActive && phase.key === "complete"
                  ? "text-green-500"
                  : isActive
                    ? "bg-primary/10 text-primary"
                    : isDone
                      ? "text-green-500"
                      : "text-muted-foreground/40"
              }`}
            >
              <Icon
                name={
                  (isDone || (isActive && phase.key === "complete")
                    ? "CheckCircle2"
                    : isActive
                      ? "Loader2"
                      : PHASE_LABELS[phase.key]?.icon || "Circle") as any
                }
                className={`h-3 w-3 ${isActive && phase.key !== "complete" ? "animate-spin" : ""}`}
              />
              {phase.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Source panel content ────────────────────────────────────────────

function PanelSourceContent({
  sources,
  entities,
  communities,
  isStreaming,
  highlightedSourceIndex,
}: {
  sources: ResearchSource[];
  entities: GraphEntity[];
  communities: CommunitySummary[];
  isStreaming: boolean;
  highlightedSourceIndex?: number | null;
}) {
  const hasAnyContent =
    sources.length > 0 || entities.length > 0 || communities.length > 0;

  return (
    <div className="space-y-2">
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

      {(sources.length > 0 || (isStreaming && !hasAnyContent)) && (
        <div className="space-y-1.5">
          {sources.length > 0 &&
            (entities.length > 0 || communities.length > 0) && (
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
              isHighlighted={highlightedSourceIndex === i + 1}
            />
          ))}
          {isStreaming && !hasAnyContent && (
            <div className="space-y-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{ animationDelay: `${i * 80}ms` }}
                  className="rounded-lg border border-border/30 p-3 animate-in fade-in-0 fill-mode-both"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded bg-muted/50 animate-pulse flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="h-2.5 w-20 rounded bg-muted/40 animate-pulse" />
                      <div className="h-3 w-full rounded bg-muted/50 animate-pulse" />
                      <div className="h-3 w-3/4 rounded bg-muted/40 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Research Layout ─────────────────────────────────────────────────

export function ResearchLayout({
  mode,
  children,
  activityEvents = [],
  sources = [],
  entities = [],
  communities = [],
  findings = [],
  isStreaming = false,
  currentPhase,
  highlightedSourceIndex,
  drawerOpen: drawerOpenProp,
  onDrawerToggle,
  reportRef,
  mobileOpen = false,
  onMobileClose,
}: ResearchLayoutProps) {
  const [internalDrawerOpen, setInternalDrawerOpen] = useState(true);
  const [drawerTab, setDrawerTab] = useState<"activity" | "sources">(
    "activity"
  );
  const feedRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const isDrawerOpen =
    drawerOpenProp !== undefined ? drawerOpenProp : internalDrawerOpen;

  const toggleDrawer = () => {
    if (onDrawerToggle) {
      onDrawerToggle();
    } else {
      setInternalDrawerOpen((v) => !v);
    }
  };

  const totalCount = sources.length + entities.length + communities.length;
  const webSourceCount = sources.filter((s) => s.type === "web").length;
  const wikiSourceCount = sources.filter((s) => s.type === "wikipedia").length;
  const graphSourceCount = sources.filter((s) => s.type === "graph").length;

  const visibleEvents = activityEvents.filter(
    (e) => e.type !== "counters.update" && e.type !== "report.chunk"
  );

  // ── Deep research mode: full-height flex panel, max-w-3xl px-8 centered ──

  if (mode === "deep-research") {
    return (
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Main content: centered report area with max-w-3xl mx-auto px-8 */}
        <div
          ref={reportRef}
          className="flex-1 overflow-y-auto px-8 py-6 w-full"
        >
          <div className="max-w-3xl mx-auto">{children}</div>
        </div>

        {/* Right drawer (Activity + Sources tabs) */}
        {isDrawerOpen && (
          <div className="hidden md:flex w-80 border-l border-border flex-col min-h-0">
            {/* Tabs row */}
            <div className="px-1 pt-1.5 pb-0 border-b border-border/50 flex items-center gap-0 flex-shrink-0">
              <button
                onClick={() => setDrawerTab("activity")}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-t-md transition-colors ${
                  drawerTab === "activity"
                    ? "text-foreground bg-muted/50 border border-border/50 border-b-transparent -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Activity
                {visibleEvents.length > 0 && (
                  <span className="ml-1.5 text-[10px] text-muted-foreground/60">
                    {visibleEvents.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setDrawerTab("sources")}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-t-md transition-colors ${
                  drawerTab === "sources"
                    ? "text-foreground bg-muted/50 border border-border/50 border-b-transparent -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sources
                {sources.length > 0 && (
                  <span className="ml-1.5 text-[10px] text-muted-foreground/60">
                    {sources.length}
                  </span>
                )}
              </button>
              <div className="flex-1" />
              <button
                onClick={toggleDrawer}
                className="p-1 mr-1 text-muted-foreground hover:text-foreground transition-colors rounded"
              >
                <Icon name="X" className="h-3 w-3" />
              </button>
            </div>

            {/* Activity tab */}
            {drawerTab === "activity" && (
              <div className="flex-1 flex flex-col min-h-0">
                {findings.length > 0 && (
                  <div className="px-3 py-2 border-b border-blue-500/10 bg-blue-500/5 flex-shrink-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon
                        name="Lightbulb"
                        className="h-3 w-3 text-blue-500"
                      />
                      <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                        Key Findings ({findings.length})
                      </span>
                    </div>
                    <div className="space-y-1">
                      {findings.slice(-3).map((f, i) => (
                        <p
                          key={i}
                          className="text-[10px] text-muted-foreground leading-relaxed"
                        >
                          {f}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                <div
                  ref={feedRef}
                  className="flex-1 overflow-y-auto px-3 py-2"
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    autoScrollRef.current =
                      el.scrollHeight - el.scrollTop - el.clientHeight < 50;
                  }}
                >
                  {visibleEvents.map((event, i) => (
                    <ActivityEntry key={i} event={event} />
                  ))}
                  {isStreaming && visibleEvents.length === 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                      <Icon
                        name="Loader2"
                        className="h-4 w-4 animate-spin text-primary"
                      />
                      Starting research...
                    </div>
                  )}
                </div>
                {(webSourceCount > 0 ||
                  wikiSourceCount > 0 ||
                  graphSourceCount > 0) && (
                  <div className="px-3 py-2 border-t border-border/50 flex items-center gap-3 text-[10px] text-muted-foreground flex-shrink-0">
                    {webSourceCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Icon
                          name="Globe"
                          className="h-3 w-3 text-green-500"
                        />
                        {webSourceCount}
                      </span>
                    )}
                    {wikiSourceCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Icon
                          name="BookOpen"
                          className="h-3 w-3 text-blue-500"
                        />
                        {wikiSourceCount}
                      </span>
                    )}
                    {graphSourceCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Icon
                          name="Database"
                          className="h-3 w-3 text-purple-500"
                        />
                        {graphSourceCount}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sources tab */}
            {drawerTab === "sources" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {sources.length > 0 ||
                entities.length > 0 ||
                communities.length > 0 ||
                isStreaming ? (
                  <PanelSourceContent
                    sources={sources}
                    entities={entities}
                    communities={communities}
                    isStreaming={isStreaming}
                    highlightedSourceIndex={highlightedSourceIndex}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Icon
                      name="FileSearch"
                      className="h-6 w-6 text-muted-foreground/30 mb-2"
                    />
                    <p className="text-xs text-muted-foreground/50">
                      Sources will appear as research progresses
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Closed drawer: slim toggle strip */}
        {!isDrawerOpen && (
          <button
            onClick={toggleDrawer}
            className="hidden md:flex flex-col items-center justify-center gap-1.5 p-2 border-l border-border hover:bg-muted/30 transition-colors"
            title="Open drawer"
          >
            <Icon name="PanelRight" className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    );
  }

  // ── Chat mode: flex/grid layout with collapsible right panel, w-full ──────

  const hasDrawerContent =
    sources.length > 0 ||
    entities.length > 0 ||
    communities.length > 0 ||
    isStreaming ||
    visibleEvents.length > 0;

  if (!hasDrawerContent) {
    return <div className="flex-1 min-w-0 space-y-3 pb-2">{children}</div>;
  }

  return (
    <>
      {/* Desktop: flex row with right drawer — uses flex md:grid w-full for responsive */}
      <div className="hidden md:flex md:grid md:grid-cols-[1fr_auto] w-full gap-4">
        {/* Main content area */}
        <div className="min-w-0 space-y-3 pb-2">
          {currentPhase && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
              <StepIndicator currentPhase={currentPhase} />
            </div>
          )}
          {children}
        </div>

        {/* Right panel (collapsible) */}
        {isDrawerOpen ? (
          <div className="w-52 flex-shrink-0 space-y-2 animate-in fade-in-0 slide-in-from-right-2 duration-200">
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
                onClick={toggleDrawer}
                className="p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors rounded"
                title="Collapse"
              >
                <Icon name="ChevronRight" className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Activity events (last few) */}
            {visibleEvents.length > 0 && (
              <div className="border-b border-border/30 pb-2 mb-1">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-foreground/50 px-0.5 mb-1">
                  <Icon name="Zap" className="h-3 w-3" />
                  <span>Activity</span>
                  <span className="text-muted-foreground/40">
                    {visibleEvents.length}
                  </span>
                </div>
                {visibleEvents.slice(-5).map((event, i) => (
                  <ActivityEntry key={i} event={event} />
                ))}
              </div>
            )}

            <PanelSourceContent
              sources={sources}
              entities={entities}
              communities={communities}
              isStreaming={isStreaming}
              highlightedSourceIndex={highlightedSourceIndex}
            />
          </div>
        ) : (
          <button
            onClick={toggleDrawer}
            className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-colors flex-shrink-0 animate-in fade-in-0 zoom-in-95 duration-200"
            title={`${totalCount} item${totalCount !== 1 ? "s" : ""}`}
          >
            <Icon name="BookOpen" className="h-4 w-4 text-muted-foreground" />
            {totalCount > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary/10 text-[9px] font-bold text-primary px-1">
                {totalCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Mobile: content only (bottom sheet triggered externally) */}
      <div className="md:hidden w-full space-y-3 pb-2">{children}</div>

      {/* Mobile: backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity duration-300 ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onMobileClose}
      />

      {/* Mobile: bottom sheet */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${
          mobileOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-background border-t border-border rounded-t-2xl max-h-[70vh] flex flex-col shadow-2xl">
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-8 h-1 rounded-full bg-border" />
          </div>
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
            >
              <Icon name="X" className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 px-4 py-3">
            <PanelSourceContent
              sources={sources}
              entities={entities}
              communities={communities}
              isStreaming={isStreaming}
              highlightedSourceIndex={highlightedSourceIndex}
            />
          </div>
        </div>
      </div>
    </>
  );
}
