"use client";

import { Icon } from "@proto/icon-system";

import type { Source } from "../../hooks/useSearch";

interface SourceCardsProps {
  sources: Source[];
  onViewAll?: () => void;
}

export function SourceCards({ sources, onViewAll }: SourceCardsProps) {
  if (sources.length === 0) return null;

  const visible = sources.slice(0, 3);
  const remaining = sources.length - visible.length;

  return (
    <div className="space-y-2">
      <button
        onClick={onViewAll}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        <Icon name="FileStack" className="h-3.5 w-3.5" />
        {sources.length} Sources
        <Icon name="ChevronRight" className="h-3 w-3" />
      </button>
      <div className="flex gap-2 overflow-x-auto">
        {visible.map((source, i) => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2 rounded-lg border border-border bg-card/50 p-3 hover:bg-muted/50 transition-colors min-w-[180px] max-w-[220px] flex-shrink-0"
          >
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {source.title}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {source.type !== "wikipedia" && (
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=16`}
                    alt=""
                    className="w-3 h-3"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <p className="text-[10px] text-muted-foreground truncate">
                  {source.type === "wikipedia"
                    ? "Wikipedia"
                    : new URL(source.url).hostname.replace("www.", "")}
                </p>
              </div>
            </div>
          </a>
        ))}
        {remaining > 0 && (
          <button
            onClick={onViewAll}
            className="flex items-center justify-center rounded-lg border border-border bg-card/50 px-4 hover:bg-muted/50 transition-colors min-w-[100px] flex-shrink-0"
          >
            <div className="text-center">
              <p className="text-sm font-medium text-primary">+{remaining}</p>
              <p className="text-[10px] text-muted-foreground">View all</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
