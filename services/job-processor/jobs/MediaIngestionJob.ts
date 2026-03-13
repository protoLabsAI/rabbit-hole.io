/**
 * Media Ingestion Job
 *
 * Handles media ingestion from various sources (file or URL) by:
 * 1. Downloading/resolving the source
 * 2. Selecting the appropriate adapter via AdapterRegistry
 * 3. Running extraction to produce text, metadata, and artifacts
 * 4. Storing results back to MinIO
 * 5. Emitting progress/completion via PostgreSQL NOTIFY
 */

import { Client } from "minio";
import { Job } from "sidequest";

import { getGlobalPostgresPool } from "@proto/database";
import type {
  AdapterRegistry,
  ExtractionResult,
  IngestionJobData,
  IngestSource,
  MediaAdapter,
  SerializedIngestSource,
} from "@proto/types";

// ==================== Simple AdapterRegistry Implementation ====================

/**
 * SimpleAdapterRegistry — a lightweight in-memory implementation of the
 * AdapterRegistry interface. Adapters are evaluated in registration order;
 * the first one whose canHandle() returns true is selected.
 */
export class SimpleAdapterRegistry implements AdapterRegistry {
  private adapters: MediaAdapter[] = [];

  register(adapter: MediaAdapter): void {
    this.adapters.push(adapter);
    console.log(
      `📦 Registered adapter: ${adapter.constructor?.name ?? "unknown"}`
    );
  }

  resolve(source: IngestSource): MediaAdapter | undefined {
    return this.adapters.find((a) => a.canHandle(source));
  }

  listAdapters(): MediaAdapter[] {
    return [...this.adapters];
  }
}

/**
 * Shared singleton registry. Adapters should be registered here at startup
 * before jobs begin processing.
 */
export const adapterRegistry = new SimpleAdapterRegistry();

// ==================== MinIO Results Client ====================

function createMinioClient(): Client {
  return new Client({
    endPoint:
      process.env.MINIO_ENDPOINT?.replace("http://", "").replace(
        "https://",
        ""
      ) || "localhost",
    port: parseInt(process.env.MINIO_PORT || "9000"),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY || "minio",
    secretKey: process.env.MINIO_SECRET_KEY || "minio123",
  });
}

// ==================== MediaIngestionJob ====================

export class MediaIngestionJob extends Job {
  private minioClient = createMinioClient();
  private resultsBucket =
    process.env.MINIO_RESULTS_BUCKET || "evidence-processed";
  private sourceBucket = process.env.MINIO_SOURCE_BUCKET || "evidence-raw";

  async run(data: IngestionJobData) {
    const { jobId, request } = data;

    console.log(`🎬 Starting media ingestion job ${jobId}`);

    // Signal that we have started processing
    await this.emitProgress(jobId, "processing", request);

    try {
      // 1. Deserialize the ingest source
      const ingestSource = this.deserializeSource(request.source);

      // 2. Resolve the adapter
      const adapter = adapterRegistry.resolve(ingestSource);
      if (!adapter) {
        const sourceDesc =
          ingestSource.type === "file"
            ? `file (${ingestSource.mediaType})`
            : `url (${ingestSource.url})`;
        throw new AdapterNotFoundError(
          `No registered adapter can handle source: ${sourceDesc}`
        );
      }

      console.log(
        `🔧 Using adapter: ${adapter.constructor?.name ?? "unknown"} for job ${jobId}`
      );

      // 3. Run the extraction
      const result = await adapter.extract(ingestSource);

      console.log(
        `📊 Extraction complete for ${jobId}: ${result.text.length} chars, ${result.artifacts.length} artifacts`
      );

      // 4. Store results back to MinIO
      const resultsKey = `ingestion-results/${jobId}/result.json`;
      await this.storeResults(resultsKey, result);

      console.log(`✅ Media ingestion completed for job ${jobId}`);

      // 5. Emit completion notification
      await this.emitCompletion(jobId, resultsKey, result, request);

      return {
        success: true,
        jobId,
        resultsKey,
        category: result.category,
        textLength: result.text.length,
        artifactsCount: result.artifacts.length,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.error(`❌ Media ingestion failed for job ${jobId}:`, error);

      // Notify listeners about the failure
      await this.emitProgress(jobId, "failed", request, errorMessage);

      // Re-throw so Sidequest can handle retry logic.
      // Non-retriable errors (e.g. missing adapter) are wrapped to signal
      // that retrying will not help — callers may inspect the error type.
      throw error;
    }
  }

  // ==================== Private Helpers ====================

  /**
   * Convert a serialized queue payload back to a live IngestSource.
   * File sources have their buffer base64-encoded for JSON transport.
   */
  private deserializeSource(serialized: SerializedIngestSource): IngestSource {
    if (serialized.type === "file") {
      return {
        type: "file",
        buffer: Buffer.from(serialized.bufferBase64, "base64"),
        mediaType: serialized.mediaType,
        fileName: serialized.fileName,
      };
    }

    return {
      type: "url",
      url: serialized.url,
      mediaType: serialized.mediaType,
    };
  }

  /**
   * Serialize and store an ExtractionResult as JSON in MinIO.
   * Creates the bucket if it does not exist.
   */
  private async storeResults(
    key: string,
    result: ExtractionResult
  ): Promise<void> {
    try {
      // Ensure the results bucket exists
      const bucketExists = await this.minioClient.bucketExists(
        this.resultsBucket
      );
      if (!bucketExists) {
        await this.minioClient.makeBucket(this.resultsBucket);
        console.log(`📦 Created MinIO bucket: ${this.resultsBucket}`);
      }

      const json = JSON.stringify(result, null, 2);
      const buffer = Buffer.from(json, "utf-8");

      await this.minioClient.putObject(
        this.resultsBucket,
        key,
        buffer,
        buffer.length,
        { "Content-Type": "application/json" }
      );

      console.log(`💾 Stored results to MinIO: ${this.resultsBucket}/${key}`);
    } catch (error) {
      throw new Error(
        `Failed to store results in MinIO: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Emit a progress update via PostgreSQL NOTIFY on the
   * 'media_ingestion_progress' channel.
   */
  private async emitProgress(
    jobId: string,
    status: "processing" | "failed",
    request: IngestionJobData["request"],
    error?: string
  ): Promise<void> {
    await this.notify("media_ingestion_progress", {
      jobId,
      status,
      workspaceId: request.workspaceId,
      requestedBy: request.requestedBy,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit a completion event via PostgreSQL NOTIFY on the
   * 'media_ingestion_progress' channel.
   */
  private async emitCompletion(
    jobId: string,
    resultsKey: string,
    result: ExtractionResult,
    request: IngestionJobData["request"]
  ): Promise<void> {
    await this.notify("media_ingestion_progress", {
      jobId,
      status: "completed",
      resultsKey,
      category: result.category,
      textLength: result.text.length,
      artifactsCount: result.artifacts.length,
      workspaceId: request.workspaceId,
      requestedBy: request.requestedBy,
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Send a PostgreSQL NOTIFY on the given channel with a JSON payload.
   * Failures here are logged but do not interrupt job processing.
   */
  private async notify(
    channel: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    try {
      const pool = getGlobalPostgresPool();
      await pool.query(`SELECT pg_notify($1, $2)`, [
        channel,
        JSON.stringify(payload),
      ]);
    } catch (err) {
      // Notification failures are non-fatal — log and continue
      console.warn(
        `⚠️ Failed to emit NOTIFY on channel '${channel}':`,
        err instanceof Error ? err.message : err
      );
    }
  }
}

// ==================== Error Types ====================

/**
 * Thrown when no adapter in the registry can handle the given source.
 * Callers may inspect this type to skip retry logic for unresolvable sources.
 */
export class AdapterNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdapterNotFoundError";
  }
}
