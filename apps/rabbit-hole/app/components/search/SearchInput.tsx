"use client";

import { useState, useRef, useCallback } from "react";

import { Icon } from "@proto/icon-system";

interface SearchInputProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
  size?: "large" | "normal";
  autoFocus?: boolean;
}

export function SearchInput({
  onSearch,
  initialQuery = "",
  size = "normal",
  autoFocus = false,
}: SearchInputProps) {
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed) onSearch(trimmed);
  }, [query, onSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const isLarge = size === "large";

  return (
    <div className={`relative w-full max-w-2xl ${isLarge ? "max-w-3xl" : ""}`}>
      <div className="relative bg-card/80 backdrop-blur-md rounded-2xl border border-border shadow-lg hover:shadow-xl transition-shadow">
        <textarea
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          autoFocus={autoFocus}
          rows={1}
          className={`w-full bg-transparent border-0 focus:outline-none focus:ring-0 resize-none text-foreground placeholder:text-muted-foreground ${
            isLarge ? "text-lg pl-5 pr-14 py-4" : "text-sm pl-4 pr-12 py-3"
          }`}
          style={{ minHeight: isLarge ? "56px" : "44px" }}
        />
        <button
          onClick={handleSubmit}
          disabled={!query.trim()}
          className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 transition-all hover:bg-primary/90 ${
            isLarge ? "p-2.5" : "p-2"
          }`}
        >
          <Icon name="ArrowRight" className={isLarge ? "h-5 w-5" : "h-4 w-4"} />
        </button>
      </div>
    </div>
  );
}
