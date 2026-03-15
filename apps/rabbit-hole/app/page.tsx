"use client";

import { useCallback, useRef, useEffect, useState } from "react";

import { Icon } from "@proto/icon-system";

import { AnswerBlock } from "./components/search/AnswerBlock";
import { FollowUpSuggestions } from "./components/search/FollowUpSuggestions";
import { GraphResults } from "./components/search/GraphResults";
import { ResearchProgress } from "./components/search/ResearchProgress";
import { SearchInput } from "./components/search/SearchInput";
import { SearchSidebar } from "./components/search/SearchSidebar";
import { SourceCards } from "./components/search/SourceCards";
import { SourcePanel } from "./components/search/SourcePanel";
import { useTheme } from "./context/ThemeProvider";
import { useSearch, type SearchMessage, type Source } from "./hooks/useSearch";
import { useSearchSessions } from "./hooks/useSearchSessions";

// ─── Single Message Block ────────────────────────────────────────────

function MessageBlock({
  message,
  onFollowUp,
  onViewSources,
  isLatest,
}: {
  message: SearchMessage;
  onFollowUp: (q: string) => void;
  onViewSources: (sources: Source[]) => void;
  isLatest: boolean;
}) {
  return (
    <div className="space-y-5 pb-6 border-b border-border/50 last:border-0">
      <h2 className="text-xl font-semibold text-foreground">{message.query}</h2>
      <GraphResults entities={message.graphEntities} />
      <ResearchProgress steps={message.researchSteps} phase={message.phase} />
      <SourceCards
        sources={message.sources}
        onViewAll={
          message.sources.length > 3
            ? () => onViewSources(message.sources)
            : undefined
        }
      />
      <AnswerBlock answer={message.answer} phase={message.phase} />
      {isLatest && message.phase === "done" && (
        <FollowUpSuggestions
          suggestions={message.suggestions}
          onSelect={onFollowUp}
        />
      )}
      {message.error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4">
          <div className="flex items-center gap-2">
            <Icon name="AlertCircle" className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{message.error}</p>
          </div>
        </div>
      )}
      {message.phase === "searching_graph" && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground py-4">
          <Icon name="Loader2" className="h-5 w-5 animate-spin text-primary" />
          <span>Searching the knowledge graph...</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function SearchPage() {
  const { branding } = useTheme();
  const { messages, activeMessage, isIdle, search, reset, loadMessages } =
    useSearch();
  const sessionMgr = useSearchSessions();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sourcePanelSources, setSourcePanelSources] = useState<Source[]>([]);
  const [sourcePanelOpen, setSourcePanelOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync search messages to active session
  useEffect(() => {
    if (sessionMgr.activeSessionId && messages.length > 0) {
      sessionMgr.updateSession(sessionMgr.activeSessionId, messages);
    }
  }, [messages]);

  // Restore session from URL on mount
  useEffect(() => {
    if (sessionMgr.loaded && sessionMgr.activeSession && isIdle) {
      loadMessages(sessionMgr.activeSession.messages);
    }
  }, [sessionMgr.loaded, sessionMgr.activeSession?.id]);

  const handleSearch = useCallback(
    (q: string) => {
      if (!sessionMgr.activeSessionId) {
        sessionMgr.createSession(q);
      }
      search(q);
    },
    [search, sessionMgr]
  );

  const handleNewSession = useCallback(() => {
    reset();
    sessionMgr.newSession();
  }, [reset, sessionMgr]);

  const handleSelectSession = useCallback(
    (id: string) => {
      const session = sessionMgr.sessions.find((s) => s.id === id);
      if (session) {
        sessionMgr.selectSession(id);
        loadMessages(session.messages);
      }
      setSidebarOpen(false);
    },
    [sessionMgr, loadMessages]
  );

  const handleViewSources = useCallback((sources: Source[]) => {
    setSourcePanelSources(sources);
    setSourcePanelOpen(true);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (
      activeMessage?.phase === "answering" ||
      activeMessage?.phase === "done"
    ) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [activeMessage?.answer, activeMessage?.phase]);

  // ─── Empty State ─────────────────────────────────────────────────

  if (isIdle) {
    return (
      <div className="relative min-h-screen bg-gradient-to-b from-background via-background to-muted/10 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

        {/* Sidebar toggle */}
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

        <div className="relative flex flex-col items-center px-4 pt-[30vh]">
          <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
            <div className="flex flex-col items-center gap-3">
              <span className="text-5xl sm:text-6xl">
                {branding?.logo || "🐰"}
              </span>
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

  // ─── Conversation Thread ─────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <SearchSidebar
        sessions={sessionMgr.sessions}
        activeSessionId={sessionMgr.activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={sessionMgr.deleteSession}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Source panel (right side) */}
      <SourcePanel
        sources={sourcePanelSources}
        isOpen={sourcePanelOpen}
        onClose={() => setSourcePanelOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
            >
              <Icon name="PanelLeft" className="h-4 w-4" />
            </button>
            <button
              onClick={handleNewSession}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <span className="text-lg">{branding?.logo || "🐰"}</span>
              <span className="font-medium hidden sm:inline">
                {branding?.name || "Rabbit Hole"}
              </span>
            </button>
            {messages.length > 1 && (
              <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                {messages.length} messages
              </span>
            )}
            <button
              onClick={handleNewSession}
              className="ml-auto p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
              title="New search"
            >
              <Icon name="PenSquare" className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
          <div className="space-y-8">
            {messages.map((msg, i) => (
              <MessageBlock
                key={msg.id}
                message={msg}
                onFollowUp={handleSearch}
                onViewSources={handleViewSources}
                isLatest={i === messages.length - 1}
              />
            ))}
          </div>
          <div ref={bottomRef} />
        </main>

        {/* Bottom input bar */}
        <footer className="sticky bottom-0 z-30 bg-background/80 backdrop-blur-md border-t border-border">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <SearchInput
              onSearch={handleSearch}
              autoFocus={activeMessage?.phase === "done"}
            />
          </div>
        </footer>
      </div>
    </div>
  );
}
