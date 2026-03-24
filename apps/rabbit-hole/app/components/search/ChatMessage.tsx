"use client";

import type { UIMessage } from "ai";
import { useState, useCallback, useMemo } from "react";

import { Icon } from "@proto/icon-system";
import { Badge } from "@proto/ui/atoms";

import { ChatMarkdown } from "./ChatMarkdown";
import { ReasoningBlock } from "./ReasoningBlock";

// ─── Extraction Preview Types ────────────────────────────────────────

/** Matches ExtractionPreview from @proto/research-middleware */
interface ExtractionPreview {
  entities: Array<{ uid: string; type: string; name: string }>;
  relationships: Array<{ uid: string; type: string; source: string; target: string }>;
  evidence: string[];
  citations: string[];
  confidence: number;
}

// ─── Add to Graph Card ───────────────────────────────────────────────

/**
 * Renders a pre-computed extraction preview as an "Add to Graph" card.
 * The extraction was produced by the middleware using the full research context.
 * User must explicitly confirm to ingest — extraction is never auto-ingested.
 */
function ExtractionPreviewCard({
  preview,
  onConfirm,
}: {
  preview: ExtractionPreview;
  onConfirm: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [ingesting, setIngesting] = useState(false);

  const handleConfirm = () => {
    if (confirmed || ingesting) return;
    setIngesting(true);
    onConfirm();
    setTimeout(() => {
      setIngesting(false);
      setConfirmed(true);
    }, 1500);
  };

  const topEntities = preview.entities.slice(0, 5);

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <Icon name="DatabaseZap" className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Knowledge Graph Extraction Ready</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{preview.entities.length} entities</span>
          <span className="text-border">·</span>
          <span>{preview.relationships.length} relationships</span>
          <span className="text-border">·</span>
          <span>{Math.round(preview.confidence * 100)}% confidence</span>
        </div>
      </div>

      {topEntities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topEntities.map((entity) => (
            <div
              key={entity.uid}
              className="flex items-center gap-1 bg-background/80 border border-border/50 rounded-md px-2 py-0.5"
            >
              <span className="text-[11px] font-medium text-foreground">
                {entity.name}
              </span>
              <Badge variant="secondary" className="text-[9px] font-normal">
                {entity.type}
              </Badge>
            </div>
          ))}
          {preview.entities.length > 5 && (
            <span className="text-[10px] text-muted-foreground self-center">
              +{preview.entities.length - 5} more
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleConfirm}
          disabled={confirmed || ingesting}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
            confirmed
              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 cursor-default"
              : "bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
          }`}
        >
          <Icon
            name={confirmed ? "Check" : ingesting ? "Loader2" : "DatabaseZap"}
            className={`h-3.5 w-3.5 ${ingesting ? "animate-spin" : ""}`}
          />
          {confirmed ? "Added to Graph" : ingesting ? "Adding..." : "Add to Knowledge Graph"}
        </button>
        <p className="text-[10px] text-muted-foreground">
          Extracted from full research context — higher quality than manual ingest
        </p>
      </div>
    </div>
  );
}

// ─── Sub-Query Plan Card ─────────────────────────────────────────────

/**
 * Renders the decomposed research plan as a compact nested card.
 * Used when the agent returns a `subquery_plan` tool result.
 */
function SubQueryPlanCard({
  subQueries,
  originalQuery,
}: {
  subQueries: string[];
  originalQuery?: string;
}) {
  return (
    <div className="rounded-lg border border-secondary/30 bg-secondary/5 px-4 py-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-secondary-foreground/80">
        <Icon name="GitBranch" className="h-3.5 w-3.5 flex-shrink-0" />
        <span>Researching {subQueries.length} sub-topics</span>
        {originalQuery && (
          <span className="text-muted-foreground font-normal truncate max-w-[200px]">
            — {originalQuery}
          </span>
        )}
      </div>
      <ol className="space-y-1">
        {subQueries.map((q, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-xs text-foreground/80"
          >
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-secondary/20 text-[10px] flex items-center justify-center font-medium">
              {i + 1}
            </span>
            <span className="leading-snug">{q}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Clarification Card ─────────────────────────────────────────────

/**
 * Renders a clarification question as a distinct interactive card.
 * Used when the agent returns a `clarification_requested` tool result.
 */
function ClarificationCard({ question }: { question: string }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-primary/80">
        <Icon name="HelpCircle" className="h-3.5 w-3.5 flex-shrink-0" />
        <span>Clarification needed</span>
      </div>
      <p className="text-sm text-foreground leading-snug">{question}</p>
      <p className="text-[11px] text-muted-foreground">
        Type your answer in the input below to continue.
      </p>
    </div>
  );
}

// ─── Tool Card Config ───────────────────────────────────────────────

const TOOL_CONFIG: Record<
  string,
  { icon: string; label: string; activeLabel: string }
> = {
  searchGraph: {
    icon: "Database",
    label: "Knowledge Graph",
    activeLabel: "Searching knowledge graph...",
  },
  searchWeb: {
    icon: "Globe",
    label: "Web Search",
    activeLabel: "Searching the web...",
  },
  searchWikipedia: {
    icon: "BookOpen",
    label: "Wikipedia",
    activeLabel: "Reading Wikipedia...",
  },
  askClarification: {
    icon: "HelpCircle",
    label: "Clarification",
    activeLabel: "Asking for clarification...",
  },
};

// ─── Rich Tool Output Renderers ─────────────────────────────────────

function GraphResults({ output }: { output: any[] }) {
  if (!Array.isArray(output) || output.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-1.5">
      {output.slice(0, 8).map((e: any, i: number) => (
        <div
          key={e.uid || i}
          className="flex items-center gap-1.5 bg-background/80 border border-border/50 rounded-md px-2 py-1"
        >
          <span className="text-[11px] font-medium text-foreground">
            {e.name}
          </span>
          <Badge variant="secondary" className="text-[9px] font-normal">
            {e.type}
          </Badge>
          {e.relationshipCount > 0 && (
            <span className="text-[9px] text-muted-foreground">
              {e.relationshipCount} links
            </span>
          )}
        </div>
      ))}
      {output.length > 8 && (
        <span className="text-[10px] text-muted-foreground self-center">
          +{output.length - 8} more
        </span>
      )}
    </div>
  );
}

function WebResults({ output }: { output: any }) {
  const results = output?.results;
  if (!Array.isArray(results) || results.length === 0) return null;
  return (
    <div className="space-y-1 pt-1.5">
      {results.slice(0, 4).map((r: any, i: number) => (
        <a
          key={r.url || i}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[11px] hover:text-primary transition-colors"
        >
          <img
            src={`https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}&sz=16`}
            alt=""
            className="w-3 h-3 flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="text-foreground/80 truncate">{r.title}</span>
          <Icon
            name="ExternalLink"
            className="h-2.5 w-2.5 text-muted-foreground/50 flex-shrink-0"
          />
        </a>
      ))}
    </div>
  );
}

function WikiResult({ output }: { output: any }) {
  if (!output?.title) return null;
  return (
    <div className="pt-1.5">
      <a
        href={output.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-[11px] hover:text-primary transition-colors"
      >
        <Icon name="BookOpen" className="h-3 w-3 text-muted-foreground" />
        <span className="text-foreground/80">{output.title}</span>
        <span className="text-muted-foreground/50">
          ({(output.text?.length || 0).toLocaleString()} chars)
        </span>
      </a>
    </div>
  );
}

// ─── Tool Call Card ─────────────────────────────────────────────────

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
  const [expanded, setExpanded] = useState(true);
  const config = TOOL_CONFIG[toolName] || {
    icon: "Wrench",
    label: toolName,
    activeLabel: `Running ${toolName}...`,
  };

  // Render clarification results as a distinct interactive card
  const isDoneState = state === "result" || state === "output-available";
  if (
    isDoneState &&
    output?.__type === "clarification_requested" &&
    typeof output.question === "string"
  ) {
    return <ClarificationCard question={output.question} />;
  }

  // Render sub-query plan as a nested research progress card
  if (
    isDoneState &&
    output?.__type === "subquery_plan" &&
    Array.isArray(output.subQueries)
  ) {
    return (
      <SubQueryPlanCard
        subQueries={output.subQueries as string[]}
        originalQuery={
          typeof output.originalQuery === "string"
            ? output.originalQuery
            : undefined
        }
      />
    );
  }
  const isStreaming = state === "partial-call" || state === "input-streaming";
  const isRunning = state === "call" || state === "input-available";
  const isDone = state === "result" || state === "output-available";
  const isError = state === "error";
  const isActive = isStreaming || isRunning;

  // Status badge
  const statusBadge = isStreaming
    ? { label: "streaming", color: "text-blue-400 bg-blue-400/10" }
    : isRunning
      ? { label: "running", color: "text-primary bg-primary/10" }
      : isError
        ? { label: "error", color: "text-destructive bg-destructive/10" }
        : isDone
          ? { label: "done", color: "text-green-500 bg-green-500/10" }
          : null;

  let summary = "";
  if (isDone && output) {
    if (toolName === "searchGraph" && Array.isArray(output)) {
      summary = `${output.length} entities`;
    } else if (toolName === "searchWeb" && output?.results) {
      summary = `${output.results.length} sources`;
    } else if (toolName === "searchWikipedia" && output?.title) {
      summary = output.title;
    }
  }

  // Rich output renderer
  const renderOutput = () => {
    if (!isDone || !output) return null;
    if (toolName === "searchGraph") return <GraphResults output={output} />;
    if (toolName === "searchWeb") return <WebResults output={output} />;
    if (toolName === "searchWikipedia") return <WikiResult output={output} />;
    return null;
  };

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {isActive ? (
          <Icon name="Loader2" className="h-3 w-3 animate-spin text-primary" />
        ) : isError ? (
          <Icon name="AlertCircle" className="h-3 w-3 text-destructive" />
        ) : (
          <Icon
            name={config.icon as any}
            className="h-3 w-3 text-muted-foreground/70"
          />
        )}
        <span className="font-medium">
          {isActive ? config.activeLabel : config.label}
        </span>
        {statusBadge && (
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${statusBadge.color}`}>
            {statusBadge.label}
          </span>
        )}
        {summary && !isActive && (
          <span className="text-muted-foreground/50">— {summary}</span>
        )}
        {input?.query && isActive && (
          <span className="text-primary/60 italic truncate max-w-[200px]">
            &quot;{input.query}&quot;
          </span>
        )}
        <Icon
          name={expanded ? "ChevronUp" : "ChevronDown"}
          className="h-3 w-3 ml-auto opacity-40"
        />
      </button>
      {expanded && renderOutput()}
    </div>
  );
}

// ─── Chat Message ───────────────────────────────────────────────────

// ─── Extract follow-up suggestions from answer text ─────────────────

/**
 * Extract related searches from the structured <RELATED_SEARCHES> block.
 * Falls back to scanning the last few lines if no block is found.
 */
function extractSuggestions(text: string): string[] {
  if (!text) return [];

  // Try structured block first
  const blockMatch = text.match(
    /<RELATED_SEARCHES>\s*\n([\s\S]*?)\n\s*<\/RELATED_SEARCHES>/
  );
  if (blockMatch) {
    return blockMatch[1]
      .split("\n")
      .map((l) => l.replace(/^[-*•\d.)\s`]+/, "").replace(/`+$/, "").trim())
      .filter((l) => l.length > 3 && l.length < 120)
      .slice(0, 3);
  }

  // Fallback: scan last lines for "Related searches:" section
  const relatedIdx = text.lastIndexOf("Related searches:");
  if (relatedIdx !== -1) {
    const tail = text.slice(relatedIdx + "Related searches:".length);
    return tail
      .split("\n")
      .map((l) => l.replace(/^[-*•\d.)\s`]+/, "").replace(/`+$/, "").trim())
      .filter((l) => l.length > 3 && l.length < 120)
      .slice(0, 3);
  }

  return [];
}

/**
 * Strip the related searches section from the response text so it
 * doesn't render as ugly markdown. The searches are displayed as
 * clickable SuggestionPills instead.
 */
function stripRelatedSearches(text: string): string {
  if (!text) return text;
  // Strip complete structured block
  let cleaned = text.replace(
    /<RELATED_SEARCHES>\s*\n[\s\S]*?\n\s*<\/RELATED_SEARCHES>\s*/,
    ""
  );
  // Strip partial block (streaming — closing tag hasn't arrived yet)
  cleaned = cleaned.replace(/<RELATED_SEARCHES>[\s\S]*$/, "");
  // Strip "Related searches:" freeform section at end
  cleaned = cleaned.replace(
    /\n*(?:#{0,3}\s*)?Related searches:?\s*\n[\s\S]*$/i,
    ""
  );
  return cleaned.trimEnd();
}

// ─── Sources Summary ────────────────────────────────────────────────

function SourcesSummary({
  sources,
}: {
  sources: Array<{ title: string; url: string; type: string; snippet?: string }>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="pt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/70 hover:text-foreground transition-colors"
      >
        <Icon name="BookOpen" className="h-3 w-3" />
        <span>
          Used {sources.length} source{sources.length !== 1 ? "s" : ""}
        </span>
        <Icon
          name="ChevronDown"
          className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="mt-2 space-y-1.5">
          {sources.map((s, i) => {
            let domain = "";
            try {
              domain = new URL(s.url).hostname.replace(/^www\./, "");
            } catch {
              /* ignore */
            }
            return (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors group"
              >
                {domain && (
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                    className="w-4 h-4 flex-shrink-0 rounded-sm"
                    alt=""
                  />
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-foreground group-hover:text-primary truncate block">
                    {s.title}
                  </span>
                  {domain && (
                    <span className="text-[10px] text-muted-foreground/50">
                      {domain}
                    </span>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Suggestion Pills ───────────────────────────────────────────────

function SuggestionPills({
  suggestions,
  onSelect,
}: {
  suggestions: string[];
  onSelect: (q: string) => void;
}) {
  if (suggestions.length === 0) return null;
  return (
    <div className="flex gap-2 pt-2 overflow-x-auto scrollbar-none pb-1">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors whitespace-nowrap flex-shrink-0"
        >
          <Icon name="Search" className="h-3 w-3" />
          {s}
        </button>
      ))}
    </div>
  );
}

// ─── Chat Message ───────────────────────────────────────────────────

interface ChatMessageProps {
  message: UIMessage;
  isStreaming: boolean;
  isLast: boolean;
  onIngest?: (text: string) => void;
  /** Called when the user confirms ingestion of the pre-computed extraction preview. */
  onIngestBundle?: (preview: ExtractionPreview) => void;
  onFollowUp?: (query: string) => void;
  onRegenerate?: () => void;
}

export function ChatMessage({
  message,
  isStreaming,
  isLast,
  onIngest,
  onIngestBundle,
  onFollowUp,
  onRegenerate,
}: ChatMessageProps) {
  const [ingesting, setIngesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const handleIngest = useCallback(async () => {
    if (!onIngest) return;
    const text = (message.parts ?? [])
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n");
    if (text.length < 20) return;
    setIngesting(true);
    onIngest(text);
    setTimeout(() => setIngesting(false), 3000);
  }, [message, onIngest]);

  const handleCopy = useCallback(() => {
    const text = (message.parts ?? [])
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message]);

  // User message — stands out with left accent bar
  if (message.role === "user") {
    const text = (message.parts ?? [])
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
    return (
      <div className="flex items-start gap-3 pt-4 first:pt-0">
        <div className="w-0.5 self-stretch rounded-full bg-primary/40 flex-shrink-0" />
        <h2 className="text-lg font-semibold text-foreground leading-snug py-1">
          {text}
        </h2>
      </div>
    );
  }

  // Assistant message
  const parts = message.parts ?? [];
  const textContent = parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");

  // Extraction preview: read from message annotations (populated by the server
  // after afterAgent completes). The server writes this as a data annotation via
  // the middleware pipeline; the user must explicitly confirm to ingest.
  const extractionPreview = (message.annotations ?? []).find(
    (a): a is ExtractionPreview & { type: string } =>
      typeof a === "object" &&
      a !== null &&
      !Array.isArray(a) &&
      (a as Record<string, unknown>)["type"] === "extraction_preview"
  ) as ExtractionPreview | undefined;

  // Reasoning annotation: rendered as a collapsible "thinking" block when the
  // model uses extended thinking. The server writes this as an annotation with
  // { type: "reasoning", content: string, duration?: number }.
  const reasoningAnnotation = (message.annotations ?? []).find(
    (a): a is { type: "reasoning"; content: string; duration?: number } =>
      typeof a === "object" &&
      a !== null &&
      !Array.isArray(a) &&
      (a as Record<string, unknown>)["type"] === "reasoning" &&
      typeof (a as Record<string, unknown>)["content"] === "string"
  ) as { type: "reasoning"; content: string; duration?: number } | undefined;

  // Collect all tool-related parts
  const allTools = parts.filter(
    (p): p is any =>
      p.type === "tool-invocation" ||
      (p.type.startsWith("tool-") && "toolName" in p)
  );

  // Extract sources from tool results for citation badges
  const sources = useMemo(() => {
    const result: Array<{ title: string; url: string; type: "web" | "wikipedia" | "graph"; snippet?: string }> = [];
    for (const t of allTools) {
      const output = t.output ?? t.result;
      if (!output) continue;
      if (t.toolName === "searchWeb" && Array.isArray(output.results)) {
        for (const r of output.results) {
          if (r.url && r.title) {
            result.push({ title: r.title, url: r.url, type: "web", snippet: r.snippet });
          }
        }
      } else if (t.toolName === "searchWikipedia" && output.url && output.title) {
        result.push({ title: output.title, url: output.url, type: "wikipedia", snippet: output.text?.slice(0, 200) });
      }
    }
    return result;
  }, [allTools]);

  // Extract graph entity UIDs from searchGraph results for "View in Atlas" CTA
  const graphEntities = useMemo(() => {
    const uids: string[] = [];
    for (const t of allTools) {
      if (t.toolName === "searchGraph") {
        const output = t.output ?? t.result;
        if (Array.isArray(output)) {
          for (const entity of output) {
            if (entity?.uid) uids.push(entity.uid);
          }
        }
      }
    }
    return uids;
  }, [allTools]);

  const isComplete = !isStreaming || !isLast;

  return (
    <div className="space-y-3 pb-2">
      {/* Reasoning — collapsible thinking indicator */}
      {reasoningAnnotation && (
        <ReasoningBlock
          content={reasoningAnnotation.content}
          isStreaming={isStreaming && isLast}
          duration={reasoningAnnotation.duration}
        />
      )}

      {/* Tool calls — compact cards */}
      {allTools.length > 0 && (
        <div className="space-y-1">
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

      {/* Answer */}
      {textContent && (
        <div>
          <ChatMarkdown
            content={stripRelatedSearches(textContent)}
            isStreaming={isStreaming && isLast}
            sources={sources.length > 0 ? sources : undefined}
          />
          {isStreaming && isLast && (
            <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
          )}
        </div>
      )}

      {/* Sources summary — collapsible list */}
      {isComplete && sources.length > 0 && (
        <SourcesSummary sources={sources} />
      )}

      {/* Actions */}
      {isComplete && textContent && (
        <div className="flex items-center gap-0.5 pt-1">
          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-1.5 text-muted-foreground/60 hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
            title="Copy"
          >
            <Icon
              name={copied ? "Check" : "Copy"}
              className={`h-3.5 w-3.5 ${copied ? "text-green-500" : ""}`}
            />
          </button>

          {/* Regenerate */}
          {onRegenerate && isLast && (
            <button
              onClick={onRegenerate}
              className="p-1.5 text-muted-foreground/60 hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
              title="Regenerate"
            >
              <Icon name="RotateCcw" className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Thumbs up */}
          <button
            onClick={() => setFeedback(feedback === "up" ? null : "up")}
            className={`p-1.5 transition-colors rounded-md hover:bg-muted/50 ${
              feedback === "up"
                ? "text-green-500"
                : "text-muted-foreground/60 hover:text-foreground"
            }`}
            title="Good response"
          >
            <Icon name="ThumbsUp" className="h-3.5 w-3.5" />
          </button>

          {/* Thumbs down */}
          <button
            onClick={() => setFeedback(feedback === "down" ? null : "down")}
            className={`p-1.5 transition-colors rounded-md hover:bg-muted/50 ${
              feedback === "down"
                ? "text-red-500"
                : "text-muted-foreground/60 hover:text-foreground"
            }`}
            title="Poor response"
          >
            <Icon name="ThumbsDown" className="h-3.5 w-3.5" />
          </button>

          {/* Divider */}
          <div className="w-px h-4 bg-border/40 mx-1" />

          {/* Add to Knowledge Graph */}
          {onIngest && (
            <button
              onClick={handleIngest}
              disabled={ingesting}
              className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50 disabled:opacity-50"
            >
              <Icon
                name={ingesting ? "Loader2" : "DatabaseZap"}
                className={`h-3.5 w-3.5 ${ingesting ? "animate-spin" : ""}`}
              />
              {ingesting ? "Adding..." : "Add to Knowledge Graph"}
            </button>
          )}

          {/* View in Atlas — show when graph entities were found */}
          {graphEntities.length > 0 && (
            <a
              href={`/atlas?centerEntity=${graphEntities[0]}`}
              className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
            >
              <Icon name="Globe" className="h-3.5 w-3.5" />
              View in Atlas
            </a>
          )}
        </div>
      )}

      {/* Extraction Preview — "Add to Graph" card (pre-computed from full research context) */}
      {isComplete && extractionPreview && onIngestBundle && (
        <ExtractionPreviewCard
          preview={extractionPreview}
          onConfirm={() => onIngestBundle(extractionPreview)}
        />
      )}

      {/* Follow-up suggestions */}
      {isComplete && isLast && onFollowUp && (
        <SuggestionPills
          suggestions={extractSuggestions(textContent)}
          onSelect={onFollowUp}
        />
      )}

      {/* Loading state — waiting for first content */}
      {isStreaming && isLast && !textContent && allTools.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Icon name="Loader2" className="h-4 w-4 animate-spin text-primary" />
          <span>Thinking...</span>
        </div>
      )}
    </div>
  );
}
