"use client";

import { Icon } from "@proto/icon-system";

import type { Source } from "../../hooks/useSearch";

interface SourceCardsProps {
  sources: Source[];
}

export function SourceCards({ sources }: SourceCardsProps) {
  if (sources.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Sources
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {sources.map((source, i) => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2 rounded-lg border border-border bg-card/50 p-3 hover:bg-muted/50 transition-colors"
          >
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {source.title}
              </p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                {source.type === "wikipedia"
                  ? "Wikipedia"
                  : new URL(source.url).hostname.replace("www.", "")}
              </p>
            </div>
            <Icon
              name="ExternalLink"
              className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
