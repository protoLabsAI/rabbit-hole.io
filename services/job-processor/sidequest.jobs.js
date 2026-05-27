/**
 * Sidequest Manual Job Resolution Registry
 *
 * This file explicitly exports all job classes for manual resolution.
 * Required for Docker/ESM environments where automatic script path detection fails.
 *
 * Sidequest's worker thread imports THIS file and looks up `module[className]`
 * — so every job class enqueued anywhere must be re-exported here, or the
 * runner throws "Invalid job class: <name>". (Distinct from job-registry.ts's
 * global-scope registration, which the runner does not use.)
 *
 * @see https://docs.sidequestjs.com/jobs/manual-resolution
 */

// Import all job classes from compiled output
import { LangExtractJob } from "./dist/jobs/LangExtractJob.js";
import { MediaIngestionJob } from "./dist/jobs/MediaIngestionJob.js";
import { TextExtractionJob } from "./dist/jobs/TextExtractionJob.js";
import { YouTubeProcessingJob } from "./dist/jobs/YouTubeProcessingJob.js";

// Export all job classes for Sidequest to resolve
export {
  LangExtractJob,
  MediaIngestionJob,
  TextExtractionJob,
  YouTubeProcessingJob,
};
