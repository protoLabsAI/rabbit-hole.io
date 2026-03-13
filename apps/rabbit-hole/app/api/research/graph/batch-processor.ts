/**
 * Batch Processing for LangExtract Service
 *
 * Handles chunking large source payloads into manageable batches,
 * with token estimation, retries, backpressure, and result merging.
 */

import type { SourceData } from "./source-fetcher";

export interface BatchConfig {
  /** Max characters per batch (~4 chars ≈ 1 token) */
  maxCharsPerBatch: number;
  /** Max number of sources per batch */
  maxSourcesPerBatch: number;
  /** Max retry attempts per batch */
  maxRetries: number;
  /** Retry delay in ms */
  retryDelayMs: number;
  /** Backpressure throttle between batches (ms) */
  throttleMs: number;
  /** Per-batch processor timeout (ms). If exceeded, attempt is failed. */
  requestTimeoutMs: number;
}

export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  maxCharsPerBatch: 32000, // ~8k tokens (conservative)
  maxSourcesPerBatch: 5,
  maxRetries: 3,
  retryDelayMs: 500,
  throttleMs: 100,
  requestTimeoutMs: 30000,
};

export interface SourceBatch {
  sourceIds: string[]; // identifiers to track results
  content: string;
  charCount: number;
  sourceCount: number;
  batchIndex: number;
}

export interface BatchResult<T> {
  batchIndex: number;
  success: boolean;
  data: T;
  sourceIds: string[];
  error?: string;
  retryCount: number;
}

/**
 * Estimate token count (conservative: 4 chars ≈ 1 token)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Create source batches respecting size and item limits
 */
export function createSourceBatches(
  sourceData: SourceData[],
  config: BatchConfig = DEFAULT_BATCH_CONFIG
): SourceBatch[] {
  const DELIMITER = "\n\n---\n\n";
  const DELIMITER_LENGTH = DELIMITER.length; // 7 characters

  const batches: SourceBatch[] = [];
  let currentBatch: SourceData[] = [];
  let currentChars = 0;
  let batchIndex = 0;

  for (const source of sourceData) {
    const sourceChars = source.content.length;

    // If a single source exceeds maxCharsPerBatch, split it into chunks
    if (sourceChars > config.maxCharsPerBatch) {
      // First, finalize current batch if it has items
      if (currentBatch.length > 0) {
        const content = currentBatch.map((s) => s.content).join(DELIMITER);
        batches.push({
          sourceIds: currentBatch.map((s) => s.identifier),
          content,
          charCount: content.length,
          sourceCount: currentBatch.length,
          batchIndex,
        });
        batchIndex++;
        currentBatch = [];
        currentChars = 0;
      }

      // Split oversized source into chunks
      const chunkSize = config.maxCharsPerBatch;
      let chunkIndex = 0;
      let offset = 0;

      while (offset < sourceChars) {
        const chunk = source.content.substring(offset, offset + chunkSize);
        const chunkIdentifier =
          chunkIndex > 0
            ? `${source.identifier}__chunk_${chunkIndex}`
            : source.identifier;

        batches.push({
          sourceIds: [chunkIdentifier],
          content: chunk,
          charCount: chunk.length,
          sourceCount: 1,
          batchIndex,
        });

        batchIndex++;
        offset += chunkSize;
        chunkIndex++;
      }

      continue;
    }

    // Check if adding this source would exceed limits
    // Account for delimiter when calculating total character count
    const delimiterCharsForThisBatch =
      currentBatch.length > 0 ? DELIMITER_LENGTH : 0;
    const wouldExceedChars =
      currentChars + delimiterCharsForThisBatch + sourceChars >
      config.maxCharsPerBatch;
    const wouldExceedCount = currentBatch.length >= config.maxSourcesPerBatch;

    if (currentBatch.length > 0 && (wouldExceedChars || wouldExceedCount)) {
      // Finalize current batch
      const content = currentBatch.map((s) => s.content).join(DELIMITER);
      batches.push({
        sourceIds: currentBatch.map((s) => s.identifier),
        content,
        charCount: content.length,
        sourceCount: currentBatch.length,
        batchIndex,
      });

      batchIndex++;
      currentBatch = [];
      currentChars = 0;
    }

    currentBatch.push(source);
    // Update currentChars: add delimiter if not the first item, plus source content
    if (currentChars > 0) {
      currentChars += DELIMITER_LENGTH;
    }
    currentChars += sourceChars;
  }

  // Add remaining batch
  if (currentBatch.length > 0) {
    const content = currentBatch.map((s) => s.content).join(DELIMITER);
    batches.push({
      sourceIds: currentBatch.map((s) => s.identifier),
      content,
      charCount: content.length,
      sourceCount: currentBatch.length,
      batchIndex,
    });
  }

  return batches;
}

/**
 * Process batches with retry logic and backpressure control
 */
export async function processBatchesWithRetry<T>(
  batches: SourceBatch[],
  processor: (batch: SourceBatch) => Promise<T>,
  config: BatchConfig = DEFAULT_BATCH_CONFIG
): Promise<BatchResult<T>[]> {
  const results: BatchResult<T>[] = [];

  for (const batch of batches) {
    let lastError: Error | null = null;
    let retryCount = 0;

    // Retry loop
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const data = await Promise.race([
          processor(batch),
          new Promise<T>((_, reject) =>
            setTimeout(
              () => reject(new Error("Request timed out")),
              config.requestTimeoutMs
            )
          ),
        ]);

        results.push({
          batchIndex: batch.batchIndex,
          success: true,
          data,
          sourceIds: batch.sourceIds,
          retryCount,
        });

        break; // Success, exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount = attempt + 1;

        if (attempt < config.maxRetries) {
          // Exponential backoff: base delay * 2^attempt
          const delayMs = config.retryDelayMs * Math.pow(2, attempt);
          console.warn(
            `Batch ${batch.batchIndex} failed (attempt ${attempt + 1}/${config.maxRetries + 1}), ` +
              `retrying in ${delayMs}ms: ${lastError.message}`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          console.error(
            `Batch ${batch.batchIndex} failed after ${config.maxRetries + 1} attempts: ${lastError.message}`
          );
        }
      }
    }

    // If all retries failed, record the failure
    // Check if no successful result exists for this batch already
    const hasSuccessfulResult = results.some(
      (r) => r.batchIndex === batch.batchIndex && r.success
    );

    if (!hasSuccessfulResult && lastError) {
      results.push({
        batchIndex: batch.batchIndex,
        success: false,
        data: null as any,
        sourceIds: batch.sourceIds,
        error: lastError.message ?? "Unknown error",
        retryCount,
      });
    }

    // Backpressure: throttle between batches to avoid overwhelming the service
    if (batch !== batches[batches.length - 1]) {
      await new Promise((resolve) => setTimeout(resolve, config.throttleMs));
    }
  }

  return results;
}

/**
 * Merge batch results, preserving source tracking
 */
export function mergeBatchResults<T = any>(
  batchResults: BatchResult<T>[],
  mergeStrategy: "array" | "dedupe" = "array"
): {
  merged: T[];
  sourceMap: Map<string, string[]>; // Result ID -> source IDs
  failedBatches: number[];
} {
  const merged: T[] = [];
  const sourceMap = new Map<string, string[]>();
  const failedBatches: number[] = [];

  if (mergeStrategy === "dedupe") {
    // Fast O(n) deduplication using Map lookup: itemId -> index in merged array
    const itemIdToIndex = new Map<string, number>();

    for (const result of batchResults) {
      if (!result.success) {
        failedBatches.push(result.batchIndex);
        continue;
      }

      const data = Array.isArray(result.data) ? result.data : [result.data];

      for (const item of data) {
        const itemId =
          (item as any).uid ||
          (item as any).id ||
          JSON.stringify(item).substring(0, 32);

        // Check if item already exists by itemId
        const existingIndex = itemIdToIndex.get(itemId);
        if (existingIndex !== undefined) {
          // Item exists: merge sourceIds (union them to avoid duplicates)
          const existingSourceIds = sourceMap.get(itemId) || [];
          const mergedSourceIds = Array.from(
            new Set([...existingSourceIds, ...result.sourceIds])
          );
          sourceMap.set(itemId, mergedSourceIds);
        } else {
          // New item: add to merged and track in map
          itemIdToIndex.set(itemId, merged.length);
          merged.push(item);
          sourceMap.set(itemId, result.sourceIds);
        }
      }
    }
  } else {
    // Non-dedupe: keep current push+set behavior
    for (const result of batchResults) {
      if (!result.success) {
        failedBatches.push(result.batchIndex);
        continue;
      }

      const data = Array.isArray(result.data) ? result.data : [result.data];

      for (const item of data) {
        const itemId =
          (item as any).uid ||
          (item as any).id ||
          JSON.stringify(item).substring(0, 32);

        merged.push(item);
        sourceMap.set(itemId, result.sourceIds);
      }
    }
  }

  return { merged, sourceMap, failedBatches };
}
