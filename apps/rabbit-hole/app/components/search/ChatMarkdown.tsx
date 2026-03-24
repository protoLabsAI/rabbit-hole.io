"use client";

/**
 * ChatMarkdown — Streaming-safe markdown renderer with inline citations.
 * Uses streamdown for streaming-optimized rendering with word-by-word animation.
 * Ported from @protolabsai/ui/ai ChatMessageMarkdown.
 */

import { useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";

import { CodeBlock } from "./CodeBlock";

// ── Types ────────────────────────────────────────────────────────────

interface Source {
  title: string;
  url: string;
  type?: string;
  snippet?: string;
}

// ── Prose classes — exact match with ava ─────────────────────────────

// Optimized for prolonged reading (Kindle/Medium/Apple Books research):
// - prose base (16px) not prose-sm (14px) — every reading app uses 16-20px
// - line-height 1.5-1.6 via leading-relaxed
// - -0.003em letter-spacing (Medium's value)
// - 1.5em paragraph spacing
// - antialiased font smoothing
const PROSE_CLASSES = [
  "prose dark:prose-invert max-w-none",
  "antialiased",
  "tracking-[-0.003em]",
  "prose-p:mt-0 prose-p:mb-[1.5em] prose-p:leading-[1.6]",
  "prose-h1:text-xl prose-h1:font-semibold prose-h1:mt-8 prose-h1:mb-4 prose-h1:tracking-[-0.015em]",
  "prose-h2:text-lg prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-3 prose-h2:tracking-[-0.01em]",
  "prose-h3:text-base prose-h3:font-medium prose-h3:mt-5 prose-h3:mb-2",
  "prose-h4:text-sm prose-h4:font-medium prose-h4:uppercase prose-h4:tracking-wide prose-h4:text-muted-foreground prose-h4:mt-4 prose-h4:mb-2",
  "prose-ul:my-4 prose-ol:my-4 prose-ul:pl-6 prose-ol:pl-6",
  "prose-li:my-2 prose-li:leading-[1.6]",
  "[&_li_ul]:my-1 [&_li_ol]:my-1 [&_li_li]:my-1",
  "prose-blockquote:border-l-2 prose-blockquote:border-primary/30",
  "prose-blockquote:pl-4 prose-blockquote:py-1 prose-blockquote:my-4",
  "prose-blockquote:not-italic prose-blockquote:text-muted-foreground",
  "prose-hr:my-6 prose-hr:border-border/40",
  "prose-strong:font-semibold",
  "[&_li:has(>input[type=checkbox])]:list-none [&_li:has(>input[type=checkbox])]:pl-0",
  "[&_input[type=checkbox]]:mr-1.5 [&_input[type=checkbox]]:accent-primary",
].join(" ");

// ── Helpers ──────────────────────────────────────────────────────────

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in (node as object)) {
    const el = node as React.ReactElement<{ children?: React.ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

/** Convert [1], [2] etc. to markdown links for citation rendering */
function preprocessCitations(text: string): string {
  // Match [N] not followed by ( (which would be a markdown link)
  return text.replace(/\[(\d{1,3})\](?!\()/g, "[$1](#cite-$1)");
}

// ── Citation Badge ───────────────────────────────────────────────────

function CitationBadge({ index, source }: { index: number; source?: Source }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const domain = source?.url
    ? (() => {
        try {
          return new URL(source.url).hostname.replace("www.", "");
        } catch {
          return "";
        }
      })()
    : "";

  return (
    <span className="relative inline-block align-baseline">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={(e) => {
          e.preventDefault();
          if (source?.url && !source.url.startsWith("#")) {
            window.open(source.url, "_blank");
          }
        }}
        className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-0.5 text-[9px] font-semibold bg-primary/10 text-primary rounded-full align-super cursor-pointer hover:bg-primary/20 transition-colors"
      >
        {index}
      </button>
      {showTooltip && source && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-card border border-border rounded-lg shadow-lg text-xs z-50 pointer-events-none block">
          <span className="flex items-center gap-2 mb-1">
            {domain && !source.url.startsWith("#") && (
              <img
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                className="w-4 h-4 flex-shrink-0"
                alt=""
              />
            )}
            <span className="font-medium truncate text-foreground">
              {source.title}
            </span>
          </span>
          {domain && (
            <span className="text-[10px] text-muted-foreground">{domain}</span>
          )}
          {source.snippet && (
            <span className="mt-1.5 text-muted-foreground line-clamp-3 leading-relaxed block">
              {source.snippet.slice(0, 150)}
              {(source.snippet.length ?? 0) > 150 ? "..." : ""}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

// ── Component ────────────────────────────────────────────────────────

interface ChatMarkdownProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
  sources?: Source[];
}

export function ChatMarkdown({
  content,
  isStreaming,
  className,
  sources,
}: ChatMarkdownProps) {
  // Pre-process citations if sources are provided
  const processedContent = useMemo(
    () => (sources?.length ? preprocessCitations(content) : content),
    [content, sources?.length]
  );

  // Stable components object — prevent re-creation during streaming
  const components = useMemo(
    () => ({
      // Links + Citation badges
      a: ({
        href,
        children,
        node: _node,
        ...props
      }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
        node?: unknown;
      }) => {
        // Citation link — render as badge
        if (href?.startsWith("#cite-")) {
          const index = parseInt(href.replace("#cite-", ""), 10);
          const source = sources?.[index - 1];
          return <CitationBadge index={index} source={source} />;
        }

        // Regular link
        return (
          <a
            {...props}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {children}
          </a>
        );
      },

      // Code blocks — intercept <pre> for CodeBlock
      pre: ({
        children,
        node: _node,
        ...rest
      }: React.HTMLAttributes<HTMLPreElement> & { node?: unknown }) => {
        const codeEl = children as React.ReactElement<{
          className?: string;
          children?: React.ReactNode;
        }> | null;

        if (codeEl && typeof codeEl === "object" && "props" in codeEl) {
          const codeProps = codeEl.props;
          const langMatch = codeProps.className?.match(/language-(\w+)/);
          const language = langMatch?.[1];
          const code = extractText(codeProps.children);
          return (
            <CodeBlock
              code={code}
              language={language}
              isStreaming={isStreaming}
            />
          );
        }
        return (
          <pre
            {...rest}
            className="my-2 overflow-x-auto rounded-md bg-background/50 p-3 text-xs"
          >
            {children}
          </pre>
        );
      },

      // Inline code
      code: ({
        className: codeClassName,
        children: codeChildren,
        node: _node,
        ...props
      }: React.HTMLAttributes<HTMLElement> & { node?: unknown }) => {
        if (codeClassName?.startsWith("language-")) {
          return (
            <code {...props} className={codeClassName}>
              {codeChildren}
            </code>
          );
        }
        return (
          <code
            {...props}
            className="rounded bg-background/50 px-1 py-0.5 font-mono text-xs"
          >
            {codeChildren}
          </code>
        );
      },

      // Tables
      table: ({
        children,
        node: _node,
        ...rest
      }: React.HTMLAttributes<HTMLTableElement> & { node?: unknown }) => (
        <table
          {...rest}
          className="my-2 w-full border-collapse text-xs"
        >
          {children}
        </table>
      ),
      thead: ({
        children,
        node: _node,
        ...rest
      }: React.HTMLAttributes<HTMLTableSectionElement> & {
        node?: unknown;
      }) => (
        <thead {...rest} className="border-b border-border/60">
          {children}
        </thead>
      ),
      th: ({
        children,
        node: _node,
        ...rest
      }: React.HTMLAttributes<HTMLTableCellElement> & { node?: unknown }) => (
        <th
          {...rest}
          className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground"
        >
          {children}
        </th>
      ),
      td: ({
        children,
        node: _node,
        ...rest
      }: React.HTMLAttributes<HTMLTableCellElement> & { node?: unknown }) => (
        <td
          {...rest}
          className="border-t border-border/30 px-2 py-1 text-xs"
        >
          {children}
        </td>
      ),

      // HR
      hr: ({ node: _node, ...rest }: { node?: unknown } & React.HTMLAttributes<HTMLHRElement>) => (
        <hr {...rest} className="my-4 border-border/40" />
      ),

      // Strikethrough
      del: ({
        children,
        node: _node,
        ...rest
      }: React.HTMLAttributes<HTMLModElement> & { node?: unknown }) => (
        <del {...rest} className="opacity-60 line-through">
          {children}
        </del>
      ),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sources, isStreaming]
  );

  return (
    <div className={`${PROSE_CLASSES} ${className ?? ""}`}>
      <Streamdown
        components={components}
        mode={isStreaming ? "streaming" : "static"}
        isAnimating={isStreaming}
        animated={
          isStreaming
            ? { animation: "fadeIn", sep: "word", duration: 80, stagger: 20 }
            : false
        }
        caret={isStreaming ? "block" : undefined}
        controls={false}
        lineNumbers={false}
      >
        {processedContent}
      </Streamdown>
    </div>
  );
}
