"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

import { Icon } from "@proto/icon-system";

import { ChatMarkdown } from "./ChatMarkdown";
import { ResearchLayout, StepIndicator } from "./ResearchLayout";
import type { ResearchSource } from "./SourceCard";
import type { ActivityEvent } from "./types";

// ─── Types ──────────────────────────────────────────────────────────

interface ResearchEvent {
  type: string;
  data: any;
  timestamp: number;
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
    <div className="flex flex-wrap gap-1.5 px-1 py-2 mb-4 border-b border-border/30 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
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
  const reportRef = useRef<HTMLDivElement>(null);

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

        if (event.type !== "counters.update" && event.type !== "report.chunk") {
          setEvents((prev) => [...prev, event]);
        }

        if (event.type === "report.chunk") {
          setReport((prev) => prev + (event.data?.text ?? ""));
        }

        if (event.type === "counters.update") {
          setSearchCount(event.data?.searches ?? 0);
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

        if (event.type === "research.cancelled") {
          setStatus("cancelled");
        }

        if (event.type === "research.error") {
          setStatus("failed");
          setError(event.data?.message);
        }
      } catch {
        /* skip unparseable */
      }
    };

    eventSource.onerror = () => {
      // EventSource auto-reconnects
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
    const headings = reportRef.current.querySelectorAll("h2");
    for (const el of headings) {
      if (el.textContent?.includes(heading)) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
  }, []);

  // Cast ResearchEvent[] to ActivityEvent[] (same shape)
  const activityEvents = events as ActivityEvent[];

  return (
    <div
      className={
        embedded
          ? "flex flex-col flex-1 min-h-0"
          : "fixed inset-0 z-50 bg-background flex flex-col"
      }
    >
      {/* Header */}
      <header className="border-b border-border px-4 py-2 flex items-center gap-3">
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
          >
            <Icon name="ArrowLeft" className="h-4 w-4" />
          </button>
        )}
        <h1 className="text-xs font-medium text-foreground truncate max-w-[40vw]">
          {query}
        </h1>
        <span className="text-[10px] text-muted-foreground/50 tabular-nums flex-shrink-0">
          {formatElapsed(elapsed)}
          {(searchCount > 0 || sources.length > 0) && (
            <>
              {" "}
              &middot; {searchCount} searches &middot; {sources.length} sources
            </>
          )}
        </span>

        <div className="flex-1" />

        <StepIndicator currentPhase={phase} />

        {/* Actions */}
        <div className="flex items-center gap-1">
          {status === "running" && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-md hover:bg-destructive/5 border border-border"
            >
              <Icon name="Square" className="h-3 w-3" />
              {cancelling ? "Stopping..." : "Stop"}
            </button>
          )}
          <button
            onClick={() => setSourcePanelOpen(!sourcePanelOpen)}
            className={`p-1 transition-colors rounded-lg hover:bg-muted/50 ${
              sourcePanelOpen
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Toggle drawer"
          >
            <Icon name="PanelRight" className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Content — ResearchLayout provides the 3-panel flex structure */}
      <ResearchLayout
        mode="deep-research"
        activityEvents={activityEvents}
        sources={sources}
        findings={findings}
        isStreaming={status === "running"}
        currentPhase={phase}
        drawerOpen={sourcePanelOpen}
        onDrawerToggle={() => setSourcePanelOpen((v) => !v)}
        reportRef={reportRef}
      >
        {/* Research Plan Card (shown before report arrives) */}
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
            {status === "running" && phase === "synthesis" && (
              <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
            )}

            {/* Action buttons */}
            {status === "completed" && (
              <div className="mt-4 pt-3 border-t border-border/30 flex items-center gap-0.5">
                <button
                  onClick={handleCopyReport}
                  className="p-1.5 text-muted-foreground/60 hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
                  title="Copy report"
                >
                  <Icon name="Copy" className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleDownloadMd}
                  className="p-1.5 text-muted-foreground/60 hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
                  title="Download markdown"
                >
                  <Icon name="Download" className="h-3.5 w-3.5" />
                </button>
                <div className="w-px h-4 bg-border/40 mx-1" />
                <button
                  onClick={handleIngest}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
                >
                  <Icon name="DatabaseZap" className="h-3.5 w-3.5" />
                  Add to Knowledge Graph
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
            <div className="flex items-center gap-1 mb-4">
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
            </div>
            <p className="text-sm text-muted-foreground">
              {phase === "synthesis" ? "Writing report..." : "Researching..."}
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
              <Icon name="AlertCircle" className="h-5 w-5 text-destructive" />
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
      </ResearchLayout>
    </div>
  );
}
