"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { Icon } from "@proto/icon-system";

import { ChatMarkdown } from "./ChatMarkdown";

// ─── Types ──────────────────────────────────────────────────────────

interface ResearchEvent {
  type: string;
  data: any;
  timestamp: number;
}

interface ResearchSource {
  title: string;
  url: string;
  type: "web" | "wikipedia" | "graph";
  snippet?: string;
}

const PHASE_LABELS: Record<string, { icon: string; label: string }> = {
  scope: { icon: "FileSearch", label: "Planning" },
  research: { icon: "Search", label: "Researching" },
  synthesis: { icon: "FileText", label: "Writing Report" },
  complete: { icon: "CheckCircle2", label: "Complete" },
};

const PHASES = ["scope", "research", "synthesis", "complete"];

// ─── Activity Entry ─────────────────────────────────────────────────

function ActivityEntry({ event }: { event: ResearchEvent }) {
  const [expanded, setExpanded] = useState(false);

  let icon = "Circle";
  let label = event.type;
  let detail = "";
  let color = "text-muted-foreground";

  switch (event.type) {
    case "phase.started":
      icon = PHASE_LABELS[event.data?.phase]?.icon || "Play";
      label = `Phase: ${PHASE_LABELS[event.data?.phase]?.label || event.data?.phase}`;
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
      color = "text-green-500";
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
      className="flex items-start gap-2 py-1.5 cursor-pointer hover:bg-muted/30 rounded px-2 -mx-2"
      onClick={() => detail && setExpanded(!expanded)}
    >
      <Icon
        name={icon as any}
        className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${color}`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs ${color}`}>{label}</span>
          <span className="text-[10px] text-muted-foreground/40 ml-auto flex-shrink-0">
            {time}
          </span>
        </div>
        {expanded && detail && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{detail}</p>
        )}
      </div>
    </div>
  );
}

// ─── Phase Progress Bar ─────────────────────────────────────────────

function PhaseProgress({ currentPhase }: { currentPhase: string }) {
  const currentIndex = PHASES.indexOf(currentPhase);

  return (
    <div className="flex items-center gap-1">
      {PHASES.map((phase, i) => {
        const config = PHASE_LABELS[phase];
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;

        return (
          <div key={phase} className="flex items-center gap-1">
            {i > 0 && (
              <div
                className={`w-6 h-px ${isDone ? "bg-green-500/50" : "bg-border"}`}
              />
            )}
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : isDone
                    ? "text-green-500"
                    : "text-muted-foreground/40"
              }`}
            >
              <Icon
                name={
                  isDone
                    ? "CheckCircle2"
                    : isActive
                      ? "Loader2"
                      : (config.icon as any)
                }
                className={`h-3 w-3 ${isActive ? "animate-spin" : ""}`}
              />
              {config.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────

interface DeepResearchPanelProps {
  researchId: string;
  query: string;
  onClose: () => void;
  onIngest?: (text: string, query: string) => void;
}

export function DeepResearchPanel({
  researchId,
  query,
  onClose,
  onIngest,
}: DeepResearchPanelProps) {
  const [events, setEvents] = useState<ResearchEvent[]>([]);
  const [phase, setPhase] = useState("scope");
  const [report, setReport] = useState("");
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [status, setStatus] = useState<"running" | "completed" | "failed">(
    "running"
  );
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  // Timer
  useEffect(() => {
    if (status !== "running") return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  // SSE connection
  useEffect(() => {
    const eventSource = new EventSource(`/api/research/deep/${researchId}`);

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as ResearchEvent;

        if (event.type === "state") {
          // Final state update
          const data = event.data as any;
          setStatus(data.status);
          setPhase(data.phase);
          if (data.finalReport) setReport(data.finalReport);
          if (data.sources) setSources(data.sources);
          if (data.error) setError(data.error);
          eventSource.close();
          return;
        }

        if (event.type === "timeout") {
          eventSource.close();
          return;
        }

        setEvents((prev) => [...prev, event]);

        // Update phase from events
        if (event.type === "phase.started" && event.data?.phase) {
          setPhase(event.data.phase);
        }

        if (event.type === "research.completed") {
          setStatus("completed");
          setPhase("complete");
        }

        if (event.type === "research.error") {
          setStatus("failed");
          setError(event.data?.message);
        }

        // Auto-scroll feed
        if (autoScrollRef.current && feedRef.current) {
          feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
      } catch {
        /* skip unparseable */
      }
    };

    eventSource.onerror = () => {
      // EventSource auto-reconnects with Last-Event-ID
    };

    return () => eventSource.close();
  }, [researchId]);

  // Poll for report if SSE missed it
  useEffect(() => {
    if (status !== "completed" || report) return;
    fetch(`/api/research/deep/${researchId}/status`)
      .then((r) => r.json())
      .then((data) => {
        if (data.data?.finalReport) setReport(data.data.finalReport);
        if (data.data?.sources) setSources(data.data.sources);
      })
      .catch(() => {});
  }, [status, report, researchId]);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const handleIngest = useCallback(() => {
    if (onIngest && report) onIngest(report, query);
  }, [onIngest, report, query]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
        >
          <Icon name="ArrowLeft" className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate">
            Deep Research: {query}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-muted-foreground">
              {formatElapsed(elapsed)}
            </span>
            {status === "running" && (
              <span className="text-[11px] text-primary flex items-center gap-1">
                <Icon name="Loader2" className="h-3 w-3 animate-spin" />
                In progress
              </span>
            )}
            {status === "completed" && (
              <span className="text-[11px] text-green-500 flex items-center gap-1">
                <Icon name="CheckCircle2" className="h-3 w-3" />
                Complete
              </span>
            )}
            {status === "failed" && (
              <span className="text-[11px] text-destructive flex items-center gap-1">
                <Icon name="AlertCircle" className="h-3 w-3" />
                Failed
              </span>
            )}
          </div>
        </div>
        <PhaseProgress currentPhase={phase} />
      </header>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Feed (left) */}
        <div className="w-72 border-r border-border flex flex-col">
          <div className="px-3 py-2 border-b border-border/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Activity ({events.length})
          </div>
          <div
            ref={feedRef}
            className="flex-1 overflow-y-auto px-3 py-2"
            onScroll={(e) => {
              const el = e.currentTarget;
              autoScrollRef.current =
                el.scrollHeight - el.scrollTop - el.clientHeight < 50;
            }}
          >
            {events.map((event, i) => (
              <ActivityEntry key={i} event={event} />
            ))}
            {status === "running" && events.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                <Icon
                  name="Loader2"
                  className="h-4 w-4 animate-spin text-primary"
                />
                Starting research...
              </div>
            )}
          </div>
          {/* Sources summary */}
          {sources.length > 0 && (
            <div className="px-3 py-2 border-t border-border/50 text-[10px] text-muted-foreground">
              {sources.filter((s) => s.type === "web").length} web,{" "}
              {sources.filter((s) => s.type === "wikipedia").length} wiki,{" "}
              {sources.filter((s) => s.type === "graph").length} graph
            </div>
          )}
        </div>

        {/* Report (center) */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-3xl mx-auto">
            {report ? (
              <>
                <ChatMarkdown content={report} />
                {status === "completed" && (
                  <div className="mt-6 pt-4 border-t border-border/30 flex items-center gap-2">
                    <button
                      onClick={handleIngest}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted/50 border border-border"
                    >
                      <Icon name="DatabaseZap" className="h-3.5 w-3.5" />
                      Add to Knowledge Graph
                    </button>
                    <button
                      onClick={() => {
                        if (navigator.clipboard?.writeText)
                          navigator.clipboard.writeText(report);
                      }}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted/50 border border-border"
                    >
                      <Icon name="Copy" className="h-3.5 w-3.5" />
                      Copy Report
                    </button>
                  </div>
                )}
              </>
            ) : status === "running" ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Icon
                  name="Loader2"
                  className="h-8 w-8 animate-spin text-primary mb-4"
                />
                <p className="text-sm text-muted-foreground">Researching...</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  The report will appear here as it&apos;s written
                </p>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6">
                <div className="flex items-center gap-2">
                  <Icon
                    name="AlertCircle"
                    className="h-5 w-5 text-destructive"
                  />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
