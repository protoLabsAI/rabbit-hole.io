/**
 * Media Ingestion Type System
 *
 * Core types for the media ingestion pipeline, including adapters, registries,
 * request/response shapes, and job data for Sidequest queue processing.
 */

import { z } from "zod";

import type { SourceGrounding } from "../search/source-grounding";

// ==================== MediaCategory Enum ====================

export const MediaCategoryEnum = z.enum(["video", "audio", "document", "text"]);

export type MediaCategory = z.infer<typeof MediaCategoryEnum>;

// ==================== IngestRequest ====================

/**
 * File source — raw buffer with media type and optional file name.
 */
export const FileSourceSchema = z.object({
  type: z.literal("file"),
  buffer: z.instanceof(Buffer),
  mediaType: z.string().min(1, "Media type is required"),
  fileName: z.string().optional(),
});

export type FileSource = z.infer<typeof FileSourceSchema>;

/**
 * URL source — any HTTP(S) URL pointing to a file.
 * Supports YouTube links, direct file URLs (.pdf, .mp3, .docx, etc.),
 * and generic media URLs where Content-Type is used for format detection.
 */
export const UrlSourceSchema = z.object({
  type: z.literal("url"),
  url: z.string().url("URL must be a valid HTTP(S) URL"),
  mediaType: z.string().optional(),
});

export type UrlSource = z.infer<typeof UrlSourceSchema>;

/**
 * Discriminated union for IngestRequest source.
 */
export const IngestSourceSchema = z.discriminatedUnion("type", [
  FileSourceSchema,
  UrlSourceSchema,
]);

export type IngestSource = z.infer<typeof IngestSourceSchema>;

/**
 * IngestRequest — the top-level payload for triggering media ingestion.
 * Supports both direct file uploads and URL-based sources.
 */
export const IngestRequestSchema = z.object({
  source: IngestSourceSchema,
  /** Optional workspace context for scoping the ingestion job */
  workspaceId: z.string().optional(),
  /** Optional user ID initiating the request */
  requestedBy: z.string().optional(),
  /** Optional metadata to attach to the ingestion job */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type IngestRequest = z.infer<typeof IngestRequestSchema>;

// ==================== ExtractionResult ====================

/**
 * ArtifactReference — a reference to a derived artifact (e.g. thumbnail, transcript).
 */
export interface ArtifactReference {
  /** Unique key identifying the artifact in storage */
  key: string;
  /** MIME type of the artifact */
  mediaType: string;
  /** Human-readable label for the artifact */
  label?: string;
  /** Optional URL for accessing the artifact */
  url?: string;
}

/**
 * ExtractionResult — unified output from a MediaAdapter extraction pass.
 * Contains the primary text content, a flexible metadata map, and references
 * to any derived artifacts.
 */
export interface ExtractionResult {
  /** The primary extracted text content */
  text: string;
  /** Arbitrary key-value metadata extracted from the media */
  metadata: Record<string, unknown>;
  /** References to derived artifacts such as thumbnails or transcripts */
  artifacts: ArtifactReference[];
  /** The detected or confirmed media category */
  category: MediaCategory;
  /**
   * Source grounding entries linking extracted claims to their originating
   * passages within the ingested media. Populated when source grounding is
   * enabled for the extraction pass.
   */
  citations?: SourceGrounding[];
}

// ==================== IngestResponse ====================

/**
 * IngestResponse — the result of submitting an ingestion request.
 */
export interface IngestResponse {
  /** Unique identifier for the created ingestion job */
  jobId: string;
  /** Current status of the ingestion job */
  status: "queued" | "processing" | "completed" | "failed";
  /** ISO-8601 timestamp of when the job was created */
  createdAt: string;
  /** The extraction result, populated when status is 'completed' */
  result?: ExtractionResult;
  /** Error message, populated when status is 'failed' */
  error?: string;
}

// ==================== MediaAdapter Interface ====================

/**
 * MediaAdapter — the contract that all media-type-specific adapters must satisfy.
 *
 * Adapters are registered in the AdapterRegistry and are selected at runtime
 * based on the result of `canHandle`.
 */
export interface MediaAdapter {
  /**
   * Returns true if this adapter is capable of processing the given source.
   * Adapters should inspect the mediaType (and optionally the URL) to decide.
   */
  canHandle(source: IngestSource): boolean;

  /**
   * Performs the extraction — downloads/reads the source and produces an
   * ExtractionResult with text, metadata, and artifact references.
   */
  extract(source: IngestSource): Promise<ExtractionResult>;

  /**
   * Returns lightweight metadata about the source without performing a full
   * extraction. Useful for quick inspections or pre-flight checks.
   */
  getMetadata(source: IngestSource): Promise<Record<string, unknown>>;
}

// ==================== AdapterRegistry ====================

/**
 * AdapterRegistry — manages the collection of registered MediaAdapters.
 * Selects the appropriate adapter for a given IngestSource at runtime.
 */
export interface AdapterRegistry {
  /**
   * Register a MediaAdapter with the registry.
   */
  register(adapter: MediaAdapter): void;

  /**
   * Returns the first registered adapter that can handle the given source,
   * or undefined if no matching adapter is found.
   */
  resolve(source: IngestSource): MediaAdapter | undefined;

  /**
   * Returns all registered adapters.
   */
  listAdapters(): MediaAdapter[];
}

// ==================== IngestionJobData (Sidequest) ====================

/**
 * IngestionJobData — the payload stored in the Sidequest queue for an
 * ingestion job. Serialisable; Buffer fields are base64-encoded for
 * file sources so they can survive JSON serialisation.
 */
export interface IngestionJobData {
  /** Unique job identifier (matches IngestResponse.jobId) */
  jobId: string;
  /** The original ingestion request */
  request: {
    source: SerializedIngestSource;
    workspaceId?: string;
    requestedBy?: string;
    metadata?: Record<string, unknown>;
  };
  /** ISO-8601 timestamp of when the job was enqueued */
  enqueuedAt: string;
  /** Number of processing attempts made so far */
  attempts: number;
}

/**
 * Serializable version of IngestSource for queue payloads.
 * Buffer is represented as a base64-encoded string for file sources.
 */
export type SerializedIngestSource =
  | {
      type: "file";
      /** Base64-encoded file content */
      bufferBase64: string;
      mediaType: string;
      fileName?: string;
    }
  | {
      type: "url";
      url: string;
      mediaType?: string;
    };
