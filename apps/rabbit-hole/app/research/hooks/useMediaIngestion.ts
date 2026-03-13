"use client";

/**
 * useMediaIngestion
 *
 * Manages file upload and URL ingestion lifecycle:
 * 1. Submit file/URL to /api/ingest
 * 2. Subscribe to SSE progress via /api/ingest/progress
 * 3. Track job status: uploading → processing → extracting → complete/failed
 */

import { useCallback, useRef, useState } from "react";

export type IngestionStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";

export interface IngestionJob {
  jobId: string;
  status: IngestionStatus;
  fileName?: string;
  url?: string;
  error?: string;
  textLength?: number;
  category?: string;
}

interface UseMediaIngestionOptions {
  workspaceId?: string;
  onComplete?: (job: IngestionJob) => void;
}

export function useMediaIngestion(options: UseMediaIngestionOptions = {}) {
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map());

  const updateJob = useCallback(
    (jobId: string, updates: Partial<IngestionJob>) => {
      setJobs((prev) =>
        prev.map((j) => (j.jobId === jobId ? { ...j, ...updates } : j))
      );
    },
    []
  );

  const subscribeToProgress = useCallback(
    (jobId: string) => {
      const es = new EventSource(`/api/ingest/progress?jobId=${jobId}`);

      eventSourcesRef.current.set(jobId, es);

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "connected") return;

          if (data.status === "processing") {
            updateJob(jobId, { status: "processing" });
          } else if (data.status === "completed") {
            const completedJob: Partial<IngestionJob> = {
              status: "completed",
              textLength: data.textLength,
              category: data.category,
            };
            updateJob(jobId, completedJob);
            es.close();
            eventSourcesRef.current.delete(jobId);

            // Notify parent
            setJobs((prev) => {
              const job = prev.find((j) => j.jobId === jobId);
              if (job) {
                options.onComplete?.({ ...job, ...completedJob });
              }
              return prev;
            });
          } else if (data.status === "failed") {
            updateJob(jobId, {
              status: "failed",
              error: data.error || "Ingestion failed",
            });
            es.close();
            eventSourcesRef.current.delete(jobId);
          }
        } catch {
          // Ignore parse errors
        }
      };

      es.onerror = () => {
        // EventSource will auto-reconnect, but if closed we clean up
        if (es.readyState === EventSource.CLOSED) {
          eventSourcesRef.current.delete(jobId);
        }
      };
    },
    [updateJob, options]
  );

  const ingestFile = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      if (options.workspaceId) {
        formData.append("workspaceId", options.workspaceId);
      }

      const tempId = `pending-${Date.now()}`;
      setJobs((prev) => [
        ...prev,
        { jobId: tempId, status: "uploading", fileName: file.name },
      ]);

      try {
        const response = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          setJobs((prev) =>
            prev.map((j) =>
              j.jobId === tempId
                ? { ...j, status: "failed" as const, error: err.error }
                : j
            )
          );
          return;
        }

        const { jobId } = await response.json();

        // Replace temp ID with real job ID
        setJobs((prev) =>
          prev.map((j) =>
            j.jobId === tempId
              ? { ...j, jobId, status: "processing" as const }
              : j
          )
        );

        subscribeToProgress(jobId);
      } catch (error) {
        setJobs((prev) =>
          prev.map((j) =>
            j.jobId === tempId
              ? {
                  ...j,
                  status: "failed" as const,
                  error: "Network error",
                }
              : j
          )
        );
      }
    },
    [options.workspaceId, subscribeToProgress]
  );

  const ingestUrl = useCallback(
    async (url: string) => {
      const tempId = `pending-${Date.now()}`;
      setJobs((prev) => [
        ...prev,
        { jobId: tempId, status: "uploading", url },
      ]);

      try {
        const response = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, workspaceId: options.workspaceId }),
        });

        if (!response.ok) {
          const err = await response.json();
          setJobs((prev) =>
            prev.map((j) =>
              j.jobId === tempId
                ? { ...j, status: "failed" as const, error: err.error }
                : j
          )
          );
          return;
        }

        const { jobId } = await response.json();

        setJobs((prev) =>
          prev.map((j) =>
            j.jobId === tempId
              ? { ...j, jobId, status: "processing" as const }
              : j
          )
        );

        subscribeToProgress(jobId);
      } catch (error) {
        setJobs((prev) =>
          prev.map((j) =>
            j.jobId === tempId
              ? {
                  ...j,
                  status: "failed" as const,
                  error: "Network error",
                }
              : j
          )
        );
      }
    },
    [options.workspaceId, subscribeToProgress]
  );

  const dismissJob = useCallback((jobId: string) => {
    const es = eventSourcesRef.current.get(jobId);
    if (es) {
      es.close();
      eventSourcesRef.current.delete(jobId);
    }
    setJobs((prev) => prev.filter((j) => j.jobId !== jobId));
  }, []);

  const activeJobs = jobs.filter(
    (j) => j.status === "uploading" || j.status === "processing"
  );

  return {
    jobs,
    activeJobs,
    ingestFile,
    ingestUrl,
    dismissJob,
  };
}
