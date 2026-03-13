/**
 * React Query Hooks for Sidequest.js Job Queue
 *
 * Client-safe hooks for enqueueing and tracking background jobs.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  Job,
  JobStatus,
  EnqueueResponse,
  JobListResponse,
} from "../types";

export interface EnqueueYouTubeParams {
  url: string;
  quality?: "720p" | "1080p";
  workspaceId: string;
  // Transcription options
  includeTranscript?: boolean;
  transcriptionProvider?: "groq" | "openai" | "local";
  transcriptionLanguage?: string;
}

export interface EnqueueLangExtractParams {
  textContent: string;
  extractionPrompt: string;
  outputFormat?: Record<string, any>;
  workspaceId: string;
  sourceEntityUid?: string;
  jobType?: string;
  modelId?: string;
  includeSourceGrounding?: boolean;
  temperature?: number;
  useSchemaConstraints?: boolean;
  customSchema?: Record<string, any>;
  examples?: Array<{ input_text: string; expected_output: any }>; // Full examples array for better schema learning
}

/**
 * Enqueue YouTube Processing Job
 *
 * @example
 * const { mutate, isPending, data } = useEnqueueYouTube();
 * mutate({ url: "https://youtube.com/watch?v=...", workspaceId: "ws_123" });
 */
export function useEnqueueYouTube() {
  const queryClient = useQueryClient();

  return useMutation<EnqueueResponse, Error, EnqueueYouTubeParams>({
    mutationFn: async (params): Promise<EnqueueResponse> => {
      const response = await fetch("/api/jobs/enqueue-youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = (await response
          .json()
          .catch(() => ({ message: "Failed to enqueue job" }))) as {
          message?: string;
        };
        throw new Error(error.message || "Failed to enqueue job");
      }

      return response.json() as Promise<EnqueueResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

/**
 * Enqueue LangExtract Job
 *
 * @example
 * const { mutate, isPending, data } = useEnqueueLangExtract();
 * mutate({
 *   textContent: "Albert Einstein was...",
 *   extractionPrompt: "Extract person info",
 *   workspaceId: "ws_123"
 * });
 */
export function useEnqueueLangExtract() {
  const queryClient = useQueryClient();

  return useMutation<EnqueueResponse, Error, EnqueueLangExtractParams>({
    mutationFn: async (params): Promise<EnqueueResponse> => {
      const response = await fetch("/api/jobs/enqueue-langextract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = (await response
          .json()
          .catch(() => ({ message: "Failed to enqueue extraction job" }))) as {
          message?: string;
        };
        throw new Error(error.message || "Failed to enqueue extraction job");
      }

      return response.json() as Promise<EnqueueResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

/**
 * Get Job Status
 *
 * Poll a job's status with exponential backoff.
 * Checks completion cache first to avoid 404s.
 *
 * @example
 * const { data: job, isLoading } = useJobStatus(jobId, {
 *   refetchInterval: 2000, // Initial poll interval
 *   enabled: !!jobId,
 * });
 */
export function useJobStatus(
  jobId: string | null,
  options?: {
    refetchInterval?: number;
    enabled?: boolean;
  }
) {
  return useQuery<Job, Error>({
    queryKey: ["job", jobId],
    queryFn: async (): Promise<Job> => {
      if (!jobId) throw new Error("Job ID required");

      const response = await fetch(`/api/jobs/status/${jobId}`);

      if (!response.ok) {
        const error = (await response
          .json()
          .catch(() => ({ message: "Failed to fetch job status" }))) as {
          message?: string;
        };
        throw new Error(error.message || "Failed to fetch job status");
      }

      return response.json() as Promise<Job>;
    },
    enabled: !!jobId && options?.enabled !== false,
    refetchInterval: (query) => {
      const job = query.state.data;

      // Stop polling if job is completed or failed
      if (job && (job.status === "completed" || job.status === "failed")) {
        return false;
      }

      // Exponential backoff: 500ms → 1s → 2s → 4s → max 5s
      const attempt = query.state.dataUpdateCount || 0;
      const backoff = Math.min(500 * Math.pow(2, attempt), 5000);

      return options?.refetchInterval || backoff;
    },
    staleTime: 0, // Always fetch fresh data
  });
}

/**
 * List Jobs
 *
 * Fetch a list of jobs with optional filtering.
 *
 * @example
 * const { data: jobs } = useJobList({
 *   queue: "youtube-processing",
 *   status: "pending",
 *   limit: 20,
 * });
 */
export function useJobList(options?: {
  queue?: string;
  status?: JobStatus;
  limit?: number;
}) {
  return useQuery<JobListResponse, Error>({
    queryKey: ["jobs", options],
    queryFn: async (): Promise<JobListResponse> => {
      const params = new URLSearchParams();
      if (options?.queue) params.set("queue", options.queue);
      if (options?.status) params.set("status", options.status);
      if (options?.limit) params.set("limit", options.limit.toString());

      const response = await fetch(`/api/jobs/list?${params.toString()}`);

      if (!response.ok) {
        const error = (await response
          .json()
          .catch(() => ({ message: "Failed to fetch jobs" }))) as {
          message?: string;
        };
        throw new Error(error.message || "Failed to fetch jobs");
      }

      return response.json() as Promise<JobListResponse>;
    },
    staleTime: 5000, // Cache for 5 seconds
  });
}
