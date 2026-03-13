"use client";

/**
 * MediaUploadPanel
 *
 * Drag-and-drop file upload and URL paste panel for media ingestion.
 * Supports PDF, DOCX, MP3, MP4, YouTube URLs, TXT, MD, HTML.
 */

import { useCallback, useRef, useState } from "react";

import { Icon } from "@proto/icon-system";
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
} from "@proto/ui/atoms";

import type { IngestionJob } from "../hooks/useMediaIngestion";

import { JobStatusCard } from "./JobStatusCard";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "video/mp4",
  "video/webm",
  "text/plain",
  "text/markdown",
  "text/html",
];

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.mp3,.mp4,.wav,.webm,.txt,.md,.html";

const FORMAT_LABELS = "PDF, DOCX, MP3, MP4, TXT, MD, HTML, YouTube URL";

interface MediaUploadPanelProps {
  jobs: IngestionJob[];
  onFileUpload: (file: File) => void;
  onUrlSubmit: (url: string) => void;
  onDismissJob: (jobId: string) => void;
}

export function MediaUploadPanel({
  jobs,
  onFileUpload,
  onUrlSubmit,
  onDismissJob,
}: MediaUploadPanelProps) {
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        onFileUpload(file);
      }
    },
    [onFileUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        onFileUpload(file);
      }
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onFileUpload]
  );

  const handleUrlSubmit = useCallback(() => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      onUrlSubmit(trimmed);
      setUrlInput("");
    }
  }, [urlInput, onUrlSubmit]);

  const handleUrlKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleUrlSubmit();
      }
    },
    [handleUrlSubmit]
  );

  const hasJobs = jobs.length > 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-t border-border">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between px-4 py-2 h-auto font-normal"
        >
          <div className="flex items-center gap-2">
            <Icon name="upload" size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Media Upload</span>
          </div>
          <div className="flex items-center gap-2">
            {hasJobs && (
              <span className="text-xs text-muted-foreground">
                {jobs.filter((j) => j.status === "uploading" || j.status === "processing").length} active
              </span>
            )}
            <Icon
              name="chevron-down"
              size={16}
              className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-3">
        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
            transition-colors
            ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/50"
            }
          `}
        >
          <Icon
            name="upload"
            size={24}
            className="mx-auto mb-2 text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Drop files here or click to browse
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            {FORMAT_LABELS}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* URL input */}
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleUrlKeyDown}
            placeholder="Paste URL (YouTube, webpage, etc.)"
            className="h-8 text-sm flex-1"
          />
          <Button
            variant="secondary"
            size="sm"
            className="h-8"
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim()}
          >
            Ingest
          </Button>
        </div>

        {/* Job status cards */}
        {hasJobs && (
          <div className="space-y-1.5">
            {jobs.map((job) => (
              <JobStatusCard
                key={job.jobId}
                job={job}
                onDismiss={onDismissJob}
              />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
