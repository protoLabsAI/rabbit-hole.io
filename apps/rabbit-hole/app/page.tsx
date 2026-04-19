"use client";

import { useCallback, useRef, useEffect, useState, useMemo } from "react";

import { Icon } from "@protolabsai/icon-system";

import { ChatMessage } from "./components/search/ChatMessage";
import { ChatSourcePanel } from "./components/search/ChatSourcePanel";
import { DeepResearchPanel } from "./components/search/DeepResearchPanel";
import { DeepResearchSidePanel } from "./components/search/DeepResearchSidePanel";
import { SearchInput, type SearchMode } from "./components/search/SearchInput";
import { SearchSidebar } from "./components/search/SearchSidebar";
import { useTheme } from "./context/ThemeProvider";
import { useChatSearch } from "./hooks/useChatSearch";
import { useDeepResearch } from "./hooks/useDeepResearch";
import { useSearchSessions } from "./hooks/useSearchSessions";
import { extractMessageSources } from "./lib/extract-message-sources";

// ─── Constants ──────────────────────────────────────────────────────

const PHASES = [
  "scope",
  "plan-review",
  "research",
  "evaluating",
  "synthesis",
  "complete",
];

const PHASE_LABELS: Record<string, { icon: string; label: string }> = {
  scope: { icon: "FileSearch", label: "Plan" },
  "plan-review": { icon: "ListChecks", label: "Plan Review" },
  research: { icon: "Search", label: "Research" },
  evaluating: { icon: "Brain", label: "Evaluate" },
  synthesis: { icon: "FileText", label: "Write" },
  complete: { icon: "CheckCircle2", label: "Done" },
};

const DISPLAY_PHASES = [
  { key: "scope", label: "Plan" },
  { key: "research", label: "Research" },
  { key: "synthesis", label: "Write" },
  { key: "complete", label: "Done" },
];

// ─── Brand Logo ─────────────────────────────────────────────────────

function BrandLogo({ logo, size = 24 }: { logo?: string; size?: number }) {
  if (logo?.startsWith("/")) {
    return (
      <span
        className="inline-block text-foreground"
        style={{
          width: size,
          height: size,
          backgroundColor: "currentColor",
          maskImage: `url(${logo})`,
          WebkitMaskImage: `url(${logo})`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      />
    );
  }
  return <span style={{ fontSize: size * 0.8 }}>{logo || "🐰"}</span>;
}

// ─── Phase Progress (header inline) ─────────────────────────────────

function PhaseProgress({ currentPhase }: { currentPhase: string }) {
  const currentIndex = PHASES.indexOf(currentPhase);

  return (
    <div className="flex items-center gap-1">
      {DISPLAY_PHASES.map((phase, i) => {
        const phaseIndex = PHASES.indexOf(phase.key);
        const isActive =
          currentIndex >= phaseIndex &&
          (i === DISPLAY_PHASES.length - 1 ||
            currentIndex < PHASES.indexOf(DISPLAY_PHASES[i + 1].key));
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

// ─── Types ──────────────────────────────────────────────────────────

interface ActiveResearch {
  id: string;
  query: string;
  mode: "deep-research" | "due-diligence";
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function SearchPage() {
  const { branding } = useTheme();
  const {
    messages,
    isStreaming,
    isIdle,
    search,
    reset,
    setMessages,
    lastAssistantMessage,
    regenerate,
  } = useChatSearch();

  const sessionMgr = useSearchSessions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeResearch, setActiveResearch] = useState<ActiveResearch | null>(
    null
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  // Research state — lives here so both header and side panel can read it
  const research = useDeepResearch(activeResearch?.id ?? null);

  // Sources for chat mode right panel — derived from last assistant message
  const chatSources = useMemo(
    () => extractMessageSources(lastAssistantMessage),
    [lastAssistantMessage]
  );

  // Sync messages to active session
  useEffect(() => {
    if (sessionMgr.activeSessionId && messages.length > 0) {
      sessionMgr.updateSession(sessionMgr.activeSessionId, messages as any);
    }
  }, [messages]);

  const handleSearch = useCallback(
    (q: string, _files?: any[], mode?: SearchMode) => {
      if (mode === "deep-research" || mode === "due-diligence") {
        handleDeepResearch(q, mode);
        return;
      }
      if (!sessionMgr.activeSessionId) {
        sessionMgr.createSession(q);
      }
      setActiveResearch(null);
      search(q);
    },
    [search, sessionMgr]
  );

  const handleNewSession = useCallback(() => {
    reset();
    setActiveResearch(null);
    sessionMgr.newSession();
  }, [reset, sessionMgr]);

  const handleSelectSession = useCallback(
    (id: string) => {
      const session = sessionMgr.sessions.find((s) => s.id === id);
      if (!session) return;
      sessionMgr.selectSession(id);

      if (session.type === "deep-research" && session.researchId) {
        setActiveResearch({
          id: session.researchId,
          query: session.title,
          mode: "deep-research",
        });
        reset();
      } else if (session.messages) {
        setActiveResearch(null);
        setMessages(session.messages as any);
      }
      setSidebarOpen(false);
    },
    [sessionMgr, setMessages, reset]
  );

  const handleDeepResearch = useCallback(
    async (query: string, mode: "deep-research" | "due-diligence") => {
      try {
        const res = await fetch("/api/research/deep", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, mode }),
        });
        const data = await res.json();
        if (data.success && data.researchId) {
          sessionMgr.createSession(query, {
            type: "deep-research",
            researchId: data.researchId,
          });
          setActiveResearch({ id: data.researchId, query, mode });
          reset();
        }
      } catch {
        /* best effort */
      }
    },
    [sessionMgr, reset]
  );

  /**
   * Follow-up from a completed deep research report.
   *
   * Strategy:
   * - Deep research / due-diligence mode → fresh pipeline, no context injection.
   * - Chat mode:
   *     1. Ingest the full report into the knowledge graph (fire-and-forget).
   *        The agent's searchGraph tool retrieves these entities on demand —
   *        no truncation, no data loss, arbitrarily deep retrieval.
   *     2. Inject a compact structured summary (dimensions + key findings) as
   *        prior context — NOT the raw report blob.
   *     3. The summary directs the agent to searchGraph first so it finds the
   *        indexed entities before falling back to the web.
   */
  const handleResearchFollowUp = useCallback(
    (query: string, _files?: any[], mode?: SearchMode) => {
      if (mode === "deep-research" || mode === "due-diligence") {
        handleDeepResearch(query, mode);
        return;
      }

      if (activeResearch && research?.report) {
        // Ingest full report into KG — fire-and-forget, agent retrieves via searchGraph
        fetch("/api/chat/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: activeResearch.query,
            text: research.report,
          }),
        }).catch(() => {
          /* best effort */
        });

        // Compact structured summary — no raw blob, no truncation
        const summaryParts: string[] = [
          `Deep research completed on: "${activeResearch.query}"`,
        ];
        if (research.dimensions.length) {
          summaryParts.push(
            `Dimensions covered: ${research.dimensions.join(" · ")}`
          );
        }
        if (research.findings.length) {
          const top = research.findings
            .slice(0, 6)
            .map((f) => `- ${f}`)
            .join("\n");
          summaryParts.push(`Key findings:\n${top}`);
        }
        summaryParts.push(
          "All entities from this research are being indexed into the knowledge graph. " +
            "Use searchGraph first to retrieve detailed entities, then supplement with web search as needed."
        );

        setMessages([
          {
            id: `rctx-${Date.now()}-u`,
            role: "user",
            parts: [{ type: "text", text: activeResearch.query }],
          },
          {
            id: `rctx-${Date.now()}-a`,
            role: "assistant",
            parts: [{ type: "text", text: summaryParts.join("\n\n") }],
          },
        ] as any);
      }

      setActiveResearch(null);
      if (!sessionMgr.activeSessionId) {
        sessionMgr.createSession(query);
      }
      search(query);
    },
    [
      activeResearch,
      research,
      setMessages,
      search,
      sessionMgr,
      handleDeepResearch,
    ]
  );

  const handleIngest = useCallback(
    async (text: string) => {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const query =
        lastUser?.parts
          ?.filter(
            (p): p is { type: "text"; text: string } => p.type === "text"
          )
          .map((p) => p.text)
          .join("") || "search result";

      try {
        await fetch("/api/chat/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, text }),
        });
      } catch {
        /* best effort */
      }
    },
    [messages]
  );

  const handleResearchIngest = useCallback(
    async (text: string, query: string) => {
      try {
        await fetch("/api/chat/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, text }),
        });
      } catch {
        /* best effort */
      }
    },
    []
  );

  // Auto-scroll on new content
  useEffect(() => {
    if (isStreaming || activeResearch) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [lastAssistantMessage?.parts, isStreaming, activeResearch]);

  const showEmptyState = isIdle && !activeResearch;

  // ─── Empty State ─────────────────────────────────────────────────

  if (showEmptyState) {
    return (
      <div className="relative h-screen bg-gradient-to-b from-background via-background to-muted/10 overflow-hidden flex flex-col">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

        {sessionMgr.sessions.length > 0 && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-4 left-4 z-30 p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
          >
            <Icon name="PanelLeft" className="h-5 w-5" />
          </button>
        )}

        <SearchSidebar
          sessions={sessionMgr.sessions}
          activeSessionId={sessionMgr.activeSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={sessionMgr.deleteSession}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex-1" />
        <div className="relative flex flex-col items-center px-4 pb-[38vh]">
          <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
            <div className="flex items-center gap-2">
              <BrandLogo logo={branding?.logo} size={48} />
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                {branding?.name || "Rabbit Hole"}
              </h1>
            </div>

            <SearchInput onSearch={handleSearch} size="large" autoFocus />

            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {["DORA metrics", "Accelerate book", "DevOps practices"].map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSearch(suggestion)}
                    className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1.5 hover:bg-muted/50 transition-colors"
                  >
                    {suggestion}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Right panel has content ─────────────────────────────────────

  const hasRightContent = activeResearch
    ? !!(research?.visibleEvents.length || research?.sources.length)
    : !!(
        chatSources.sources.length ||
        chatSources.graphEntities.length ||
        chatSources.communities.length ||
        isStreaming
      );

  // ─── Unified Layout ──────────────────────────────────────────────

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <SearchSidebar
        sessions={sessionMgr.sessions}
        activeSessionId={sessionMgr.activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={sessionMgr.deleteSession}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border flex-shrink-0">
          <div className="px-4 py-2.5 flex items-center gap-3">
            {/* Left: sidebar toggle + brand */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50 flex-shrink-0"
            >
              <Icon name="PanelLeft" className="h-4 w-4" />
            </button>
            <button
              onClick={handleNewSession}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <BrandLogo logo={branding?.logo} size={20} />
              <span className="font-medium hidden sm:inline">
                {branding?.name || "Rabbit Hole"}
              </span>
            </button>

            {/* Center: mode indicator */}
            {activeResearch && research ? (
              <>
                <span className="text-border/50 hidden sm:inline">·</span>
                <span className="text-xs text-muted-foreground truncate max-w-[30vw] hidden sm:inline">
                  {activeResearch.query}
                </span>
                <span className="text-[10px] text-muted-foreground/50 tabular-nums flex-shrink-0">
                  {research.formatElapsed(research.elapsed)}
                  {(research.searchCount > 0 ||
                    research.sources.length > 0) && (
                    <>
                      {" · "}
                      {research.searchCount} searches
                      {" · "}
                      {research.sources.length} sources
                    </>
                  )}
                </span>
              </>
            ) : isStreaming ? (
              <span className="text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Icon name="Loader2" className="h-3 w-3 animate-spin" />
                Searching
              </span>
            ) : null}

            <div className="flex-1" />

            {/* Center-right: phase progress (research mode only) */}
            {activeResearch && research && (
              <PhaseProgress currentPhase={research.phase} />
            )}

            {/* Right: actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {activeResearch && research?.status === "running" && (
                <button
                  onClick={research.handleCancel}
                  disabled={research.cancelling}
                  className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-md hover:bg-destructive/5 border border-border"
                >
                  <Icon name="Square" className="h-3 w-3" />
                  {research.cancelling ? "Stopping..." : "Stop"}
                </button>
              )}
              {!activeResearch && (
                <button
                  onClick={() => {
                    if (navigator.clipboard?.writeText) {
                      navigator.clipboard.writeText(window.location.href);
                    }
                  }}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
                  title="Copy link"
                >
                  <Icon name="Link" className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={handleNewSession}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
                title="New search"
              >
                <Icon name="PenSquare" className="h-4 w-4" />
              </button>
              {hasRightContent && (
                <button
                  onClick={() => setRightPanelOpen((v) => !v)}
                  className={`p-1.5 transition-colors rounded-lg hover:bg-muted/50 ${
                    rightPanelOpen
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={rightPanelOpen ? "Collapse panel" : "Expand panel"}
                >
                  <Icon name="PanelRight" className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ── Content row ────────────────────────────────────────── */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Center column */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            {activeResearch && research ? (
              <DeepResearchPanel
                research={research}
                query={activeResearch.query}
                onIngest={handleResearchIngest}
                onFollowUp={handleResearchFollowUp}
              />
            ) : (
              <>
                <main className="flex-1 overflow-y-auto px-4 py-6">
                  <div className="max-w-3xl mx-auto space-y-2">
                    {messages.map((msg, i) => (
                      <ChatMessage
                        key={msg.id}
                        message={msg}
                        isStreaming={isStreaming}
                        isLast={i === messages.length - 1}
                        onIngest={
                          msg.role === "assistant" ? handleIngest : undefined
                        }
                        onFollowUp={handleSearch}
                        onRegenerate={
                          msg.role === "assistant" && i === messages.length - 1
                            ? regenerate
                            : undefined
                        }
                      />
                    ))}
                    <div ref={bottomRef} />
                  </div>
                </main>

                <footer className="sticky bottom-0 z-30 bg-background/80 backdrop-blur-md border-t border-border flex-shrink-0">
                  <div className="max-w-3xl mx-auto px-4 py-3">
                    <SearchInput
                      onSearch={handleSearch}
                      autoFocus={!isStreaming}
                    />
                  </div>
                </footer>
              </>
            )}
          </div>

          {/* Right panel */}
          {rightPanelOpen && hasRightContent && (
            <aside className="w-72 border-l border-border flex flex-col min-h-0 flex-shrink-0 animate-in slide-in-from-right-2 duration-200">
              {activeResearch && research ? (
                <DeepResearchSidePanel research={research} />
              ) : (
                <div className="flex-1 overflow-y-auto p-3">
                  <ChatSourcePanel
                    sources={chatSources.sources}
                    entities={chatSources.graphEntities}
                    communities={chatSources.communities}
                    isStreaming={isStreaming}
                  />
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
