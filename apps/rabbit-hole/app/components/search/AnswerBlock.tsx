"use client";

import { useState, useCallback } from "react";

import { Icon } from "@proto/icon-system";
import { MarkdownContent } from "@proto/ui/organisms";

import type { SearchPhase } from "../../hooks/useSearch";

interface AnswerBlockProps {
  answer: string;
  phase: SearchPhase;
}

export function AnswerBlock({ answer, phase }: AnswerBlockProps) {
  const [copied, setCopied] = useState(false);
  const isStreaming = phase === "answering" && answer.length > 0;
  const isDone =
    phase === "done" || (answer.length > 0 && phase !== "answering");

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [answer]);

  if (!answer && phase !== "answering") return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isStreaming && (
            <Icon
              name="Loader2"
              className="h-3.5 w-3.5 text-primary animate-spin"
            />
          )}
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Answer
          </h3>
        </div>
        {isDone && answer && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name={copied ? "Check" : "Copy"} className="h-3 w-3" />
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      <div className="rounded-xl border border-border bg-card/50 p-4 sm:p-6">
        {answer ? (
          <MarkdownContent content={answer} />
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon name="Loader2" className="h-4 w-4 animate-spin" />
            <span>Generating answer...</span>
          </div>
        )}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
        )}
      </div>
    </div>
  );
}
