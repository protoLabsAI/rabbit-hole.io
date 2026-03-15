"use client";

import { useState, useRef, useEffect, useCallback } from "react";

import { Icon } from "@proto/icon-system";
import { Badge } from "@proto/ui/atoms";

interface SearchResult {
  uid: string;
  name: string;
  type: string;
  matchReason?: string;
}

interface SearchBarProps {
  onEntitySelect: (uid: string) => void;
  onResearchRequest: (query: string) => void;
}

export function SearchBar({
  onEntitySelect,
  onResearchRequest,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/entity-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchQuery: searchQuery.trim(), limit: 8 }),
      });
      const data = await response.json();
      if (data.success && data.results) {
        setResults(data.results);
        setIsOpen(true);
        setSelectedIndex(-1);
      } else {
        setResults([]);
        setIsOpen(true);
      }
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(value), 300);
    },
    [search]
  );

  const handleSelect = useCallback(
    (uid: string) => {
      onEntitySelect(uid);
      setQuery("");
      setResults([]);
      setIsOpen(false);
      inputRef.current?.blur();
    },
    [onEntitySelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex].uid);
        } else if (query.trim() && results.length === 0 && !isLoading) {
          onResearchRequest(query.trim());
          setQuery("");
          setIsOpen(false);
        }
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
      }
    },
    [results, selectedIndex, query, isLoading, handleSelect, onResearchRequest]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4"
    >
      <div className="bg-card/95 backdrop-blur-md rounded-xl shadow-lg border border-border">
        <div className="relative">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
            placeholder="Search the knowledge graph..."
            className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-sm pl-10 pr-10 py-3 text-foreground placeholder:text-muted-foreground"
          />
          {isLoading ? (
            <Icon
              name="Loader2"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin"
            />
          ) : query ? (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name="X" className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {isOpen && (
        <div className="bg-card/95 backdrop-blur-md rounded-xl shadow-lg border border-border mt-2 overflow-hidden">
          {results.length > 0 ? (
            <div className="py-1">
              {results.map((result, index) => (
                <button
                  key={result.uid}
                  onClick={() => handleSelect(result.uid)}
                  className={`w-full text-left px-4 py-3 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                    index === selectedIndex
                      ? "bg-muted/70"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {result.name}
                    </div>
                    {result.matchReason && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {result.matchReason}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[10px] shrink-0 font-normal"
                  >
                    {result.type}
                  </Badge>
                </button>
              ))}
            </div>
          ) : !isLoading && query.trim() ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No results found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Press Enter to research &ldquo;{query.trim()}&rdquo;
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
