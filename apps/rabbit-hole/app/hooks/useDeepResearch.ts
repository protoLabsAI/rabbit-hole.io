"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ResearchSource } from "../components/search/SourceCard";

// ─── Types ──────────────────────────────────────────────────────────

export interface ResearchEvent {
  type: string;
  data: any;
  timestamp: number;
}

export type ResearchStatus = "running" | "completed" | "failed" | "cancelled";

export interface DeepResearchState {
  events: ResearchEvent[];
  visibleEvents: ResearchEvent[];
  phase: string;
  report: string;
  sources: ResearchSource[];
  findings: string[];
  dimensions: string[];
  brief: string;
  searchCount: number;
  status: ResearchStatus;
  error: string | null;
  elapsed: number;
  cancelling: boolean;
  feedRef: React.RefObject<HTMLDivElement | null>;
  autoScrollRef: React.RefObject<boolean>;
  webSourceCount: number;
  wikiSourceCount: number;
  graphSourceCount: number;
  handleCancel: () => Promise<void>;
  formatElapsed: (s: number) => string;
}

// ─── Hook ────────────────────────────────────────────────────────────

/**
 * Manages all SSE state for a deep research job. Extracted from
 * DeepResearchPanel so page.tsx can own the state and share it between
 * the center column and the right side panel.
 */
export function useDeepResearch(
  researchId: string | null
): DeepResearchState | null {
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
  const [cancelling, setCancelling] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  // Reset all state when researchId changes
  useEffect(() => {
    setEvents([]);
    setPhase("scope");
    setReport("");
    setSources([]);
    setFindings([]);
    setDimensions([]);
    setBrief("");
    setSearchCount(0);
    setStatus("running");
    setError(null);
    setElapsed(0);
    setCancelling(false);
  }, [researchId]);

  // Timer
  useEffect(() => {
    if (!researchId || status !== "running") return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [researchId, status]);

  // SSE connection
  useEffect(() => {
    if (!researchId) return;

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
    if (!researchId || status !== "completed" || report) return;
    fetch(`/api/research/deep/${researchId}/status`)
      .then((r) => r.json())
      .then((data) => {
        if (data.data?.finalReport) setReport(data.data.finalReport);
        if (data.data?.sources) setSources(data.data.sources);
      })
      .catch(() => {});
  }, [researchId, status, report]);

  const handleCancel = useCallback(async () => {
    if (!researchId) return;
    setCancelling(true);
    try {
      await fetch(`/api/research/deep/${researchId}`, { method: "DELETE" });
    } catch {
      /* best effort */
    }
  }, [researchId]);

  const formatElapsed = useCallback((s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  }, []);

  if (!researchId) return null;

  const visibleEvents = events.filter(
    (e) => e.type !== "counters.update" && e.type !== "report.chunk"
  );

  return {
    events,
    visibleEvents,
    phase,
    report,
    sources,
    findings,
    dimensions,
    brief,
    searchCount,
    status,
    error,
    elapsed,
    cancelling,
    feedRef,
    autoScrollRef,
    webSourceCount: sources.filter((s) => s.type === "web").length,
    wikiSourceCount: sources.filter((s) => s.type === "wikipedia").length,
    graphSourceCount: sources.filter((s) => s.type === "graph").length,
    handleCancel,
    formatElapsed,
  };
}
