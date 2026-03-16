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

type ResearchStatus = "running" | "completed" | "failed" | "cancelled";

// ─── Inline Deep Research ───────────────────────────────────────────

interface DeepResearchInlineProps {
  researchId: string;
  query: string;
  mode: "deep-research" | "due-diligence";
  onIngest?: (text: string, query: string) => void;
  onCancel?: () => void;
}

export function DeepResearchInline({
  researchId,
  query,
  mode,
  onIngest,
}: DeepResearchInlineProps) {
  const [events, setEvents] = useState<ResearchEvent[]>([]);
  const [phase, setPhase] = useState("scope");
  const [report, setReport] = useState("");
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [findings, setFindings] = useState<string[]>([]);
  const [dimensions, setDimensions] = useState<string[]>([]);
  const [brief, setBrief] = useState("");
  const [searchCount, setSearchCount] = useState(0);
  const [status, setStatus] = useState<ResearchStatus>("running");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [activityOpen, setActivityOpen] = useState(true);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const modeLabel =
    mode === "due-diligence" ? "Due Diligence" : "Deep Research";
  const modeColor =
    mode === "due-diligence"
      ? "text-blue-600 dark:text-blue-400"
      : "text-purple-600 dark:text-purple-400";
  const modeBg =
    mode === "due-diligence" ? "bg-blue-500/10" : "bg-purple-500/10";

  // Timer
  useEffect(() => {
    if (status !== "running") return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Collapse activity once report starts streaming
  useEffect(() => {
    if (report.length > 100) setActivityOpen(false);
  }, [report]);

  // SSE connection
  useEffect(() => {
    const eventSource = new EventSource(`/api/research/deep/${researchId}`);

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as ResearchEvent;

        if (event.type === "state") {
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

        if (event.type === "report.chunk") {
          setReport((prev) => prev + (event.data?.text ?? ""));
        } else if (event.type === "counters.update") {
          setSearchCount(event.data?.searches ?? 0);
        } else {
          setEvents((prev) => [...prev, event]);
        }

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
        if (event.type === "research.cancelled") setStatus("cancelled");
        if (event.type === "research.error") {
          setStatus("failed");
          setError(event.data?.message);
        }
      } catch {
        /* skip */
      }
    };

    return () => eventSource.close();
  }, [researchId]);

  // Poll fallback
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
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(report);
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

  const visibleEvents = events.filter(
    (e) => e.type !== "counters.update" && e.type !== "report.chunk"
  );

  // ─── Phase pills ──────────────────────────────────────────────────

  const phaseSteps = [
    { key: "scope", label: "Plan" },
    { key: "research", label: "Research" },
    { key: "synthesis", label: "Write" },
    { key: "complete", label: "Done" },
  ];

  const PHASES = [
    "scope",
    "plan-review",
    "research",
    "evaluating",
    "synthesis",
    "complete",
  ];
  const currentIndex = PHASES.indexOf(phase);

  return (
    <div className="rounded-2xl border border-border bg-card/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-border/50">
        <div
          className={`flex items-center justify-center w-7 h-7 rounded-lg ${modeBg} ${modeColor}`}
          title={modeLabel}
        >
          <Icon
            name={
              mode === "due-diligence"
                ? ("Scale" as any)
                : ("Microscope" as any)
            }
            className="h-4 w-4"
          />
        </div>

        {/* Phase pills */}
        <div className="flex items-center gap-1">
          {phaseSteps.map((step, i) => {
            const stepIndex = PHASES.indexOf(step.key);
            const isActive =
              currentIndex >= stepIndex &&
              (i === phaseSteps.length - 1 ||
                currentIndex < PHASES.indexOf(phaseSteps[i + 1].key));
            const isDone = currentIndex > stepIndex && !isActive;

            return (
              <div key={step.key} className="flex items-center gap-0.5">
                {i > 0 && (
                  <div
                    className={`w-3 h-px ${isDone || isActive ? "bg-primary/40" : "bg-border"}`}
                  />
                )}
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : isDone
                        ? "text-green-500"
                        : "text-muted-foreground/40"
                  }`}
                >
                  {isActive && status === "running" && (
                    <Icon
                      name="Loader2"
                      className="h-2.5 w-2.5 animate-spin inline mr-0.5 -mt-px"
                    />
                  )}
                  {isDone && (
                    <Icon
                      name="CheckCircle2"
                      className="h-2.5 w-2.5 inline mr-0.5 -mt-px"
                    />
                  )}
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
          {(searchCount > 0 || sources.length > 0) && (
            <span>
              {searchCount} searches &middot; {sources.length} sources
            </span>
          )}
          <span className="tabular-nums">{formatElapsed(elapsed)}</span>
          {status === "running" && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-md hover:bg-destructive/5"
            >
              <Icon name="Square" className="h-3 w-3" />
              {cancelling ? "Stopping..." : "Stop"}
            </button>
          )}
        </div>
      </div>

      {/* Research Plan */}
      {dimensions.length > 0 && !report && (
        <div className="px-4 py-3 border-b border-border/30 bg-muted/20">
          <div className="flex items-center gap-1.5 mb-2">
            <Icon name="Map" className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">
              Research Plan
            </span>
          </div>
          {brief && (
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              {brief}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {dimensions.map((dim, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50"
              >
                {dim}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Key Findings */}
      {findings.length > 0 && !report && (
        <div className="px-4 py-3 border-b border-blue-500/10 bg-blue-500/5">
          <div className="flex items-center gap-1.5 mb-2">
            <Icon name="Lightbulb" className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
              Key Findings ({findings.length})
            </span>
          </div>
          <div className="space-y-1">
            {findings.slice(-4).map((f, i) => (
              <p
                key={i}
                className="text-xs text-muted-foreground leading-relaxed"
              >
                {f}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Activity Feed */}
      {visibleEvents.length > 0 && (
        <div className="border-b border-border/30">
          <button
            onClick={() => setActivityOpen(!activityOpen)}
            className="w-full flex items-center gap-2 px-4 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider hover:bg-muted/20 transition-colors"
          >
            <Icon
              name={activityOpen ? "ChevronDown" : "ChevronRight"}
              className="h-3 w-3"
            />
            Activity ({visibleEvents.length})
          </button>
          {activityOpen && (
            <div className="px-4 pb-3 max-h-48 overflow-y-auto space-y-1">
              {visibleEvents.map((event, i) => (
                <ActivityLine key={i} event={event} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Report / Loading / Error */}
      <div ref={reportRef} className="px-5 py-5">
        {report ? (
          <>
            <ChatMarkdown
              content={report}
              isStreaming={status === "running"}
              sources={sources}
            />

            {/* Actions */}
            {status === "completed" && (
              <div className="mt-5 pt-4 border-t border-border/30 flex flex-wrap items-center gap-2">
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
                  Copy
                </button>
                <button
                  onClick={handleDownloadMd}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted/50 border border-border"
                >
                  <Icon name="Download" className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            )}

            {status === "cancelled" && (
              <div className="mt-4 text-xs text-muted-foreground flex items-center gap-1.5">
                <Icon name="XCircle" className="h-3.5 w-3.5" />
                Research cancelled — partial report shown above
              </div>
            )}
          </>
        ) : status === "running" ? (
          <div className="flex items-center gap-3 py-6">
            <Icon
              name="Loader2"
              className="h-5 w-5 animate-spin text-primary"
            />
            <div>
              <p className="text-sm text-muted-foreground">
                {phase === "synthesis" ? "Writing report..." : "Researching..."}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                {phase === "synthesis"
                  ? "The report will stream here as it's written"
                  : "Searching sources and analyzing findings"}
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-4">
            <Icon name="AlertCircle" className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : status === "cancelled" ? (
          <div className="flex items-center gap-2 py-4 text-muted-foreground">
            <Icon name="XCircle" className="h-4 w-4" />
            <p className="text-sm">
              Research cancelled before generating a report.
            </p>
          </div>
        ) : null}
      </div>

      {/* Expandable Sources */}
      {sources.length > 0 && (
        <div className="border-t border-border/30">
          <button
            onClick={() => setSourcesOpen(!sourcesOpen)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider hover:bg-muted/20 transition-colors"
          >
            <Icon
              name={sourcesOpen ? "ChevronDown" : "ChevronRight"}
              className="h-3 w-3"
            />
            Sources ({sources.length})
            <span className="ml-auto flex items-center gap-2 normal-case font-normal tracking-normal">
              {sources.filter((s) => s.type === "web").length > 0 && (
                <span className="flex items-center gap-0.5">
                  <Icon name="Globe" className="h-2.5 w-2.5 text-green-500" />
                  {sources.filter((s) => s.type === "web").length}
                </span>
              )}
              {sources.filter((s) => s.type === "wikipedia").length > 0 && (
                <span className="flex items-center gap-0.5">
                  <Icon name="BookOpen" className="h-2.5 w-2.5 text-blue-500" />
                  {sources.filter((s) => s.type === "wikipedia").length}
                </span>
              )}
              {sources.filter((s) => s.type === "graph").length > 0 && (
                <span className="flex items-center gap-0.5">
                  <Icon
                    name="Database"
                    className="h-2.5 w-2.5 text-purple-500"
                  />
                  {sources.filter((s) => s.type === "graph").length}
                </span>
              )}
            </span>
          </button>
          {sourcesOpen && (
            <div className="px-4 pb-3 grid gap-2 sm:grid-cols-2">
              {sources.map((source, i) => {
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

                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2 rounded-lg border border-border/40 p-2.5 text-xs ${
                      isExternal
                        ? "hover:bg-muted/30 cursor-pointer"
                        : "bg-muted/10"
                    }`}
                    onClick={() =>
                      isExternal &&
                      window.open(source.url, "_blank", "noopener")
                    }
                  >
                    <span className="flex items-center justify-center w-4 h-4 rounded bg-primary/10 text-[8px] font-semibold text-primary flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground leading-snug truncate">
                        {source.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {domain}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Activity Line (compact) ────────────────────────────────────────

function ActivityLine({ event }: { event: ResearchEvent }) {
  let icon = "Circle";
  let label = event.type;
  let color = "text-muted-foreground/60";

  switch (event.type) {
    case "phase.started":
      icon = "Play";
      label = event.data?.label || event.data?.phase;
      color = "text-primary";
      break;
    case "phase.completed":
      icon = "CheckCircle2";
      label = `${event.data?.phase} done`;
      color = "text-green-500/70";
      break;
    case "search.started":
      icon =
        event.data?.source === "graph"
          ? "Database"
          : event.data?.source === "wikipedia"
            ? "BookOpen"
            : "Globe";
      label = `Searching ${event.data?.source}: ${event.data?.query || ""}`;
      break;
    case "search.completed":
      icon = "CheckCircle2";
      label = `${event.data?.resultCount} results`;
      color = "text-green-500/60";
      break;
    case "research.dimension":
      icon = "Compass";
      label = `${(event.data?.index ?? 0) + 1}/${event.data?.total}: ${event.data?.dimension}`;
      color = "text-primary/80";
      break;
    case "research.finding":
      icon = "Lightbulb";
      label = event.data?.text || "Finding";
      color = "text-blue-500";
      break;
    case "research.evaluation":
      icon = event.data?.complete ? "CheckCircle2" : "RefreshCw";
      label = event.data?.complete
        ? "Coverage sufficient"
        : `Gaps found — going deeper`;
      color = event.data?.complete ? "text-green-500" : "text-blue-500";
      break;
    case "research.compressing":
    case "research.compressed":
      return null; // Too noisy for inline
    case "scope.completed":
      icon = "ListChecks";
      label = `${event.data?.dimensions?.length || 0} dimensions planned`;
      break;
    case "report.completed":
      icon = "FileText";
      label = "Report complete";
      color = "text-green-500";
      break;
    case "research.completed":
      icon = "PartyPopper";
      label = "Done";
      color = "text-green-500";
      break;
    case "research.error":
      icon = "AlertCircle";
      label = event.data?.message || "Error";
      color = "text-destructive";
      break;
    default:
      return null;
  }

  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <Icon name={icon as any} className={`h-3 w-3 flex-shrink-0 ${color}`} />
      <span className={`truncate ${color}`}>{label}</span>
    </div>
  );
}
