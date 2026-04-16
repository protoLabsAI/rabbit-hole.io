/**
 * Client-safe exports for @protolabsai/sidequest-utils
 *
 * React Query hooks for job queue management.
 * Import from @protolabsai/sidequest-utils/client in React components.
 */

export {
  useEnqueueYouTube,
  useEnqueueLangExtract,
  useJobStatus,
  useJobList,
  type EnqueueYouTubeParams,
  type EnqueueLangExtractParams,
} from "./hooks";

export {
  useJobNotifications,
  useJobCompletionNotification,
  type JobCompletionNotification,
} from "./useJobNotifications";

export type {
  Job,
  JobStatus,
  EnqueueResponse,
  JobListResponse,
} from "../types";
