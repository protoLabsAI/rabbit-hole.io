/**
 * Shared Types for Sidequest.js Job Processing
 */

export type JobStatus = "pending" | "active" | "completed" | "failed";

export interface Job {
  jobId: string;
  status: JobStatus;
  queue: string;
  data?: any;
  result?: any;
  error?: string | null;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
}

export interface EnqueueResponse {
  success: boolean;
  jobId: string;
  status: string;
  message: string;
  data: any;
}

export interface JobListResponse {
  jobs: Job[];
  count: number;
  filters: {
    queue?: string;
    status?: JobStatus;
    limit: number;
  };
}

// Job Data Types
export interface YouTubeJobData {
  url: string;
  quality: "720p" | "1080p";
  userId: string;
  orgId: string | null;
  workspaceId: string;
  // Transcription options
  includeTranscript?: boolean;
  transcriptionProvider?: "groq" | "openai" | "local";
  transcriptionLanguage?: string;
}

export interface TextExtractionJobData {
  fileUid: string;
  canonicalKey: string;
  mediaType: string;
  fileName: string;
  userId: string;
  orgId: string | null;
  workspaceId: string;
}

export interface DocumentExtractionJobData {
  extractionJobId: string;
  worldId: string;
  canonicalKey: string;
  mediaType: string;
  fileName: string;
  userId: string;
  orgId: string | null;
  workspaceId: string;
}

export type MediaCategory = "video" | "audio" | "document" | "image" | "text";

export interface IngestionJobData {
  url?: string;
  fileUid?: string;
  canonicalKey?: string;
  mediaType?: string;
  fileName?: string;
  mediaCategory: MediaCategory;
  userId: string;
  orgId: string | null;
  workspaceId: string;
  // Transcription options
  includeTranscript?: boolean;
  transcriptionProvider?: "groq" | "openai" | "local";
  transcriptionLanguage?: string;
}
