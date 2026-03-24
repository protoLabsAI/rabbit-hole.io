"use client";

import { useState, useEffect, useRef } from "react";

import { Icon } from "@proto/icon-system";

import { ChatMarkdown } from "./ChatMarkdown";

// ─── Reasoning Block ────────────────────────────────────────────────

interface ReasoningBlockProps {
  content: string;
  isStreaming: boolean;
  duration?: number;
}

export function ReasoningBlock({
  content,
  isStreaming,
  duration,
}: ReasoningBlockProps) {
  const [expanded, setExpanded] = useState(isStreaming);
  const wasStreaming = useRef(isStreaming);

  // Auto-expand when streaming starts, auto-collapse when it ends
  useEffect(() => {
    if (isStreaming) {
      setExpanded(true);
    } else if (wasStreaming.current && !isStreaming) {
      // Streaming just finished — collapse
      setExpanded(false);
    }
    wasStreaming.current = isStreaming;
  }, [isStreaming]);

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Icon
          name="Brain"
          className={`h-3.5 w-3.5 flex-shrink-0 ${
            isStreaming ? "text-primary" : "text-muted-foreground/70"
          }`}
        />

        {isStreaming ? (
          <span className="font-medium reasoning-shimmer">Thinking...</span>
        ) : (
          <span className="font-medium">
            Thought for{" "}
            {duration != null ? `${duration.toFixed(1)}s` : "a moment"}
          </span>
        )}

        <Icon
          name={expanded ? "ChevronUp" : "ChevronDown"}
          className="h-3 w-3 ml-auto opacity-40"
        />
      </button>

      {/* Content */}
      {expanded && content && (
        <div className="px-3 pb-3 text-xs text-muted-foreground/80 border-t border-border/30">
          <div className="pt-2">
            <ChatMarkdown content={content} isStreaming={isStreaming} />
          </div>
        </div>
      )}
    </div>
  );
}
