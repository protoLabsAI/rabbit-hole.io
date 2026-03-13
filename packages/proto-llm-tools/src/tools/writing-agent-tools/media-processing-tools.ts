/**
 * Media Processing Tools for Writing Agent
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { enqueueYouTubeJob } from "@proto/sidequest-utils/server";

/**
 * Extract YouTube Video ID from URL
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Enqueue YouTube Job Tool
 * Starts background processing and returns job ID
 */
export const enqueueYouTubeJobTool = tool(
  async (input: { url: string; userId: string; workspaceId: string }) => {
    const { url, userId, workspaceId } = input;

    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }

    const job = await enqueueYouTubeJob({
      url,
      quality: "720p",
      userId,
      orgId: null,
      workspaceId,
    });

    return {
      success: true,
      jobId: job.jobId,
      videoId,
      url,
    };
  },
  {
    name: "enqueue_youtube_job",
    description:
      "Start YouTube video processing in background. Returns job ID for tracking.",
    schema: z.object({
      url: z.string().describe("YouTube video URL"),
      userId: z.string().describe("User ID"),
      workspaceId: z.string().describe("Workspace ID"),
    }),
  }
);

/**
 * Wait for Job Tool
 * Polls job status until completion
 * NOTE: Agent should call show_job_progress frontend tool BEFORE this
 */
export const waitForJobTool = tool(
  async (input: { jobId: string }) => {
    const { jobId } = input;

    console.log(`⏳ Polling for job ${jobId} completion...`);

    // Poll job status with exponential backoff
    const maxAttempts = 120;
    let pollInterval = 2000; // Start at 2s
    const maxInterval = 10000; // Cap at 10s
    const fetchTimeout = 10000; // 10s timeout per request
    const jobProcessorUrl =
      process.env.JOB_PROCESSOR_URL || "http://localhost:8680";
    const start = Date.now(); // Track real elapsed time

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Add timeout to prevent indefinite hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), fetchTimeout);

      try {
        const response = await fetch(
          `${jobProcessorUrl}/jobs/${jobId}/status`,
          {
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Failed to check job status: ${response.statusText}`);
        }

        const job = await response.json();

        if (job.status === "completed") {
          console.log(`✅ Job ${jobId} completed`);
          return {
            success: true,
            status: "completed",
            ...job.result, // videoId, title, audioKey, videoKey, etc.
          };
        }

        if (job.status === "failed") {
          throw new Error(`Job failed: ${job.error || "Unknown error"}`);
        }

        // Log progress every 10 attempts
        if (attempt % 10 === 0 && attempt > 0) {
          const elapsedMs = Date.now() - start;
          console.log(
            `⏳ Still waiting for job ${jobId}... (${Math.floor(elapsedMs / 1000)}s elapsed)`
          );
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if ((error as Error).name === "AbortError") {
          console.warn(
            `⚠️ Status check timed out for job ${jobId}, retrying...`
          );
          // Continue to next attempt rather than failing immediately
        } else {
          throw error;
        }
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      // Exponential backoff: increase interval by 1.5x up to max
      pollInterval = Math.min(Math.floor(pollInterval * 1.5), maxInterval);
    }

    throw new Error(`Job ${jobId} timed out after maximum polling attempts`);
  },
  {
    name: "wait_for_job",
    description:
      "Poll job status until completion. Returns job result with audioKey, videoKey, title, etc. Call show_job_progress frontend tool FIRST to display progress UI to user.",
    schema: z.object({
      jobId: z.string().describe("Job ID to wait for"),
    }),
  }
);

/**
 * Transcribe Audio Tool
 * Fetches audio from MinIO and sends to transcription API
 */
export const transcribeAudioTool = tool(
  async (input: {
    audioKey: string;
    provider?: "groq" | "openai" | "local";
    model?: string;
  }) => {
    const { audioKey, provider = "groq", model } = input;

    console.log(`[Transcribe] Fetching audio from MinIO: ${audioKey}`);

    // Fetch audio from MinIO
    const { Client } = await import("minio");
    const rawEndpoint = process.env.MINIO_ENDPOINT;
    const normalizedEndpoint = rawEndpoint
      ? rawEndpoint.replace(/^https?:\/\//, "")
      : "localhost";
    const minioClient = new Client({
      endPoint: normalizedEndpoint,
      port: parseInt(process.env.MINIO_PORT || "9000"),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ACCESS_KEY || "minio",
      secretKey: process.env.MINIO_SECRET_KEY || "minio123",
    });

    const bucket = process.env.MINIO_BUCKET || "evidence-raw";
    const audioStream = await minioClient.getObject(bucket, audioKey);

    // Convert stream to buffer with size validation
    const chunks: Buffer[] = [];
    const maxSizeBytes = 500 * 1024 * 1024; // 500MB limit
    let totalSize = 0;

    for await (const chunk of audioStream) {
      totalSize += chunk.length;
      if (totalSize > maxSizeBytes) {
        throw new Error(
          `Audio file too large: exceeds 500 MB limit. Consider using smaller files or streaming upload.`
        );
      }
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    console.log(
      `[Transcribe] Audio fetched, size: ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`
    );

    // Create FormData for upload (using native FormData)
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
    formData.append("file", audioBlob, "audio.mp3");
    formData.append("provider", provider);
    formData.append("model", model || "whisper-large-v3");
    formData.append("response_format", "verbose_json");

    // Call transcription API with timeout
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    console.log(
      `[Transcribe] Calling transcription API at ${baseUrl}/api/transcribe`
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes for transcription

    try {
      const response = await fetch(`${baseUrl}/api/transcribe`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Transcription failed: ${error}`);
      }

      const result = await response.json();
      console.log(
        `[Transcribe] Success! Transcript length: ${result.text?.length || 0} chars`
      );

      return {
        success: true,
        text: result.text,
        duration: result.duration,
        segments: result.segments || [],
        language: result.language || "en",
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === "AbortError") {
        throw new Error(
          "Transcription request timed out after 5 minutes. Audio file may be too large or service is slow."
        );
      }
      throw error;
    }
  },
  {
    name: "transcribe_audio",
    description:
      "Transcribe audio file from MinIO storage using Groq/OpenAI/Local transcription service. Groq is FREE with 10,000 minutes/day.",
    schema: z.object({
      audioKey: z
        .string()
        .describe("MinIO object key for audio file (from YouTube job result)"),
      provider: z
        .enum(["groq", "openai", "local"])
        .default("groq")
        .describe("Transcription provider (default: groq - FREE)"),
      model: z
        .string()
        .optional()
        .describe("Model to use (default: whisper-large-v3)"),
    }),
  }
);

/**
 * Submit Output Tool
 * Signals subagent completion to coordinator
 */
export const submitMediaOutputTool = tool(
  async (input: {
    transcript: string;
    summary: string;
    metadata?: Record<string, any>;
  }) => {
    const { transcript, summary, metadata } = input;

    console.log(`✅ Media processing complete`);

    return {
      success: true,
      transcript,
      summary,
      metadata,
    };
  },
  {
    name: "submit_output",
    description:
      "Submit final output from media processing. Call this when transcription and summarization are complete.",
    schema: z.object({
      transcript: z.string().describe("Full transcript text"),
      summary: z.string().describe("Summary of transcript"),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe("Additional metadata"),
    }),
  }
);
