"use client";

/**
 * Job Status Tracker Component
 *
 * Real-time job status tracking with SSE notifications + polling fallback.
 * Uses PostgreSQL LISTEN/NOTIFY for sub-100ms completion notifications.
 */

import { type ClassValue, clsx } from "clsx";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

import { Icon } from "@proto/icon-system";
import { Badge, Card, CardContent, Progress } from "@proto/ui/atoms";

import { useJobStatus, useJobNotifications } from "../../client";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface JobStatusTrackerProps {
  jobId: string | null;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  className?: string;
  /** Polling interval in milliseconds. Defaults to 2000ms (2s). Choose based on expected job duration: 1000ms for quick jobs, 2000ms for medium jobs, 5000ms for long jobs. */
  refetchInterval?: number;
}

export function JobStatusTracker({
  jobId,
  onComplete,
  onError,
  className,
  refetchInterval = 2000,
}: JobStatusTrackerProps) {
  const [isCompleted, setIsCompleted] = useState(false);

  // Real-time SSE notifications
  const { notifications } = useJobNotifications({
    enabled: !!jobId && !isCompleted,
  });

  // Polling fallback with configurable interval
  const { data: job, isLoading } = useJobStatus(jobId, {
    enabled: !!jobId && !isCompleted,
    refetchInterval,
  });

  // Listen for SSE notification for this specific job
  useEffect(() => {
    const notification = notifications.find((n) => n.jobId === jobId);
    if (notification && !isCompleted) {
      setIsCompleted(true);

      // Trigger callback immediately (SSE path)
      if (notification.status === "completed" && onComplete) {
        // Fetch full job details to get result
        fetch(`/api/jobs/status/${jobId}`)
          .then((res) => {
            if (!res.ok) {
              return res
                .text()
                .then((body) => {
                  throw new Error(
                    `Failed to fetch job details (${res.status}): ${body}`
                  );
                })
                .catch((textError) => {
                  throw new Error(
                    `Failed to fetch job details (${res.status}): ${textError.message}`
                  );
                });
            }
            return res.json();
          })
          .then((fullJob) => {
            if (fullJob.result) onComplete(fullJob.result);
          })
          .catch((error) => {
            console.error("Failed to fetch job details:", error);
            if (onError) {
              onError(
                error instanceof Error
                  ? error.message
                  : "Failed to fetch job details"
              );
            }
          });
      } else if (notification.status === "failed" && onError) {
        onError(notification.error || "Job failed");
      }
    }
  }, [notifications, jobId, isCompleted, onComplete, onError]);

  // Polling fallback: Call callbacks when job completes or fails
  useEffect(() => {
    if (
      job?.status === "completed" &&
      job.result &&
      onComplete &&
      !isCompleted
    ) {
      setIsCompleted(true);
      onComplete(job.result);
    }
    if (job?.status === "failed" && job.error && onError && !isCompleted) {
      setIsCompleted(true);
      onError(job.error);
    }
  }, [job?.status, job?.result, job?.error, onComplete, onError, isCompleted]);

  if (!jobId) return null;

  if (isLoading) {
    return (
      <Card className={cn("border-border", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Icon
              name="Loader2"
              size={20}
              className="animate-spin text-muted-foreground"
            />
            <span className="text-sm text-muted-foreground">
              Loading job status...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!job) {
    return (
      <Card className={cn("border-destructive", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Icon name="XCircle" size={20} className="text-destructive" />
            <span className="text-sm text-destructive">Job not found</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    pending: {
      icon: "Clock",
      label: "Queued",
      color: "text-yellow-500",
      badgeVariant: "secondary" as const,
      progress: 0,
      animate: false,
    },
    active: {
      icon: "Loader2",
      label: "Processing",
      color: "text-blue-500",
      badgeVariant: "default" as const,
      progress: 50,
      animate: true,
    },
    completed: {
      icon: "CheckCircle2",
      label: "Completed",
      color: "text-green-500",
      badgeVariant: "default" as const,
      progress: 100,
      animate: false,
    },
    failed: {
      icon: "XCircle",
      label: "Failed",
      color: "text-destructive",
      badgeVariant: "destructive" as const,
      progress: 100,
      animate: false,
    },
  };

  const config = statusConfig[job.status];

  return (
    <Card className={cn("border-border", className)}>
      <CardContent className="p-4 space-y-3">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon
              name={config.icon}
              size={20}
              className={cn(config.color, config.animate && "animate-spin")}
            />
            <div>
              <p className="text-sm font-medium">{config.label}</p>
              <p className="text-xs text-muted-foreground">
                Job ID: {job.jobId.slice(0, 8)}...
              </p>
            </div>
          </div>
          <Badge variant={config.badgeVariant}>{job.status}</Badge>
        </div>

        {/* Progress Bar */}
        <Progress value={config.progress} className="h-2" />

        {/* Job Details */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Queue:</span>
            <span className="ml-2 font-mono">{job.queue}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Attempts:</span>
            <span className="ml-2">
              {job.attempts}/{job.maxAttempts}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {job.status === "failed" && job.error && (
          <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
            <p className="text-xs text-destructive font-medium">Error:</p>
            <p className="text-xs text-destructive/80 mt-1">{job.error}</p>
          </div>
        )}

        {/* Result Preview */}
        {job.status === "completed" && job.result && (
          <div className="p-3 bg-green-500/10 border border-green-500 rounded-md">
            <p className="text-xs text-green-700 dark:text-green-400 font-medium">
              Success
            </p>
            {job.result.title && (
              <p className="text-xs text-muted-foreground mt-1">
                {job.result.title}
              </p>
            )}
          </div>
        )}

        {/* Timestamps */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Created: {new Date(job.createdAt).toLocaleTimeString()}</div>
          {job.startedAt && (
            <div>Started: {new Date(job.startedAt).toLocaleTimeString()}</div>
          )}
          {job.completedAt && (
            <div>
              Completed: {new Date(job.completedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
