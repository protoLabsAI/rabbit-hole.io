/**
 * Media Ingestion Tool
 *
 * Submits a URL or file reference to the job-processor /ingest endpoint,
 * polls for the result, and returns extracted text and metadata as context.
 */

import { ToolMessage } from "@langchain/core/messages";
import { tool, type ToolRunnableConfig } from "@langchain/core/tools";
import { Command } from "@langchain/langgraph";
import { z } from "zod";

const JOB_PROCESSOR_URL =
  process.env.JOB_PROCESSOR_URL || "http://localhost:3001";

const POLL_INTERVAL_MS = 5000;
const MAX_TIMEOUT_MS = 60000;
const TEXT_TRUNCATE_LENGTH = 8000;

interface IngestResponse {
  jobId: string;
}

interface JobStatusResponse {
  status: "pending" | "processing" | "completed" | "failed";
  result?: {
    text?: string;
    metadata?: Record<string, unknown>;
  };
  error?: string;
}

async function submitIngestJob(
  payload: { url?: string; fileReference?: string }
): Promise<string> {
  const response = await fetch(`${JOB_PROCESSOR_URL}/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Ingest submission failed: HTTP ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as IngestResponse;
  if (!data.jobId) {
    throw new Error("Ingest response missing jobId");
  }

  return data.jobId;
}

async function pollJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(
    `${JOB_PROCESSOR_URL}/ingest/${jobId}/status`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Status poll failed: HTTP ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as JobStatusResponse;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ingestAndPoll(payload: {
  url?: string;
  fileReference?: string;
}): Promise<{
  text: string;
  metadata: Record<string, unknown>;
  timedOut: boolean;
}> {
  const jobId = await submitIngestJob(payload);

  const deadline = Date.now() + MAX_TIMEOUT_MS;
  let lastStatus: JobStatusResponse | null = null;

  while (Date.now() < deadline) {
    const status = await pollJobStatus(jobId);
    lastStatus = status;

    if (status.status === "completed") {
      const rawText = status.result?.text || "";
      const truncatedText =
        rawText.length > TEXT_TRUNCATE_LENGTH
          ? rawText.slice(0, TEXT_TRUNCATE_LENGTH) + "...[truncated]"
          : rawText;

      return {
        text: truncatedText,
        metadata: status.result?.metadata || {},
        timedOut: false,
      };
    }

    if (status.status === "failed") {
      throw new Error(`Ingest job failed: ${status.error || "Unknown error"}`);
    }

    // status is "pending" or "processing" — wait before next poll
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await sleep(Math.min(POLL_INTERVAL_MS, remaining));
  }

  // Timeout: return partial result with warning
  const rawText = lastStatus?.result?.text || "";
  const truncatedText =
    rawText.length > TEXT_TRUNCATE_LENGTH
      ? rawText.slice(0, TEXT_TRUNCATE_LENGTH) + "...[truncated]"
      : rawText;

  return {
    text: truncatedText,
    metadata: lastStatus?.result?.metadata || {},
    timedOut: true,
  };
}

export const mediaIngestionTool = tool(
  async (
    input: { url?: string; fileReference?: string },
    config: ToolRunnableConfig
  ) => {
    try {
      const { text, metadata, timedOut } = await ingestAndPoll(input);

      const warning = timedOut
        ? " WARNING: Job did not complete within 60s timeout. Partial result returned."
        : "";

      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: JSON.stringify({
                success: true,
                timedOut,
                warning: timedOut ? warning.trim() : undefined,
                text,
                metadata,
              }),
              tool_call_id: config.toolCall?.id as string,
            }),
          ],
        },
      });
    } catch (error) {
      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: JSON.stringify({
                success: false,
                error:
                  error instanceof Error ? error.message : String(error),
              }),
              tool_call_id: config.toolCall?.id as string,
            }),
          ],
        },
      });
    }
  },
  {
    name: "media_ingestion",
    description:
      "Submit a URL or file reference to the job-processor for ingestion. " +
      "Polls until complete (max 60s) and returns extracted text (up to 8000 chars) and metadata.",
    schema: z.object({
      url: z.string().url().optional().describe("Public URL to ingest"),
      fileReference: z
        .string()
        .optional()
        .describe("Internal file reference path to ingest"),
    }),
  }
);
