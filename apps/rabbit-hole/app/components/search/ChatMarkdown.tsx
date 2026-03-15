"use client";

/**
 * ChatMarkdown — Streaming-safe markdown renderer.
 * Ported from @protolabsai/ui/ai ChatMessageMarkdown.
 */

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CodeBlock } from "./CodeBlock";

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

// ── Component ────────────────────────────────────────────────────────

interface ChatMarkdownProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export function ChatMarkdown({
  content,
  isStreaming,
  className,
}: ChatMarkdownProps) {
  // Stable plugins — prevent re-mount during streaming
  const remarkPlugins = useMemo(() => [remarkGfm], []);

  return (
    <div className={`${PROSE_CLASSES} ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        components={{
          // Links
          a: ({ ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            />
          ),

          // Code blocks — intercept <pre> for CodeBlock
          pre: ({ children }) => {
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
              <pre className="my-2 overflow-x-auto rounded-md bg-background/50 p-3 text-xs">
                {children}
              </pre>
            );
          },

          // Inline code
          code: ({
            className: codeClassName,
            children: codeChildren,
            ...props
          }) => {
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
          table: ({ children }) => (
            <table className="my-2 w-full border-collapse text-xs">
              {children}
            </table>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-border/60">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-t border-border/30 px-2 py-1 text-xs">
              {children}
            </td>
          ),

          // HR
          hr: () => <hr className="my-4 border-border/40" />,

          // Strikethrough
          del: ({ children }) => (
            <del className="opacity-60 line-through">{children}</del>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
