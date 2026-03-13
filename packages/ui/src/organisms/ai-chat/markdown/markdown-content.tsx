/**
 * Markdown Content Component
 *
 * Renders markdown with syntax highlighting and proper styling
 */

"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { cn } from "../../../lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export const MarkdownContent = React.forwardRef<
  HTMLDivElement,
  MarkdownContentProps
>(({ content, className }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        // Headings
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-h1:text-xl prose-h1:mb-2 prose-h1:mt-3",
        "prose-h2:text-lg prose-h2:mb-1 prose-h2:mt-2",
        "prose-h3:text-base prose-h3:mb-1 prose-h3:mt-2",
        // Paragraphs and lists
        "prose-p:my-1 prose-p:leading-relaxed",
        "prose-ul:my-1 prose-ul:list-disc prose-ul:pl-4",
        "prose-ol:my-1 prose-ol:list-decimal prose-ol:pl-4",
        "prose-li:my-0.5",
        // Links
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        // Code
        "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-4 prose-pre:my-1",
        "prose-pre:overflow-x-auto",
        // Blockquotes
        "prose-blockquote:border-l-4 prose-blockquote:border-muted-foreground/30 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-1",
        // Tables
        "prose-table:my-1 prose-table:border-collapse",
        "prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-3 prose-th:py-2",
        "prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2",
        // Strong and emphasis
        "prose-strong:font-semibold prose-strong:text-foreground",
        "prose-em:italic",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom component renderers can be added here
          // For example, to handle links differently:
          a: (props) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

MarkdownContent.displayName = "MarkdownContent";
