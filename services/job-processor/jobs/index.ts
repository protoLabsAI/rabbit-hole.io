/**
 * Job Registration
 *
 * Registers all job classes with Sidequest.js
 */

import { Sidequest } from "sidequest";

import { LangExtractJob } from "./LangExtractJob.js";
import { TextExtractionJob } from "./TextExtractionJob.js";
import { YouTubeProcessingJob } from "./YouTubeProcessingJob.js";

export function registerJobs() {
  console.log("📋 Registering job classes...");

  // Register job classes with their queues
  // Sidequest will automatically handle job class registration

  console.log("✅ Job classes registered:");
  console.log("  - TextExtractionJob (queue: file-processing)");
  console.log("  - YouTubeProcessingJob (queue: youtube-processing)");
  console.log("  - LangExtractJob (queue: langextract-processing)");
}

export { TextExtractionJob, YouTubeProcessingJob, LangExtractJob };

// Job enqueue helpers
export async function enqueueTextExtraction(data: {
  fileUid: string;
  canonicalKey: string;
  mediaType: string;
  fileName: string;
  userId: string;
  orgId: string | null;
  workspaceId: string;
}) {
  console.log(`📤 Enqueueing text extraction job for ${data.fileUid}`);

  return await Sidequest.build(TextExtractionJob)
    .queue("file-processing")
    .enqueue(data);
}

export async function enqueueYouTubeProcessing(data: {
  url: string;
  quality: "720p" | "1080p";
  userId: string;
  orgId: string | null;
  workspaceId: string;
}) {
  console.log(`📤 Enqueueing YouTube processing job for ${data.url}`);

  return await Sidequest.build(YouTubeProcessingJob)
    .queue("youtube-processing")
    .enqueue(data);
}

export async function enqueueLangExtract(data: {
  textContent: string;
  extractionPrompt: string;
  outputFormat?: Record<string, any>;
  userId: string;
  orgId: string | null;
  workspaceId: string;
  sourceEntityUid?: string;
  jobType?: string;
  modelId?: string;
  includeSourceGrounding?: boolean;
  temperature?: number;
  useSchemaConstraints?: boolean;
  customSchema?: Record<string, any>;
}) {
  console.log(`📤 Enqueueing LangExtract job for ${data.userId}`);

  return await Sidequest.build(LangExtractJob)
    .queue("langextract-processing")
    .maxAttempts(3)
    .enqueue(data);
}
