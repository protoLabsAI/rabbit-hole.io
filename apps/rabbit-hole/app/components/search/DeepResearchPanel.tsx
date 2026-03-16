"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

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

// ─── Constants ──────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, { icon: string; label: string }> = {
  scope: { icon: "FileSearch", label: "Planning" },
  "plan-review": { icon: "ListChecks", label: "Plan Review" },
  research: { icon: "Search", label: "Researching" },
  evaluating: { icon: "Brain", label: "Evaluating" },
  synthesis: { icon: "FileText", label: "Writing" },
  complete: { icon: "CheckCircle2", label: "Complete" },
};

const PHASES = [
  "scope",
  "plan-review",
  "research",
  "evaluating",
  "synthesis",
  "complete",
];

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
      return null; // Don't show in activity feed
    case "report.completed":
      icon = "FileText";
      label = "Report generated";
      color = "text-green-500";
      break;
    case "research.completed":
      icon = "PartyPopper";
      label = "Research complete";
      detail = event.data?.duration
        ? `${Math.round(event.data.duration / 1000)}s • ${event.data?.sourcesCount} sources • ${event.data?.iterations} iteration(s)`
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
      return null; // Handled separately
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

// ─── Phase Progress Bar ─────────────────────────────────────────────

function PhaseProgress({ currentPhase }: { currentPhase: string }) {
  const currentIndex = PHASES.indexOf(currentPhase);

  // Show simplified phases in the header
  const displayPhases = [
    { key: "scope", label: "Plan" },
    { key: "research", label: "Research" },
    { key: "synthesis", label: "Write" },
    { key: "complete", label: "Done" },
  ];

  return (
    <div className="flex items-center gap-1">
      {displayPhases.map((phase, i) => {
        // Map display phase to actual phase index
        const phaseIndex = PHASES.indexOf(phase.key);
        const isActive =
          currentIndex >= phaseIndex &&
          (i === displayPhases.length - 1 ||
            currentIndex < PHASES.indexOf(displayPhases[i + 1].key));
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
                isActive
                  ? "bg-primary/10 text-primary"
                  : isDone
                    ? "text-green-500"
                    : "text-muted-foreground/40"
              }`}
            >
              <Icon
                name={
                  (isDone
                    ? "CheckCircle2"
                    : isActive
                      ? "Loader2"
                      : PHASE_LABELS[phase.key]?.icon || "Circle") as any
                }
                className={`h-3 w-3 ${isActive ? "animate-spin" : ""}`}
              />
              {phase.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Source Card ─────────────────────────────────────────────────────

function SourceCard({
  source,
  index,
}: {
  source: ResearchSource;
  index: number;
}) {
  const domain = source.url.startsWith("#")
    ? "Knowledge Graph"
    : (() => {
        try {
          return new URL(source.url).hostname.replace("www.", "");
        } catch {
          return source.url;
        }
      })();

  const isExternal = !source.url.startsWith("#");
  const typeIcon =
    source.type === "graph"
      ? "Database"
      : source.type === "wikipedia"
        ? "BookOpen"
        : "Globe";
  const typeColor =
    source.type === "graph"
      ? "text-purple-500"
      : source.type === "wikipedia"
        ? "text-blue-500"
        : "text-green-500";

  return (
    <div
      className={`group rounded-lg border border-border/50 p-3 text-xs transition-colors ${
        isExternal
          ? "hover:border-border hover:bg-muted/30 cursor-pointer"
          : "bg-muted/20"
      }`}
      onClick={() =>
        isExternal && window.open(source.url, "_blank", "noopener")
      }
    >
      <div className="flex items-start gap-2">
        <span className="flex items-center justify-center w-5 h-5 rounded bg-primary/10 text-[9px] font-semibold text-primary flex-shrink-0 mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon name={typeIcon as any} className={`h-3 w-3 ${typeColor}`} />
            {isExternal && (
              <img
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                className="w-3.5 h-3.5"
                alt=""
              />
            )}
            <span className="text-[10px] text-muted-foreground truncate">
              {domain}
            </span>
          </div>
          <p className="font-medium text-foreground leading-snug line-clamp-2">
            {source.title}
          </p>
          {source.snippet && (
            <p className="text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {source.snippet.slice(0, 120)}
              {(source.snippet?.length ?? 0) > 120 ? "..." : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Table of Contents ──────────────────────────────────────────────

function ReportToc({
  report,
  onScrollTo,
}: {
  report: string;
  onScrollTo: (heading: string) => void;
}) {
  const headings = useMemo(() => {
    const matches = report.match(/^##\s+(.+)$/gm);
    return (
      matches?.map((m) => m.replace(/^##\s+/, "").replace(/\*\*/g, "")) ?? []
    );
  }, [report]);

  if (headings.length < 2) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-1 py-2 mb-4 border-b border-border/30">
      {headings.map((heading) => (
        <button
          key={heading}
          onClick={() => onScrollTo(heading)}
          className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/50 transition-colors"
        >
          {heading}
        </button>
      ))}
    </div>
  );
}

// ─── Research Plan Card ─────────────────────────────────────────────

function ResearchPlanCard({
  dimensions,
  brief,
}: {
  dimensions: string[];
  brief: string;
}) {
  if (!dimensions.length) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="Map" className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Research Plan</h3>
      </div>
      {brief && (
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
          {brief}
        </p>
      )}
      <div className="grid gap-2">
        {dimensions.map((dim, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-[10px] font-semibold text-primary flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="text-sm text-foreground">{dim}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────

interface DeepResearchPanelProps {
  researchId: string;
  query: string;
  onClose?: () => void;
  onIngest?: (text: string, query: string) => void;
  /** Render embedded in page layout instead of fixed overlay */
  embedded?: boolean;
}

export function DeepResearchPanel({
  researchId,
  query,
  onClose,
  onIngest,
  embedded = false,
}: DeepResearchPanelProps) {
  const [events, setEvents] = useState<ResearchEvent[]>([]);
  const [phase, setPhase] = useState("scope");
  const [report, setReport] = useState("");
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [findings, setFindings] = useState<string[]>([]);
  const [dimensions, setDimensions] = useState<string[]>([]);
  const [brief, setBrief] = useState("");
  const [searchCount, setSearchCount] = useState(0);
  const [status, setStatus] = useState<
    "running" | "completed" | "failed" | "cancelled"
  >("running");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [sourcePanelOpen, setSourcePanelOpen] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
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
          if (data.findings) setFindings(data.findings);
          if (data.dimensions) setDimensions(data.dimensions);
          if (data.brief) setBrief(data.brief);
          if (data.searchCount) setSearchCount(data.searchCount);
          if (data.error) setError(data.error);
          eventSource.close();
          return;
        }

        if (event.type === "timeout") {
          eventSource.close();
          return;
        }

        // Skip counter events from the activity feed
        if (event.type !== "counters.update" && event.type !== "report.chunk") {
          setEvents((prev) => [...prev, event]);
        }

        // Handle streaming report chunks
        if (event.type === "report.chunk") {
          setReport((prev) => prev + (event.data?.text ?? ""));
        }

        // Handle counter updates
        if (event.type === "counters.update") {
          setSearchCount(event.data?.searches ?? 0);
        }

        // Update from events
        if (event.type === "phase.started" && event.data?.phase) {
          setPhase(event.data.phase);
        }

        if (event.type === "scope.completed") {
          if (event.data?.dimensions) setDimensions(event.data.dimensions);
          if (event.data?.brief) setBrief(event.data.brief);
        }

        if (event.type === "research.finding") {
          setFindings((prev) => [...prev, event.data?.text ?? ""]);
        }

        if (event.type === "research.completed") {
          setStatus("completed");
          setPhase("complete");
        }

        if (event.type === "research.cancelled") {
          setStatus("cancelled");
        }

        if (event.type === "research.error") {
          setStatus("failed");
          setError(event.data?.message);
        }

        // Auto-scroll feed
        if (autoScrollRef.current && feedRef.current) {
          requestAnimationFrame(() => {
            feedRef.current?.scrollTo({
              top: feedRef.current.scrollHeight,
              behavior: "smooth",
            });
          });
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

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      await fetch(`/api/research/deep/${researchId}`, { method: "DELETE" });
    } catch {
      /* best effort */
    }
  }, [researchId]);

  const handleIngest = useCallback(() => {
    if (onIngest && report) onIngest(report, query);
  }, [onIngest, report, query]);

  const handleCopyReport = useCallback(() => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(report);
    }
  }, [report]);

  const handleDownloadMd = useCallback(() => {
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${query.slice(0, 40).replace(/[^a-zA-Z0-9]/g, "-")}-research.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report, query]);

  const handleScrollToHeading = useCallback((heading: string) => {
    if (!reportRef.current) return;
    // Find the heading element by text content
    const headings = reportRef.current.querySelectorAll("h2");
    for (const el of headings) {
      if (el.textContent?.includes(heading)) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
  }, []);

  // Visible activity events (filter out nulls from ActivityEntry)
  const visibleEvents = events.filter(
    (e) => e.type !== "counters.update" && e.type !== "report.chunk"
  );

  const webSourceCount = sources.filter((s) => s.type === "web").length;
  const wikiSourceCount = sources.filter((s) => s.type === "wikipedia").length;
  const graphSourceCount = sources.filter((s) => s.type === "graph").length;

  return (
    <div
      className={
        embedded
          ? "flex flex-col flex-1 min-h-0"
          : "fixed inset-0 z-50 bg-background flex flex-col"
      }
    >
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
          >
            <Icon name="ArrowLeft" className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate">
            Deep Research: {query}
          </h1>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-muted-foreground tabular-nums">
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
            {status === "cancelled" && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Icon name="XCircle" className="h-3 w-3" />
                Cancelled
              </span>
            )}
            {status === "failed" && (
              <span className="text-[11px] text-destructive flex items-center gap-1">
                <Icon name="AlertCircle" className="h-3 w-3" />
                Failed
              </span>
            )}
            {/* Running counters */}
            {(searchCount > 0 || sources.length > 0) && (
              <span className="text-[10px] text-muted-foreground/60">
                {searchCount} searches &middot; {sources.length} sources
              </span>
            )}
          </div>
        </div>

        <PhaseProgress currentPhase={phase} />

        {/* Actions */}
        <div className="flex items-center gap-1">
          {status === "running" && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors px-2.5 py-1.5 rounded-md hover:bg-destructive/5 border border-border"
            >
              <Icon name="Square" className="h-3 w-3" />
              {cancelling ? "Stopping..." : "Stop"}
            </button>
          )}
          <button
            onClick={() => setSourcePanelOpen(!sourcePanelOpen)}
            className={`p-1.5 transition-colors rounded-lg hover:bg-muted/50 ${
              sourcePanelOpen
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Toggle sources panel"
          >
            <Icon name="PanelRight" className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Activity Feed (left) */}
        <div className="w-60 border-r border-border flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Activity
            </span>
            <span className="text-[10px] text-muted-foreground/50">
              {visibleEvents.length}
            </span>
          </div>

          {/* Key Findings summary */}
          {findings.length > 0 && (
            <div className="px-3 py-2 border-b border-blue-500/10 bg-blue-500/5">
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

          {/* Source type summary */}
          {sources.length > 0 && (
            <div className="px-3 py-2 border-t border-border/50 flex items-center gap-3 text-[10px] text-muted-foreground">
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

        {/* Report (center) */}
        <div ref={reportRef} className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-3xl mx-auto">
            {/* Research Plan Card */}
            {dimensions.length > 0 && !report && (
              <ResearchPlanCard dimensions={dimensions} brief={brief} />
            )}

            {/* Table of Contents */}
            {report && report.includes("## ") && (
              <ReportToc report={report} onScrollTo={handleScrollToHeading} />
            )}

            {report ? (
              <>
                <ChatMarkdown
                  content={report}
                  isStreaming={status === "running"}
                  sources={sources}
                />

                {/* Action buttons */}
                {status === "completed" && (
                  <div className="mt-6 pt-4 border-t border-border/30 flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleIngest}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted/50 border border-border"
                    >
                      <Icon name="DatabaseZap" className="h-3.5 w-3.5" />
                      Add to Knowledge Graph
                    </button>
                    <button
                      onClick={handleCopyReport}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted/50 border border-border"
                    >
                      <Icon name="Copy" className="h-3.5 w-3.5" />
                      Copy Report
                    </button>
                    <button
                      onClick={handleDownloadMd}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted/50 border border-border"
                    >
                      <Icon name="Download" className="h-3.5 w-3.5" />
                      Download Markdown
                    </button>
                  </div>
                )}

                {/* Cancelled with partial report */}
                {status === "cancelled" && (
                  <div className="mt-6 pt-4 border-t border-border/30">
                    <div className="rounded-lg border border-muted bg-muted/20 p-4 flex items-center gap-3">
                      <Icon
                        name="XCircle"
                        className="h-5 w-5 text-muted-foreground"
                      />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Research was cancelled. Partial report shown above.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={handleCopyReport}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted/50 border border-border"
                      >
                        <Icon name="Copy" className="h-3.5 w-3.5" />
                        Copy Partial Report
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : status === "running" ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Icon
                  name="Loader2"
                  className="h-8 w-8 animate-spin text-primary mb-4"
                />
                <p className="text-sm text-muted-foreground">
                  {phase === "synthesis"
                    ? "Writing report..."
                    : "Researching..."}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {phase === "synthesis"
                    ? "The report will stream here as it's written"
                    : "The report will appear once research is complete"}
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
            ) : status === "cancelled" ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Icon
                  name="XCircle"
                  className="h-8 w-8 text-muted-foreground mb-4"
                />
                <p className="text-sm text-muted-foreground">
                  Research was cancelled before generating a report.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Sources Panel (right) */}
        {sourcePanelOpen && sources.length > 0 && (
          <div className="w-72 border-l border-border flex flex-col min-h-0">
            <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Sources ({sources.length})
              </span>
              <button
                onClick={() => setSourcePanelOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
              >
                <Icon name="X" className="h-3 w-3" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {sources.map((source, i) => (
                <SourceCard key={i} source={source} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
