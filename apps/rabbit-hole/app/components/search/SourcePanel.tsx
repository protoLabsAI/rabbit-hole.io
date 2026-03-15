"use client";

import { Icon } from "@proto/icon-system";

import type { Source } from "../../hooks/useSearch";

interface SourcePanelProps {
  sources: Source[];
  isOpen: boolean;
  onClose: () => void;
}

export function SourcePanel({ sources, isOpen, onClose }: SourcePanelProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      {/* Panel */}
      <div className="fixed top-0 right-0 z-50 h-full w-80 sm:w-96 bg-card border-l border-border shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">
            Sources ({sources.length})
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="X" className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sources.map((source, i) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-border bg-background p-3 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-medium text-primary">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {source.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {source.type === "wikipedia" ? (
                      <Icon
                        name="BookOpen"
                        className="h-3 w-3 text-muted-foreground"
                      />
                    ) : (
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=16`}
                        alt=""
                        className="w-3 h-3"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <span className="text-xs text-muted-foreground truncate">
                      {source.type === "wikipedia"
                        ? "Wikipedia"
                        : new URL(source.url).hostname.replace("www.", "")}
                    </span>
                    <Icon
                      name="ExternalLink"
                      className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0"
                    />
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
