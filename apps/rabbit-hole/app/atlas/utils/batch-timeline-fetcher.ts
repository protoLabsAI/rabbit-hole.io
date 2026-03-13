/**
 * Batch Timeline Fetcher
 *
 * Optimizes timeline data fetching for multiple entities by batching requests
 * and implementing intelligent caching to reduce database load.
 */

import type { CompactTimelineData } from "@proto/types";
import { createCompactTimelineData } from "@proto/utils/atlas";

interface BatchTimelineRequest {
  entityUid: string;
  timeWindow: { from: string; to: string };
  granularity?: "day" | "week" | "month";
  importance?: string[];
  limit?: number;
}

interface BatchTimelineResult {
  entityUid: string;
  data: CompactTimelineData | null;
  error: string | null;
}

interface TimelineCache {
  data: CompactTimelineData;
  timestamp: number;
  timeWindow: { from: string; to: string };
}

class BatchTimelineFetcher {
  private cache = new Map<string, TimelineCache>();
  private pendingRequests = new Map<string, Promise<BatchTimelineResult>>();
  private requestQueue: BatchTimelineRequest[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly BATCH_DELAY = 100; // 100ms batch delay
  private readonly BATCH_SIZE = 10; // Max entities per batch

  /**
   * Generate cache key for timeline data
   */
  private generateCacheKey(request: BatchTimelineRequest): string {
    return `${request.entityUid}:${request.timeWindow.from}:${request.timeWindow.to}:${request.granularity || "week"}`;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(
    cached: TimelineCache,
    request: BatchTimelineRequest
  ): boolean {
    const now = Date.now();
    const isExpired = now - cached.timestamp > this.CACHE_TTL;
    const timeWindowMatches =
      cached.timeWindow.from === request.timeWindow.from &&
      cached.timeWindow.to === request.timeWindow.to;

    return !isExpired && timeWindowMatches;
  }

  /**
   * Get timeline data from cache if available and valid
   */
  private getCachedTimeline(
    request: BatchTimelineRequest
  ): CompactTimelineData | null {
    const cacheKey = this.generateCacheKey(request);
    const cached = this.cache.get(cacheKey);

    if (cached && this.isCacheValid(cached, request)) {
      return cached.data;
    }

    // Remove expired cache entry
    if (cached) {
      this.cache.delete(cacheKey);
    }

    return null;
  }

  /**
   * Store timeline data in cache
   */
  private setCachedTimeline(
    request: BatchTimelineRequest,
    data: CompactTimelineData
  ): void {
    const cacheKey = this.generateCacheKey(request);
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      timeWindow: request.timeWindow,
    });
  }

  /**
   * Execute batch timeline fetch
   */
  private async executeBatch(
    requests: BatchTimelineRequest[]
  ): Promise<BatchTimelineResult[]> {
    try {
      // Create batch API request
      const batchParams = requests.map((req) => ({
        entityUid: req.entityUid,
        timeWindow: req.timeWindow,
        importance: req.importance || ["critical", "major", "minor"],
        limit: req.limit || 50,
      }));

      const response = await fetch("/api/entity-timeline/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests: batchParams }),
      });

      if (!response.ok) {
        throw new Error(`Batch timeline fetch failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Batch timeline fetch failed");
      }

      // Process results and create compact timeline data
      return requests.map((request, index) => {
        try {
          const timelineResult = result.data[index];

          if (!timelineResult || timelineResult.error) {
            return {
              entityUid: request.entityUid,
              data: null,
              error: timelineResult?.error || "No timeline data available",
            };
          }

          // Convert to compact format
          const events = timelineResult.events || [];
          const compactData = createCompactTimelineData(
            request.entityUid,
            events,
            request.granularity || "week",
            request.timeWindow
          );

          // Cache the result
          this.setCachedTimeline(request, compactData);

          return {
            entityUid: request.entityUid,
            data: compactData,
            error: null,
          };
        } catch (err) {
          console.error(
            `Error processing timeline for ${request.entityUid}:`,
            err
          );
          return {
            entityUid: request.entityUid,
            data: null,
            error: err instanceof Error ? err.message : "Unknown error",
          };
        }
      });
    } catch (err) {
      console.error("Batch timeline fetch error:", err);
      // Return error for all requests
      return requests.map((request) => ({
        entityUid: request.entityUid,
        data: null,
        error: err instanceof Error ? err.message : "Batch fetch failed",
      }));
    }
  }

  /**
   * Process queued requests in batches
   */
  private async processBatch(): Promise<void> {
    if (this.requestQueue.length === 0) return;

    const batch = this.requestQueue.splice(0, this.BATCH_SIZE);
    const results = await this.executeBatch(batch);

    // Resolve pending promises
    results.forEach((result) => {
      const pendingPromise = this.pendingRequests.get(result.entityUid);
      if (pendingPromise) {
        // This is handled by the promise resolution mechanism
        this.pendingRequests.delete(result.entityUid);
      }
    });

    // Process remaining queue if any
    if (this.requestQueue.length > 0) {
      this.batchTimeout = setTimeout(
        () => this.processBatch(),
        this.BATCH_DELAY
      );
    }
  }

  /**
   * Fetch timeline data for a single entity (with batching)
   */
  async fetchTimeline(
    request: BatchTimelineRequest
  ): Promise<BatchTimelineResult> {
    // Check cache first
    const cached = this.getCachedTimeline(request);
    if (cached) {
      return {
        entityUid: request.entityUid,
        data: cached,
        error: null,
      };
    }

    // Check if request is already pending
    const pending = this.pendingRequests.get(request.entityUid);
    if (pending) {
      return pending;
    }

    // Create promise for this request
    const promise = new Promise<BatchTimelineResult>((resolve) => {
      // Add to queue
      this.requestQueue.push(request);

      // Set up batch processing
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(async () => {
          await this.processBatch();
          this.batchTimeout = null;

          // Find and resolve this specific request
          const cached = this.getCachedTimeline(request);
          resolve({
            entityUid: request.entityUid,
            data: cached,
            error: cached ? null : "Timeline data not available",
          });
        }, this.BATCH_DELAY);
      }
    });

    this.pendingRequests.set(request.entityUid, promise);
    return promise;
  }

  /**
   * Fetch timeline data for multiple entities in a single batch
   */
  async fetchMultipleTimelines(
    requests: BatchTimelineRequest[]
  ): Promise<BatchTimelineResult[]> {
    const results: BatchTimelineResult[] = [];
    const uncachedRequests: BatchTimelineRequest[] = [];

    // Check cache for each request
    for (const request of requests) {
      const cached = this.getCachedTimeline(request);
      if (cached) {
        results.push({
          entityUid: request.entityUid,
          data: cached,
          error: null,
        });
      } else {
        uncachedRequests.push(request);
      }
    }

    // Batch fetch uncached requests
    if (uncachedRequests.length > 0) {
      const batchResults = await this.executeBatch(uncachedRequests);
      results.push(...batchResults);
    }

    // Return results in original order
    return requests.map(
      (request) =>
        results.find((result) => result.entityUid === request.entityUid) || {
          entityUid: request.entityUid,
          data: null,
          error: "Request not processed",
        }
    );
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ key: string; timestamp: number }>;
  } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, cache]) => ({
        key,
        timestamp: cache.timestamp,
      })),
    };
  }
}

// Global instance for batch timeline fetching
export const batchTimelineFetcher = new BatchTimelineFetcher();

// Export types for external use
export type { BatchTimelineRequest, BatchTimelineResult };
