"use client";

import { Icon } from "@proto/icon-system";

interface FollowUpSuggestionsProps {
  suggestions: string[];
  onSelect: (query: string) => void;
}

export function FollowUpSuggestions({
  suggestions,
  onSelect,
}: FollowUpSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Follow up
      </h3>
      <div className="space-y-1.5">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s)}
            className="flex items-center gap-3 w-full text-left rounded-lg border border-border bg-card/50 px-4 py-2.5 hover:bg-muted/50 transition-colors group"
          >
            <Icon
              name="ArrowRight"
              className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0"
            />
            <span className="text-sm text-foreground">{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
