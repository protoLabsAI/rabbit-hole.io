/**
 * Server-side Job Enqueueing Utilities
 *
 * Enqueues jobs by calling the job processor HTTP API.
 * Avoids importing Sidequest library to prevent Next.js bundling issues.
 */

import type { YouTubeJobData, TextExtractionJobData } from "../types";

interface EnqueueOptions {
  maxAttempts?: number;
  priority?: number;
  delay?: number; // ms
}

const JOB_PROCESSOR_URL =
  process.env.JOB_PROCESSOR_URL || "http://localhost:8680";

/**
 * Enqueue a YouTube processing job
 */
export async function enqueueYouTubeJob(
  data: YouTubeJobData,
  options: EnqueueOptions = {}
): Promise<{ id: string; jobId: string }> {
  const response = await fetch(`${JOB_PROCESSOR_URL}/enqueue/youtube`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "Failed to enqueue YouTube job");
  }

  const result = await response.json();

  return {
    id: result.jobId,
    jobId: result.jobId,
  };
}

/**
 * Enqueue a text extraction job
 */
export async function enqueueTextExtractionJob(
  data: TextExtractionJobData,
  options: EnqueueOptions = {}
): Promise<{ id: string; jobId: string }> {
  const response = await fetch(`${JOB_PROCESSOR_URL}/enqueue/text-extraction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "Failed to enqueue text extraction job");
  }

  const result = await response.json();

  return {
    id: result.jobId,
    jobId: result.jobId,
  };
}

/**
 * Generic job enqueue function
 * @deprecated Use specific enqueue functions instead
 */
export async function enqueueJob(
  queue: string,
  data: any,
  options: EnqueueOptions = {}
): Promise<{ id: string; jobId: string }> {
  throw new Error(
    "Generic enqueueJob not implemented. Use enqueueYouTubeJob or enqueueTextExtractionJob instead."
  );
}
