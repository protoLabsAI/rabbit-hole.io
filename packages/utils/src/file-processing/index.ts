/**
 * File Processing Utilities
 *
 * Tools for processing uploaded files, extracting metadata,
 * and generating entity identifiers for the Rabbit Hole system.
 */

export {
  processFileMetadata,
  generateEntityIdFromFilename,
  formatFileSize,
  computeFileHash,
  isAllowedFileType,
  getAllowedFileExtensions,
} from "./metadata";

export type { FileProcessingOptions, FileProcessingResult } from "./metadata";
