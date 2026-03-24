"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "@proto/icon-system";

import { getEntityVisual } from "../lib/atlas-schema";

// ─── Types ──────────────────────────────────────────────────────────

interface SearchResult {
  entity: {
    uid: string;
    name: string;
    type: string;
  };
  similarity: number;
}

interface Atlas3DSearchBarProps {
  /** Called when the user selects an entity. Returns the uid. */
  onSelect: (uid: string, name: string) => void;
  /** Set of node IDs currently in the graph */
  graphNodeIds: Set<string>;
}

// ─── Component ──────────────────────────────────────────────────────

export default function Atlas3DSearchBar({
  onSelect,
  graphNodeIds,
}: Atlas3DSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search with debounce
  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/entity-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ searchQuery: q.trim(), limit: 5 }),
        });
        const json = await res.json();
        if (json.success && json.data?.results) {
          setResults(json.data.results);
          setOpen(json.data.results.length > 0);
          setActiveIndex(-1);
        }
      } catch {
        // Silently fail — search is best-effort
      } finally {
        setLoading(false);
      }
    }, 200);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onSelect(result.entity.uid, result.entity.name);
      setQuery(result.entity.name);
      setOpen(false);
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open || results.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : results.length - 1
        );
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        handleSelect(results[activeIndex]);
      } else if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    },
    [open, results, activeIndex, handleSelect]
  );

  return (
    <div
      ref={containerRef}
      className="absolute top-3 left-3 z-20 w-[280px]"
    >
      {/* Input */}
      <div className="relative">
        <Icon
          name="Search"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search entities..."
          className="w-full h-8 pl-8 pr-8 text-xs rounded-md
            bg-card/80 backdrop-blur-md border border-border
            text-foreground placeholder:text-muted-foreground
            focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        {loading && (
          <Icon
            name="Loader2"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground"
          />
        )}
        {!loading && query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
          >
            <Icon
              name="X"
              className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
            />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {open && results.length > 0 && (
        <div className="mt-1 rounded-md border border-border bg-card/95 backdrop-blur-md shadow-lg overflow-hidden">
          {results.map((result, i) => {
            const visual = getEntityVisual(result.entity.type);
            const inGraph = graphNodeIds.has(result.entity.uid);

            return (
              <button
                key={result.entity.uid}
                onClick={() => handleSelect(result)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors
                  ${i === activeIndex ? "bg-muted" : "hover:bg-muted/50"}`}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: visual.color }}
                />
                <span className="text-xs text-foreground truncate flex-1">
                  {result.entity.name}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {visual.label}
                </span>
                {inGraph && (
                  <Icon
                    name="Check"
                    className="h-3 w-3 text-primary shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
