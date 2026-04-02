"use client";

import { useState } from "react";

import { Icon } from "@proto/icon-system";

import type {
  DeepResearchState,
  ResearchEvent,
} from "../../hooks/useDeepResearch";

import { SourceCard } from "./SourceCard";

// ─── Constants ──────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, { icon: string; label: string }> = {
  scope: { icon: "FileSearch", label: "Planning" },
  "plan-review": { icon: "ListChecks", label: "Plan Review" },
  research: { icon: "Search", label: "Researching" },
  evaluating: { icon: "Brain", label: "Evaluating" },
  synthesis: { icon: "FileText", label: "Writing" },
  complete: { icon: "CheckCircle2", label: "Complete" },
};

// ─── Activity Entry ─────────────────────────────────────────────────

function ActivityEntry({ event }: { event: ResearchEvent }) {
  const [expanded, setExpanded] = useState(false);

  let icon = "Circle";
  let label = event.type;
  let detail = "";
  let color = "text-muted-foreground";
  let isFinding = false;

  switch (event.type) {
    case "phase.started":
      icon = PHASE_LABELS[event.data?.phase]?.icon || "Play";
      label = `${PHASE_LABELS[event.data?.phase]?.label || event.data?.phase}`;
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
            : "Globe";
      label = `Searching ${event.data?.source}`;
      detail = event.data?.query || "";
      break;
    case "search.completed":
      icon = "CheckCircle2";
      label = `Found ${event.data?.resultCount} results`;
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
    case "report.chunk":
      return null;
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
    case "counters.update":
      return null;
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

// ─── Side Panel ─────────────────────────────────────────────────────

interface DeepResearchSidePanelProps {
  research: DeepResearchState;
}

export function DeepResearchSidePanel({
  research,
}: DeepResearchSidePanelProps) {
  const [tab, setTab] = useState<"activity" | "sources">("activity");

  const {
    visibleEvents,
    findings,
    sources,
    status,
    feedRef,
    autoScrollRef,
    webSourceCount,
    wikiSourceCount,
    graphSourceCount,
  } = research;

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Tabs */}
      <div className="px-1 pt-1.5 pb-0 border-b border-border/50 flex items-center gap-0 flex-shrink-0">
        <button
          onClick={() => setTab("activity")}
          className={`px-3 py-1.5 text-[11px] font-medium rounded-t-md transition-colors ${
            tab === "activity"
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
          onClick={() => setTab("sources")}
          className={`px-3 py-1.5 text-[11px] font-medium rounded-t-md transition-colors ${
            tab === "sources"
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
      </div>

      {/* Activity Tab */}
      {tab === "activity" && (
        <div className="flex-1 flex flex-col min-h-0">
          {findings.length > 0 && (
            <div className="px-3 py-2 border-b border-blue-500/10 bg-blue-500/5 flex-shrink-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon name="Lightbulb" className="h-3 w-3 text-blue-500" />
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
            {status === "running" && visibleEvents.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                <Icon
                  name="Loader2"
                  className="h-4 w-4 animate-spin text-primary"
                />
                Starting research...
              </div>
            )}
          </div>

          {sources.length > 0 && (
            <div className="px-3 py-2 border-t border-border/50 flex items-center gap-3 text-[10px] text-muted-foreground flex-shrink-0">
              {webSourceCount > 0 && (
                <span className="flex items-center gap-1">
                  <Icon name="Globe" className="h-3 w-3 text-green-500" />
                  {webSourceCount}
                </span>
              )}
              {wikiSourceCount > 0 && (
                <span className="flex items-center gap-1">
                  <Icon name="BookOpen" className="h-3 w-3 text-blue-500" />
                  {wikiSourceCount}
                </span>
              )}
              {graphSourceCount > 0 && (
                <span className="flex items-center gap-1">
                  <Icon name="Database" className="h-3 w-3 text-purple-500" />
                  {graphSourceCount}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sources Tab */}
      {tab === "sources" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sources.length > 0 ? (
            sources.map((source, i) => (
              <SourceCard key={i} source={source} index={i} />
            ))
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
  );
}
