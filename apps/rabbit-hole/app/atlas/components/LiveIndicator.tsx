"use client";

import { useState, useEffect, useRef } from "react";

interface LiveIndicatorProps {
  connected: boolean;
  recentEntityCount?: number;
}

export function LiveIndicator({
  connected,
  recentEntityCount,
}: LiveIndicatorProps) {
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (recentEntityCount && recentEntityCount > 0) {
      setVisibleCount(recentEntityCount);
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = setTimeout(() => {
        setVisibleCount(null);
      }, 2000);
    }
    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, [recentEntityCount]);

  return (
    <div className="absolute bottom-4 left-4 z-50 flex items-center gap-2">
      <div className="flex items-center gap-1.5 bg-card/95 backdrop-blur-md rounded-lg border border-border px-2.5 py-1.5 shadow-sm">
        <span className="relative flex h-2 w-2">
          {connected && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              connected ? "bg-emerald-500" : "bg-muted-foreground/40"
            }`}
          />
        </span>
        <span className="text-[11px] text-muted-foreground">
          {connected ? "Live" : "Disconnected"}
        </span>
      </div>
      <div
        className={`transition-all duration-300 overflow-hidden ${
          visibleCount ? "opacity-100 max-w-40" : "opacity-0 max-w-0"
        }`}
      >
        <div className="bg-card/95 backdrop-blur-md rounded-lg border border-border px-2.5 py-1.5 shadow-sm whitespace-nowrap">
          <span className="text-[11px] text-emerald-500 font-medium">
            +{visibleCount} entities
          </span>
        </div>
      </div>
    </div>
  );
}
