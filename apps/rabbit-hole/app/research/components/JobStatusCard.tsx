"use client";

/**
 * JobStatusCard
 *
 * Displays the status of a single media ingestion job with
 * progress indicator and dismiss action.
 */

import { Icon } from "@proto/icon-system";
import { Button, Badge, Progress } from "@proto/ui/atoms";

import type { IngestionJob } from "../hooks/useMediaIngestion";

const STATUS_CONFIG = {
  idle: { icon: "circle" as const, label: "Idle", color: "text-muted-foreground" },
  uploading: { icon: "upload" as const, label: "Uploading", color: "text-blue-500" },
  processing: { icon: "loader" as const, label: "Processing", color: "text-primary" },
  completed: { icon: "check-circle" as const, label: "Complete", color: "text-green-500" },
  failed: { icon: "alert-circle" as const, label: "Failed", color: "text-destructive" },
} as const;

interface JobStatusCardProps {
  job: IngestionJob;
  onDismiss: (jobId: string) => void;
}

export function JobStatusCard({ job, onDismiss }: JobStatusCardProps) {
  const config = STATUS_CONFIG[job.status];
  const isActive = job.status === "uploading" || job.status === "processing";
  const displayName = job.fileName || job.url || job.jobId;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-md text-sm">
      <Icon
        name={config.icon}
        size={14}
        className={`${config.color} ${isActive ? "animate-spin" : ""}`}
      />
      <span className="flex-1 truncate text-xs" title={displayName}>
        {displayName}
      </span>
      <Badge
        variant={job.status === "failed" ? "destructive" : "secondary"}
        className="text-[10px] px-1.5 py-0"
      >
        {config.label}
      </Badge>
      {job.status === "completed" && job.textLength && (
        <span className="text-[10px] text-muted-foreground">
          {Math.round(job.textLength / 1000)}k chars
        </span>
      )}
      {!isActive && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={() => onDismiss(job.jobId)}
        >
          <Icon name="x" size={12} />
        </Button>
      )}
    </div>
  );
}
