"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@protolabsai/icon-system";

// ─── Types ──────────────────────────────────────────────────────────

export interface ResearchSource {
  title: string;
  url: string;
  type: "web" | "wikipedia" | "graph" | "community";
  snippet?: string;
}

// ─── Source Card ─────────────────────────────────────────────────────

export function SourceCard({
  source,
  index,
  isHighlighted,
}: {
  source: ResearchSource;
  index: number;
  isHighlighted?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isPulsing, setIsPulsing] = useState(false);
  const wasHighlighted = useRef(false);

  useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isHighlighted]);

  // Trigger a brief pulse animation when the card becomes highlighted
  useEffect(() => {
    if (isHighlighted && !wasHighlighted.current) {
      wasHighlighted.current = true;
      setIsPulsing(true);
      const t = setTimeout(() => setIsPulsing(false), 900);
      return () => clearTimeout(t);
    }
    if (!isHighlighted) {
      wasHighlighted.current = false;
    }
  }, [isHighlighted]);

  const domain = source.url.startsWith("#")
    ? "Knowledge Graph"
    : (() => {
        try {
          return new URL(source.url).hostname.replace("www.", "");
        } catch {
          return source.url;
        }
      })();

  const isExternal = !source.url.startsWith("#");
  const typeIcon =
    source.type === "graph"
      ? "Database"
      : source.type === "wikipedia"
        ? "BookOpen"
        : source.type === "community"
          ? "Users"
          : "Globe";
  const typeColor =
    source.type === "graph"
      ? "text-purple-500"
      : source.type === "wikipedia"
        ? "text-blue-500"
        : source.type === "community"
          ? "text-orange-500"
          : "text-green-500";

  return (
    <div
      ref={ref}
      style={{ animationDelay: `${index * 60}ms` }}
      className={`group rounded-lg border p-3 text-xs transition-colors duration-300 animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both ${
        isPulsing ? "animate-pulse" : ""
      } ${
        isHighlighted
          ? "border-primary/60 bg-primary/10 shadow-sm"
          : isExternal
            ? "border-border/50 hover:border-border hover:bg-muted/30 cursor-pointer"
            : "border-border/50 bg-muted/20"
      }`}
      onClick={() =>
        isExternal && window.open(source.url, "_blank", "noopener")
      }
    >
      <div className="flex items-start gap-2">
        <span className="flex items-center justify-center w-5 h-5 rounded bg-primary/10 text-[9px] font-semibold text-primary flex-shrink-0 mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon name={typeIcon as any} className={`h-3 w-3 ${typeColor}`} />
            {isExternal && (
              <img
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                className="w-3.5 h-3.5"
                alt=""
              />
            )}
            <span className="text-[10px] text-muted-foreground truncate">
              {domain}
            </span>
          </div>
          <p className="font-medium text-foreground leading-snug line-clamp-2">
            {source.title}
          </p>
          {source.snippet && (
            <p className="text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {source.snippet.slice(0, 120)}
              {(source.snippet?.length ?? 0) > 120 ? "..." : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
