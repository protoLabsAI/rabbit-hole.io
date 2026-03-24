"use client";

import type { UIMessage } from "ai";
import { useState, useCallback } from "react";

import { Icon } from "@proto/icon-system";
import { Badge } from "@proto/ui/atoms";

import { ChatMarkdown } from "./ChatMarkdown";

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
  const isRunning =
    state === "partial-call" ||
    state === "call" ||
    state === "input-streaming" ||
    state === "input-available";
  const isDone = state === "result" || state === "output-available";

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
        {isRunning ? (
          <Icon name="Loader2" className="h-3 w-3 animate-spin text-primary" />
        ) : (
          <Icon
            name={config.icon as any}
            className="h-3 w-3 text-muted-foreground/70"
          />
        )}
        <span className="font-medium">
          {isRunning ? config.activeLabel : config.label}
        </span>
        {summary && !isRunning && (
          <span className="text-muted-foreground/50">— {summary}</span>
        )}
        {input?.query && isRunning && (
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

function extractSuggestions(text: string): string[] {
  if (!text) return [];
  const lines = text.split("\n").filter((l) => l.trim());
  const suggestions: string[] = [];

  // Scan the last ~8 lines for search-query-style items
  // These are short phrases in list items at the end of the answer
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 8); i--) {
    const line = lines[i]
      .replace(/^[-*•\d.)\s]+/, "") // strip list markers
      .replace(/\*\*/g, "") // strip bold
      .replace(/^[""]|[""]$/g, "") // strip quotes
      .trim();
    // Match search queries: short phrases (not full sentences with periods mid-text)
    if (
      line.length > 5 &&
      line.length < 100 &&
      !line.startsWith("#") &&
      !line.startsWith("http") &&
      !line.includes(". ") // not a full sentence
    ) {
      suggestions.unshift(line);
    }
  }

  return suggestions.slice(0, 3);
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
    <div className="flex flex-wrap gap-2 pt-2">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors"
        >
          <Icon name="ArrowRight" className="h-3 w-3" />
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

  // Collect all tool-related parts
  const allTools = parts.filter(
    (p): p is any =>
      p.type === "tool-invocation" ||
      (p.type.startsWith("tool-") && "toolName" in p)
  );

  const isComplete = !isStreaming || !isLast;

  return (
    <div className="space-y-3 pb-2">
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
            content={textContent}
            isStreaming={isStreaming && isLast}
          />
          {isStreaming && isLast && (
            <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
          )}
        </div>
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
