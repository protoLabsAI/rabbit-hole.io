/**
 * Job Class Registry
 *
 * Central registry for all job classes used by Sidequest workers.
 * Workers use this to resolve job_class strings to actual classes.
 */

import { Job } from "sidequest";

import { LangExtractJob } from "./jobs/LangExtractJob.js";
import { MediaIngestionJob } from "./jobs/MediaIngestionJob.js";
import { TextExtractionJob } from "./jobs/TextExtractionJob.js";
import { YouTubeProcessingJob } from "./jobs/YouTubeProcessingJob.js";

// Type-safe job registry
export const JOB_REGISTRY: Record<string, typeof Job> = {
  YouTubeProcessingJob,
  TextExtractionJob,
  LangExtractJob,
  MediaIngestionJob,
};

/**
 * Resolve job class name to class constructor
 */
export function resolveJobClass(className: string): typeof Job | undefined {
  return JOB_REGISTRY[className];
}

/**
 * Register all job classes in global scope for Sidequest workers
 */
export function registerJobClasses() {
  console.log("📋 Registering job classes globally...");

  for (const [name, JobClass] of Object.entries(JOB_REGISTRY)) {
    (global as any)[name] = JobClass;
    console.log(`  ✓ Registered: ${name}`);
  }

  console.log(`✅ ${Object.keys(JOB_REGISTRY).length} job classes registered`);
}
