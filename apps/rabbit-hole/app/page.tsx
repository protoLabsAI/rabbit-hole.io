"use client";

import { useCallback, useRef, useEffect, useState } from "react";

import { Icon } from "@proto/icon-system";

import { ChatMessage } from "./components/search/ChatMessage";
import { SearchInput } from "./components/search/SearchInput";
import { SearchSidebar } from "./components/search/SearchSidebar";
import { useTheme } from "./context/ThemeProvider";
import { useChatSearch } from "./hooks/useChatSearch";
import { useSearchSessions } from "./hooks/useSearchSessions";

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
  } = useChatSearch();

  const sessionMgr = useSearchSessions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync messages to active session
  useEffect(() => {
    if (sessionMgr.activeSessionId && messages.length > 0) {
      // Store serializable snapshot
      sessionMgr.updateSession(sessionMgr.activeSessionId, messages as any);
    }
  }, [messages]);

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
      if (session?.messages) {
        sessionMgr.selectSession(id);
        setMessages(session.messages as any);
      }
      setSidebarOpen(false);
    },
    [sessionMgr, setMessages]
  );

  const handleIngest = useCallback(
    async (text: string) => {
      // Get the query from the last user message
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
        // Best effort
      }
    },
    [messages]
  );

  // Auto-scroll
  useEffect(() => {
    if (isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [lastAssistantMessage?.parts, isStreaming]);

  // ─── Empty State ─────────────────────────────────────────────────

  if (isIdle) {
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
      <SearchSidebar
        sessions={sessionMgr.sessions}
        activeSessionId={sessionMgr.activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={sessionMgr.deleteSession}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
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
            {isStreaming && (
              <span className="text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Icon name="Loader2" className="h-3 w-3 animate-spin" />
                Researching
              </span>
            )}
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => {
                  const url = window.location.href;
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(url);
                  }
                }}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
                title="Copy link"
              >
                <Icon name="Link" className="h-4 w-4" />
              </button>
              <button
                onClick={handleNewSession}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
                title="New search"
              >
                <Icon name="PenSquare" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
          <div className="space-y-6">
            {messages.map((msg, i) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isStreaming={isStreaming}
                isLast={i === messages.length - 1}
                onIngest={msg.role === "assistant" ? handleIngest : undefined}
              />
            ))}
          </div>
          <div ref={bottomRef} />
        </main>

        {/* Bottom input bar */}
        <footer className="sticky bottom-0 z-30 bg-background/80 backdrop-blur-md border-t border-border">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <SearchInput onSearch={handleSearch} autoFocus={!isStreaming} />
          </div>
        </footer>
      </div>
    </div>
  );
}
