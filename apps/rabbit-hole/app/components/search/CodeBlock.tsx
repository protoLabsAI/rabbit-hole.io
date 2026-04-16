"use client";

/**
 * CodeBlock — Syntax-highlighted code with language badge and copy button.
 * Ported from @protolabsai/ui/ai.
 */

import { useState, useEffect, useCallback } from "react";

import { Icon } from "@protolabsai/icon-system";

let prismInstance: typeof import("prismjs") | null = null;

async function getPrism(): Promise<typeof import("prismjs") | null> {
  if (prismInstance) return prismInstance;
  try {
    const Prism = (await import("prismjs")).default;
    Prism.manual = true;
    await Promise.allSettled([
      import("prismjs/components/prism-typescript" as string),
      import("prismjs/components/prism-javascript" as string),
      import("prismjs/components/prism-jsx" as string),
      import("prismjs/components/prism-tsx" as string),
      import("prismjs/components/prism-css" as string),
      import("prismjs/components/prism-json" as string),
      import("prismjs/components/prism-bash" as string),
      import("prismjs/components/prism-python" as string),
      import("prismjs/components/prism-sql" as string),
      import("prismjs/components/prism-yaml" as string),
      import("prismjs/components/prism-markdown" as string),
    ]);
    prismInstance = Prism;
    return Prism;
  } catch {
    return null;
  }
}

const LANG_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  py: "python",
  rb: "ruby",
  yml: "yaml",
};

function normaliseLang(lang: string): string {
  return LANG_ALIASES[lang.toLowerCase()] ?? lang.toLowerCase();
}

interface CodeBlockProps {
  code: string;
  language?: string;
  isStreaming?: boolean;
}

export function CodeBlock({ code, language, isStreaming }: CodeBlockProps) {
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const lang = language ? normaliseLang(language) : "";

  useEffect(() => {
    if (!lang || isStreaming) {
      setHighlighted(null);
      return;
    }
    let cancelled = false;
    getPrism().then((Prism) => {
      if (cancelled || !Prism) return;
      const grammar = Prism.languages[lang];
      if (!grammar) {
        setHighlighted(null);
        return;
      }
      try {
        setHighlighted(Prism.highlight(code, grammar, lang));
      } catch {
        setHighlighted(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [code, lang, isStreaming]);

  const handleCopy = useCallback(() => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  return (
    <div className="group/code relative my-2 overflow-hidden rounded-md bg-background/50">
      <div className="flex items-center justify-between border-b border-border/30 bg-muted/40 px-3 py-1">
        <span className="select-none text-[10px] font-medium uppercase tracking-wider text-muted-foreground opacity-70">
          {language ?? "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:bg-muted/60 hover:text-foreground group-hover/code:opacity-100"
        >
          <Icon name={copied ? "Check" : "Copy"} className="h-3 w-3" />
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed">
        {highlighted !== null ? (
          <code
            className={`language-${lang}`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        ) : (
          <code>{code}</code>
        )}
      </pre>
    </div>
  );
}
