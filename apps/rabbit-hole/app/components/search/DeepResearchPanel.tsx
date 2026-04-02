"use client";

import { useCallback, useMemo, useRef } from "react";

import { Icon } from "@proto/icon-system";

import type { DeepResearchState } from "../../hooks/useDeepResearch";

import { ChatMarkdown } from "./ChatMarkdown";

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

// ─── Panel ──────────────────────────────────────────────────────────

interface DeepResearchPanelProps {
  research: DeepResearchState;
  query: string;
  onIngest?: (text: string, query: string) => void;
}

export function DeepResearchPanel({
  research,
  query,
  onIngest,
}: DeepResearchPanelProps) {
  const { report, sources, dimensions, brief, status, error } = research;
  const reportRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={reportRef} className="flex-1 overflow-y-auto px-8 py-6">
      <div className="max-w-3xl mx-auto">
        {dimensions.length > 0 && !report && (
          <ResearchPlanCard dimensions={dimensions} brief={brief} />
        )}

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
            {status === "running" && research.phase === "synthesis" && (
              <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
            )}

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

            {status === "cancelled" && (
              <div className="mt-6 pt-4 border-t border-border/30">
                <div className="rounded-lg border border-muted bg-muted/20 p-4 flex items-center gap-3">
                  <Icon
                    name="XCircle"
                    className="h-5 w-5 text-muted-foreground"
                  />
                  <p className="text-sm text-muted-foreground">
                    Research was cancelled. Partial report shown above.
                  </p>
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
              {research.phase === "synthesis"
                ? "Writing report..."
                : "Researching..."}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {research.phase === "synthesis"
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
      </div>
    </div>
  );
}
