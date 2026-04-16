"use client";

import { useState, useRef, useCallback, useEffect } from "react";

import { Icon } from "@protolabsai/icon-system";

// ─── Types ──────────────────────────────────────────────────────────

export type SearchMode = "search" | "deep-research" | "due-diligence";

export interface AttachedFile {
  name: string;
  size: number;
  mediaType: string;
  base64: string;
}

interface SearchInputProps {
  onSearch: (query: string, files?: AttachedFile[], mode?: SearchMode) => void;
  initialQuery?: string;
  size?: "large" | "normal";
  autoFocus?: boolean;
}

// ─── Slash Commands ─────────────────────────────────────────────────

const SLASH_COMMANDS: {
  command: SearchMode;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    command: "deep-research",
    label: "Deep Research",
    description: "Comprehensive multi-source research report",
    icon: "Microscope",
  },
  {
    command: "due-diligence",
    label: "Due Diligence",
    description: "Evidence-based validation and analysis",
    icon: "Scale",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────

const ACCEPTED_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/html",
  "audio/mpeg",
  "audio/wav",
  "audio/flac",
  "audio/ogg",
  "audio/mp4",
  "video/mp4",
  "video/quicktime",
  "image/png",
  "image/jpeg",
  "image/webp",
].join(",");

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const MODE_BADGES: Record<
  SearchMode,
  { label: string; icon: string; color: string }
> = {
  search: { label: "Search", icon: "Search", color: "" },
  "deep-research": {
    label: "Deep Research",
    icon: "Microscope",
    color:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  "due-diligence": {
    label: "Due Diligence",
    icon: "Scale",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
};

// ─── Component ──────────────────────────────────────────────────────

export function SearchInput({
  onSearch,
  initialQuery = "",
  size = "normal",
  autoFocus = false,
}: SearchInputProps) {
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<SearchMode>("search");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [commandFilter, setCommandFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commandsRef = useRef<HTMLDivElement>(null);

  // Filter commands based on what's typed after /
  const filteredCommands = SLASH_COMMANDS.filter((cmd) =>
    cmd.command.includes(commandFilter.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showCommands) return;
    const handleClick = (e: MouseEvent) => {
      if (
        commandsRef.current &&
        !commandsRef.current.contains(e.target as Node)
      ) {
        setShowCommands(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showCommands]);

  const selectCommand = useCallback((cmd: SearchMode) => {
    setMode(cmd);
    setQuery("");
    setShowCommands(false);
    setCommandFilter("");
    inputRef.current?.focus();
  }, []);

  const clearMode = useCallback(() => {
    setMode("search");
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed || files.length > 0) {
      onSearch(
        trimmed || `Analyze: ${files.map((f) => f.name).join(", ")}`,
        files.length > 0 ? files : undefined,
        mode !== "search" ? mode : undefined
      );
      setQuery("");
      setFiles([]);
      setMode("search");
    }
  }, [query, files, mode, onSearch]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setQuery(val);

      // Detect slash commands
      if (val === "/") {
        setShowCommands(true);
        setCommandFilter("");
        setSelectedIndex(0);
      } else if (val.startsWith("/") && !val.includes(" ")) {
        setShowCommands(true);
        setCommandFilter(val.slice(1));
        setSelectedIndex(0);
      } else {
        setShowCommands(false);
      }
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showCommands) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            selectCommand(filteredCommands[selectedIndex].command);
          }
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setShowCommands(false);
          setQuery("");
          return;
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }

      // Backspace on empty input clears mode
      if (e.key === "Backspace" && !query && mode !== "search") {
        clearMode();
      }
    },
    [
      showCommands,
      filteredCommands,
      selectedIndex,
      selectCommand,
      handleSubmit,
      query,
      mode,
      clearMode,
    ]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (!selectedFiles?.length) return;

      setUploading(true);
      const newFiles: AttachedFile[] = [];

      for (const file of Array.from(selectedFiles)) {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );
        newFiles.push({
          name: file.name,
          size: file.size,
          mediaType: file.type || "application/octet-stream",
          base64,
        });
      }

      setFiles((prev) => [...prev, ...newFiles]);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    []
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const isLarge = size === "large";
  const hasContent = query.trim() || files.length > 0;
  const activeBadge = mode !== "search" ? MODE_BADGES[mode] : null;

  return (
    <div className={`relative w-full max-w-2xl ${isLarge ? "max-w-3xl" : ""}`}>
      {/* Slash command dropdown */}
      {showCommands && filteredCommands.length > 0 && (
        <div
          ref={commandsRef}
          className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50"
        >
          <div className="px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50">
            Commands
          </div>
          {filteredCommands.map((cmd, i) => (
            <button
              key={cmd.command}
              onClick={() => selectCommand(cmd.command)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                i === selectedIndex ? "bg-muted/60" : "hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
                <Icon
                  name={cmd.icon as any}
                  className="h-4 w-4 text-muted-foreground"
                />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">
                  /{cmd.command}
                </div>
                <div className="text-xs text-muted-foreground">
                  {cmd.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="bg-card/80 backdrop-blur-md rounded-2xl border border-border shadow-lg hover:shadow-xl transition-shadow">
        {/* Attached files */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-2.5">
            {files.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-2.5 py-1 text-xs text-muted-foreground"
              >
                <Icon name="File" className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{file.name}</span>
                <span className="text-muted-foreground/50">
                  {formatFileSize(file.size)}
                </span>
                <button
                  onClick={() => removeFile(i)}
                  className="hover:text-destructive transition-colors ml-0.5"
                >
                  <Icon name="X" className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="relative flex items-center">
          {/* Mode badge */}
          {activeBadge && (
            <div
              className={`flex items-center gap-1.5 ml-3 px-2.5 py-1 rounded-lg text-xs font-medium border whitespace-nowrap ${activeBadge.color}`}
            >
              <Icon name={activeBadge.icon as any} className="h-3.5 w-3.5" />
              {activeBadge.label}
              <button
                onClick={clearMode}
                className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
              >
                <Icon name="X" className="h-3 w-3" />
              </button>
            </div>
          )}

          <textarea
            ref={inputRef}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              files.length > 0
                ? "Ask about the attached files..."
                : activeBadge
                  ? `What do you want to ${mode === "deep-research" ? "research" : "validate"}?`
                  : "Ask anything... (type / for commands)"
            }
            autoFocus={autoFocus}
            rows={1}
            className={`flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 resize-none text-foreground placeholder:text-muted-foreground ${
              isLarge
                ? `text-lg ${activeBadge ? "pl-2" : "pl-5"} pr-24 py-4`
                : `text-sm ${activeBadge ? "pl-2" : "pl-4"} pr-20 py-3`
            }`}
            style={{ minHeight: isLarge ? "56px" : "44px" }}
          />

          {/* Action buttons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {/* File attach */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={`text-muted-foreground hover:text-foreground transition-colors rounded-lg ${
                isLarge ? "p-2" : "p-1.5"
              }`}
              title="Attach file"
            >
              {uploading ? (
                <Icon
                  name="Loader2"
                  className={`${isLarge ? "h-5 w-5" : "h-4 w-4"} animate-spin`}
                />
              ) : (
                <Icon
                  name="Paperclip"
                  className={isLarge ? "h-5 w-5" : "h-4 w-4"}
                />
              )}
            </button>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!hasContent}
              className={`rounded-xl bg-primary text-primary-foreground disabled:opacity-30 transition-all hover:bg-primary/90 ${
                isLarge ? "p-2.5" : "p-2"
              }`}
            >
              <Icon
                name="ArrowRight"
                className={isLarge ? "h-5 w-5" : "h-4 w-4"}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
