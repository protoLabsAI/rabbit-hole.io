"use client";

import type { UIMessage } from "ai";
import { useState, useCallback } from "react";

import { Icon } from "@proto/icon-system";
import { MarkdownContent } from "@proto/ui/organisms";

const TOOL_ICONS: Record<string, string> = {
  searchGraph: "Database",
  searchWeb: "Globe",
  searchWikipedia: "BookOpen",
  ingestEntities: "Plus",
};

const TOOL_LABELS: Record<string, string> = {
  searchGraph: "Searching knowledge graph",
  searchWeb: "Searching the web",
  searchWikipedia: "Reading Wikipedia",
  ingestEntities: "Adding to knowledge graph",
};

function ToolCallCard({
  toolName,
  input,
  output,
  state,
}: {
  toolName: string;
  input?: any;
  output?: any;
  state: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const icon = TOOL_ICONS[toolName] || "Wrench";
  const label = TOOL_LABELS[toolName] || toolName;
  const isRunning =
    state === "partial-call" ||
    state === "call" ||
    state === "input-streaming" ||
    state === "input-available";
  const isDone = state === "result" || state === "output-available";

  // Summarize output
  let summary = "";
  if (isDone && output) {
    if (toolName === "searchGraph" && Array.isArray(output)) {
      summary = `Found ${output.length} entities`;
    } else if (toolName === "searchWeb" && output?.results) {
      summary = `Found ${output.results.length} sources`;
    } else if (toolName === "searchWikipedia" && output?.title) {
      summary = `Read: ${output.title}`;
    } else if (toolName === "ingestEntities" && output?.entitiesIngested) {
      summary = `Added ${output.entitiesIngested} entities`;
    }
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {isRunning ? (
          <Icon
            name="Loader2"
            className="h-3.5 w-3.5 animate-spin text-primary"
          />
        ) : (
          <Icon name={icon as any} className="h-3.5 w-3.5" />
        )}
        <span className="font-medium">{label}</span>
        {summary && (
          <span className="text-muted-foreground/60 ml-1">— {summary}</span>
        )}
        <Icon
          name={expanded ? "ChevronUp" : "ChevronDown"}
          className="h-3 w-3 ml-auto"
        />
      </button>
      {expanded && output && (
        <div className="px-3 pb-2 border-t border-border/50">
          <pre className="text-[10px] text-muted-foreground overflow-auto max-h-40 mt-1.5">
            {JSON.stringify(output, null, 2).slice(0, 2000)}
          </pre>
        </div>
      )}
    </div>
  );
}

interface ChatMessageProps {
  message: UIMessage;
  isStreaming: boolean;
  isLast: boolean;
  onIngest?: (text: string) => void;
}

export function ChatMessage({
  message,
  isStreaming,
  isLast,
  onIngest,
}: ChatMessageProps) {
  const [ingesting, setIngesting] = useState(false);

  const handleIngest = useCallback(async () => {
    if (!onIngest) return;
    // Collect all text parts
    const text = (message.parts ?? [])
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n");
    if (text.length < 20) return;
    setIngesting(true);
    onIngest(text);
    setTimeout(() => setIngesting(false), 3000);
  }, [message, onIngest]);

  if (message.role === "user") {
    const text = (message.parts ?? [])
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
    return (
      <div className="pb-4">
        <h2 className="text-xl font-semibold text-foreground">{text}</h2>
      </div>
    );
  }

  // Assistant message — render parts
  const parts = message.parts ?? [];
  const textContent = parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");

  const toolParts = parts.filter(
    (p) =>
      p.type.startsWith("tool-") &&
      p.type !== "tool-invocation" &&
      "toolName" in p
  );

  // Also check for generic tool-invocation type
  const toolInvocations = parts.filter(
    (p): p is any => p.type === "tool-invocation"
  );

  const allTools = [...toolParts, ...toolInvocations] as any[];
  const isComplete = !isStreaming || !isLast;

  return (
    <div className="space-y-3 pb-6 border-b border-border/50 last:border-0">
      {/* Tool calls */}
      {allTools.length > 0 && (
        <div className="space-y-1.5">
          {allTools.map((t: any, i: number) => (
            <ToolCallCard
              key={t.toolCallId || i}
              toolName={t.toolName}
              input={t.input ?? t.args}
              output={t.output ?? t.result}
              state={t.state ?? "result"}
            />
          ))}
        </div>
      )}

      {/* Answer text */}
      {textContent && (
        <div className="rounded-xl border border-border bg-card/50 p-4 sm:p-6">
          <MarkdownContent content={textContent} />
          {isStreaming && isLast && (
            <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
          )}
        </div>
      )}

      {/* Actions — only show when message is complete */}
      {isComplete && textContent && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const url = window.location.href;
              if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(textContent);
              }
            }}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
          >
            <Icon name="Copy" className="h-3 w-3" />
            Copy
          </button>
          {onIngest && (
            <button
              onClick={handleIngest}
              disabled={ingesting}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50 disabled:opacity-50"
            >
              <Icon
                name={ingesting ? "Loader2" : "DatabaseZap"}
                className={`h-3 w-3 ${ingesting ? "animate-spin" : ""}`}
              />
              {ingesting ? "Adding..." : "Add to Knowledge Graph"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
