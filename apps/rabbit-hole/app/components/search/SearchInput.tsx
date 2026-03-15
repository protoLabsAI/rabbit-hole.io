"use client";

import { useState, useRef, useCallback } from "react";

import { Icon } from "@proto/icon-system";

export interface AttachedFile {
  name: string;
  size: number;
  mediaType: string;
  base64: string;
}

interface SearchInputProps {
  onSearch: (query: string, files?: AttachedFile[]) => void;
  onDeepResearch?: (query: string) => void;
  initialQuery?: string;
  size?: "large" | "normal";
  autoFocus?: boolean;
}

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

export function SearchInput({
  onSearch,
  onDeepResearch,
  initialQuery = "",
  size = "normal",
  autoFocus = false,
}: SearchInputProps) {
  const [query, setQuery] = useState(initialQuery);
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed || files.length > 0) {
      onSearch(
        trimmed || `Analyze: ${files.map((f) => f.name).join(", ")}`,
        files.length > 0 ? files : undefined
      );
      setFiles([]);
    }
  }, [query, files, onSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
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

      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    []
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const isLarge = size === "large";
  const hasContent = query.trim() || files.length > 0;

  return (
    <div className={`relative w-full max-w-2xl ${isLarge ? "max-w-3xl" : ""}`}>
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
        <div className="relative">
          <textarea
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              files.length > 0
                ? "Ask about the attached files..."
                : "Ask anything..."
            }
            autoFocus={autoFocus}
            rows={1}
            className={`w-full bg-transparent border-0 focus:outline-none focus:ring-0 resize-none text-foreground placeholder:text-muted-foreground ${
              isLarge ? "text-lg pl-5 pr-24 py-4" : "text-sm pl-4 pr-20 py-3"
            }`}
            style={{ minHeight: isLarge ? "56px" : "44px" }}
          />

          {/* Action buttons */}
          <div
            className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5`}
          >
            {/* Deep Research */}
            {onDeepResearch && query.trim() && (
              <button
                onClick={() => onDeepResearch(query.trim())}
                className={`text-muted-foreground hover:text-primary transition-colors rounded-lg ${
                  isLarge ? "p-2" : "p-1.5"
                }`}
                title="Deep Research (comprehensive report)"
              >
                <Icon
                  name="FlaskConical"
                  className={isLarge ? "h-5 w-5" : "h-4 w-4"}
                />
              </button>
            )}

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
