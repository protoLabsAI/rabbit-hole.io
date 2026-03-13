/**
 * Sidequest Manual Job Resolution Registry
 *
 * This file explicitly exports all job classes for manual resolution.
 * Required for Docker/ESM environments where automatic script path detection fails.
 *
 * @see https://docs.sidequestjs.com/jobs/manual-resolution
 */

// Import all job classes from compiled output
import { LangExtractJob } from "./dist/jobs/LangExtractJob.js";
import { TextExtractionJob } from "./dist/jobs/TextExtractionJob.js";
import { YouTubeProcessingJob } from "./dist/jobs/YouTubeProcessingJob.js";

// Export all job classes for Sidequest to resolve
export { LangExtractJob, TextExtractionJob, YouTubeProcessingJob };
