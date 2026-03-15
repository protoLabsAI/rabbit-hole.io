"use client";

import { useCallback, useRef, useEffect } from "react";

import { Icon } from "@proto/icon-system";

import { AnswerBlock } from "./components/search/AnswerBlock";
import { FollowUpSuggestions } from "./components/search/FollowUpSuggestions";
import { GraphResults } from "./components/search/GraphResults";
import { ResearchProgress } from "./components/search/ResearchProgress";
import { SearchInput } from "./components/search/SearchInput";
import { SourceCards } from "./components/search/SourceCards";
import { useTheme } from "./context/ThemeProvider";
import { useSearch } from "./hooks/useSearch";

export default function SearchPage() {
  const { branding } = useTheme();
  const {
    phase,
    query,
    graphEntities,
    sources,
    researchSteps,
    answer,
    suggestions,
    error,
    search,
    reset,
  } = useSearch();

  const resultsRef = useRef<HTMLDivElement>(null);

  const isIdle = phase === "idle";

  const handleSearch = useCallback(
    (q: string) => {
      search(q);
      // Scroll to top on new search
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [search]
  );

  // Auto-scroll as answer streams
  useEffect(() => {
    if (phase === "answering" && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [answer, phase]);

  if (isIdle) {
    return (
      <div className="relative min-h-screen bg-gradient-to-b from-background via-background to-muted/10 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

        <div className="relative flex flex-col items-center justify-center min-h-screen px-4">
          <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
            {/* Logo & Title */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-5xl sm:text-6xl">
                {branding?.logo || "🕳️"}
              </span>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                {branding?.name || "Rabbit Hole"}
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg text-center max-w-md">
                Search the knowledge graph. Every search makes it smarter.
              </p>
            </div>

            {/* Search Input */}
            <SearchInput onSearch={handleSearch} size="large" autoFocus />

            {/* Quick suggestions */}
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

  // ─── Results View ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={reset}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="text-xl">{branding?.logo || "🕳️"}</span>
            <span className="font-medium hidden sm:inline">
              {branding?.name || "Rabbit Hole"}
            </span>
          </button>
          <div className="flex-1">
            <SearchInput onSearch={handleSearch} initialQuery={query} />
          </div>
        </div>
      </header>

      {/* Results */}
      <main className="max-w-3xl mx-auto px-4 py-6" ref={resultsRef}>
        <div className="space-y-6">
          {/* Query */}
          <h2 className="text-2xl font-semibold text-foreground">{query}</h2>

          {/* Graph results */}
          <GraphResults entities={graphEntities} />

          {/* Research progress */}
          <ResearchProgress steps={researchSteps} phase={phase} />

          {/* Sources */}
          <SourceCards sources={sources} />

          {/* Answer */}
          <AnswerBlock answer={answer} phase={phase} />

          {/* Follow-up suggestions */}
          <FollowUpSuggestions
            suggestions={suggestions}
            onSelect={handleSearch}
          />

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4">
              <div className="flex items-center gap-2">
                <Icon name="AlertCircle" className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {phase === "searching_graph" && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground py-8">
              <Icon
                name="Loader2"
                className="h-5 w-5 animate-spin text-primary"
              />
              <span>Searching the knowledge graph...</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
