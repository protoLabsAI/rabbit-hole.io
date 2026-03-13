"use client";
/// <reference lib="dom" />

/**
 * useYouTubeProcessor Hook
 *
 * React Query-based hooks for the YouTube Processor microservice.
 * Provides automatic caching, request deduplication, and retry logic.
 * Follows the established LangExtract pattern.
 */

import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

import { youtubeProcessorConfig } from "../config/youtube-config";

// Type definitions
export interface YouTubeProcessRequest {
  url: string;
  quality?: "720p" | "1080p";
  userId: string;
  orgId?: string | null;
  workspaceId: string;
  // Transcription options
  includeTranscript?: boolean;
  transcriptionProvider?: "groq" | "openai" | "local";
  transcriptionLanguage?: string;
}

export interface VideoMetadata {
  video_id?: string;
  title?: string;
  description?: string;
  upload_date?: string;
  duration_seconds?: number;
  channel_name?: string;
  channel_id?: string;
  view_count?: number;
  like_count?: number;
  tags?: string[];
  thumbnail_url?: string;
  // Generic metadata from FFprobe
  video_codec?: string;
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  size?: number;
  format?: string;
  has_audio?: boolean;
  audio_codec?: string;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionData {
  text: string;
  language?: string;
  duration?: number;
  segments: TranscriptSegment[];
  chunks_processed: number;
  provider: string;
}

export interface YouTubeProcessResponse {
  success: boolean;
  video_metadata: VideoMetadata;
  video_canonical_key: string;
  audio_canonical_key: string;
  file_size_bytes: number;
  audio_size_bytes: number;
  quality?: string;
  message: string;
  // Transcription (optional)
  transcript?: TranscriptionData;
  transcript_canonical_key?: string;
}

export interface UploadRequest {
  file: File;
  userId: string;
  orgId?: string | null;
  workspaceId: string;
}

export interface DownloadURLRequest {
  url: string;
  userId: string;
  orgId?: string | null;
  workspaceId: string;
}

/**
 * React Query mutation hook for processing YouTube videos
 *
 * @example
 * const { mutate, isPending, error, data } = useYouTubeProcess({
 *   onSuccess: (result) => console.log("Processed:", result),
 * });
 *
 * mutate({
 *   url: "https://youtube.com/watch?v=...",
 *   userId: "user_123",
 *   workspaceId: "workspace_abc"
 * });
 */
export function useYouTubeProcess(
  options?: UseMutationOptions<
    YouTubeProcessResponse,
    Error,
    YouTubeProcessRequest
  >
) {
  return useMutation<YouTubeProcessResponse, Error, YouTubeProcessRequest>({
    mutationFn: async (variables) => {
      const {
        url,
        quality = youtubeProcessorConfig.defaults.quality,
        userId,
        orgId,
        workspaceId,
        includeTranscript,
        transcriptionProvider,
        transcriptionLanguage,
      } = variables;

      const serviceUrl = youtubeProcessorConfig.getServiceUrl();

      if (!serviceUrl || typeof serviceUrl !== "string" || !serviceUrl.trim()) {
        throw new Error("YouTube processor service URL is not configured");
      }

      const response = await fetch(`${serviceUrl}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          quality,
          user_id: userId,
          org_id: orgId,
          workspace_id: workspaceId,
          include_transcript: includeTranscript,
          transcription_provider: transcriptionProvider,
          transcription_language: transcriptionLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail
          ? `Processing failed: ${response.status} ${response.statusText} - ${errorData.detail}`
          : `Processing failed: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      return await response.json();
    },
    ...options,
  });
}

/**
 * React Query mutation hook for uploading video files
 *
 * @example
 * const { mutate, isPending } = useYouTubeUpload({
 *   onSuccess: (result) => console.log("Uploaded:", result),
 * });
 *
 * mutate({
 *   file: videoFile,
 *   userId: "user_123",
 *   workspaceId: "workspace_abc"
 * });
 */
export function useYouTubeUpload(
  options?: UseMutationOptions<YouTubeProcessResponse, Error, UploadRequest>
) {
  return useMutation<YouTubeProcessResponse, Error, UploadRequest>({
    mutationFn: async (variables) => {
      const { file, userId, orgId, workspaceId } = variables;

      const serviceUrl = youtubeProcessorConfig.getServiceUrl();

      if (!serviceUrl || typeof serviceUrl !== "string" || !serviceUrl.trim()) {
        throw new Error("YouTube processor service URL is not configured");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", userId);
      if (orgId) formData.append("org_id", orgId);
      formData.append("workspace_id", workspaceId);

      const response = await fetch(`${serviceUrl}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail
          ? `Upload failed: ${response.status} ${response.statusText} - ${errorData.detail}`
          : `Upload failed: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      return await response.json();
    },
    ...options,
  });
}

/**
 * React Query mutation hook for downloading videos from generic URLs
 *
 * @example
 * const { mutate, isPending } = useYouTubeDownloadURL({
 *   onSuccess: (result) => console.log("Downloaded:", result),
 * });
 *
 * mutate({
 *   url: "https://example.com/video.mp4",
 *   userId: "user_123",
 *   workspaceId: "workspace_abc"
 * });
 */
export function useYouTubeDownloadURL(
  options?: UseMutationOptions<
    YouTubeProcessResponse,
    Error,
    DownloadURLRequest
  >
) {
  return useMutation<YouTubeProcessResponse, Error, DownloadURLRequest>({
    mutationFn: async (variables) => {
      const { url, userId, orgId, workspaceId } = variables;

      const serviceUrl = youtubeProcessorConfig.getServiceUrl();

      if (!serviceUrl || typeof serviceUrl !== "string" || !serviceUrl.trim()) {
        throw new Error("YouTube processor service URL is not configured");
      }

      const response = await fetch(`${serviceUrl}/download-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          user_id: userId,
          org_id: orgId,
          workspace_id: workspaceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail
          ? `Download failed: ${response.status} ${response.statusText} - ${errorData.detail}`
          : `Download failed: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      return await response.json();
    },
    ...options,
  });
}

export interface TranscriptionProviderInfo {
  name: string;
  available: boolean;
  max_file_size_mb: number;
}

export interface YouTubeProcessorHealthResponse {
  status: string;
  version: string;
  ffmpeg_available: boolean;
  ffprobe_available: boolean;
  ytdlp_version: string;
  transcription_providers?: TranscriptionProviderInfo[];
}

/**
 * React Query hook to check if YouTube processor service is available
 *
 * @example
 * const { data: isAvailable, isLoading, refetch } = useYouTubeProcessorHealth();
 */
export function useYouTubeProcessorHealth(
  options?: Omit<
    UseQueryOptions<YouTubeProcessorHealthResponse | null, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: ["youtube-processor", "health"],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(youtubeProcessorConfig.getHealthUrl(), {
          method: "GET",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          return null;
        }
        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        console.warn("YouTube processor service not available:", error);
        return null;
      }
    },
    staleTime: 30000, // 30 seconds - health status changes relatively slowly
    refetchOnWindowFocus: true, // Check when user returns to window
    retry: 1, // Only retry once for health checks
    ...options,
  });
}
