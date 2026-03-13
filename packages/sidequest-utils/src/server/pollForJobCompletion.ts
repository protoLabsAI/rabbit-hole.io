/**
 * Poll for Job Completion
 *
 * Shared server-side utility for polling job status until completion.
 * Used by all job types (LangExtract, YouTube, TextExtraction, etc.) to await async job results.
 *
 * Uses direct database queries to avoid authentication issues when called from server-side contexts.
 */

import { getJobStatus, getJobCompletion } from "./status";

export interface PollOptions {
  pollInterval?: number; // ms between polls (default: 2000)
  timeout?: number; // ms before timeout (default: 300000 = 5 min)
}

export interface JobResult {
  success: boolean;
  extractedEntities?: any;
  metadata?: any;
  result?: any;
  error?: string;
  [key: string]: any;
}

/**
 * Poll job status until completed, failed, or timeout
 *
 * @param jobId - The job ID to poll
 * @param options - Polling configuration
 * @returns The job result data
 *
 * @example
 * ```typescript
 * const job = await enqueueYouTubeJob({ url, userId, workspaceId });
 * const result = await pollForJobCompletion(job.jobId);
 * console.log('Video processed:', result);
 * ```
 */
export async function pollForJobCompletion(
  jobId: string,
  options: PollOptions = {}
): Promise<JobResult> {
  const { pollInterval = 2000, timeout = 300000 } = options;

  const startTime = Date.now();
  let attempt = 0;

  console.log(`⏳ Polling for job ${jobId} completion...`);

  while (Date.now() - startTime < timeout) {
    attempt++;

    try {
      // Check completion cache first (persists after cleanup)
      let job = await getJobCompletion(jobId);

      // Fall back to live status if not in cache
      if (!job) {
        job = await getJobStatus(jobId);
      }

      // Job not found yet (may not be visible immediately)
      if (!job && attempt <= 3) {
        console.log(`⏳ Job not found yet, retrying... (attempt ${attempt})`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      if (!job) {
        throw new Error(`Job ${jobId} not found after ${attempt} attempts`);
      }

      // Job completed successfully
      if (job.status === "completed") {
        const elapsed = Date.now() - startTime;
        console.log(`✅ Job completed after ${attempt} polls (${elapsed}ms)`);
        return job.result;
      }

      // Job failed permanently
      if (job.status === "failed") {
        throw new Error(`Job failed: ${job.error || "Unknown error"}`);
      }

      // Still processing - log progress periodically
      if (attempt % 5 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(
          `⏳ Still ${job.status} - poll ${attempt}, elapsed ${elapsed}s`
        );
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error) {
      const elapsed = Date.now() - startTime;

      if (elapsed >= timeout) {
        throw new Error(
          `Job polling timed out after ${elapsed}ms (${attempt} attempts)`
        );
      }

      // Transient error, retry
      console.warn(`⚠️ Poll error (attempt ${attempt}):`, error);
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error(`Job timed out after ${timeout}ms`);
}
