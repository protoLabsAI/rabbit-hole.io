/**
 * Timeline Cache Utilities
 *
 * Performance optimization for timeline data fetching with intelligent caching,
 * cache invalidation, and memory management.
 */

import type {
  CompactTimelineData,
  TimelineResult,
  TimelineFilters,
} from "@proto/types";

export interface TimelineCacheEntry {
  data: TimelineResult | CompactTimelineData;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  filters?: TimelineFilters;
  granularity?: string;
}

export interface TimelineCacheStats {
  totalEntries: number;
  memoryUsage: number; // Estimated bytes
  hitRate: number; // Cache hit percentage
  oldestEntry: number; // Timestamp
  newestEntry: number; // Timestamp
}

export interface TimelineCacheConfig {
  maxEntries: number;
  maxAge: number; // milliseconds
  maxMemory: number; // bytes
  cleanupInterval: number; // milliseconds
}

const DEFAULT_CACHE_CONFIG: TimelineCacheConfig = {
  maxEntries: 100,
  maxAge: 5 * 60 * 1000, // 5 minutes
  maxMemory: 10 * 1024 * 1024, // 10MB
  cleanupInterval: 60 * 1000, // 1 minute
};

/**
 * Timeline Cache Manager
 *
 * Manages in-memory caching of timeline data with automatic cleanup
 * and performance optimization.
 */
export class TimelineCache {
  private cache = new Map<string, TimelineCacheEntry>();
  private config: TimelineCacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private hitCount = 0;
  private missCount = 0;

  constructor(config: Partial<TimelineCacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.startCleanupTimer();
  }

  /**
   * Generate cache key from parameters
   */
  private getCacheKey(
    entityUid: string,
    filters?: TimelineFilters,
    granularity?: string
  ): string {
    const filterKey = filters ? JSON.stringify(filters) : "default";
    const granularityKey = granularity || "default";
    return `${entityUid}:${filterKey}:${granularityKey}`;
  }

  /**
   * Estimate memory usage of cache entry
   */
  private estimateEntrySize(entry: TimelineCacheEntry): number {
    try {
      return JSON.stringify(entry.data).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1000; // Fallback estimate
    }
  }

  /**
   * Get timeline data from cache
   */
  get(
    entityUid: string,
    filters?: TimelineFilters,
    granularity?: string
  ): TimelineResult | CompactTimelineData | null {
    const key = this.getCacheKey(entityUid, filters, granularity);
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if entry is expired
    const now = Date.now();
    if (now - entry.timestamp > this.config.maxAge) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.hitCount++;

    return entry.data;
  }

  /**
   * Store timeline data in cache
   */
  set(
    entityUid: string,
    data: TimelineResult | CompactTimelineData,
    filters?: TimelineFilters,
    granularity?: string
  ): void {
    const key = this.getCacheKey(entityUid, filters, granularity);
    const now = Date.now();

    const entry: TimelineCacheEntry = {
      data,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
      filters,
      granularity,
    };

    this.cache.set(key, entry);

    // Trigger cleanup if needed
    this.performCleanupIfNeeded();
  }

  /**
   * Remove specific entity from cache
   */
  invalidate(entityUid: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(`${entityUid}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): TimelineCacheStats {
    const entries = Array.from(this.cache.values());
    const totalMemory = entries.reduce(
      (sum, entry) => sum + this.estimateEntrySize(entry),
      0
    );

    const timestamps = entries.map((e) => e.timestamp);
    const totalRequests = this.hitCount + this.missCount;

    return {
      totalEntries: entries.length,
      memoryUsage: totalMemory,
      hitRate: totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
    };
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Perform cleanup if cache exceeds limits
   */
  private performCleanupIfNeeded(): void {
    const stats = this.getStats();

    if (
      stats.totalEntries > this.config.maxEntries ||
      stats.memoryUsage > this.config.maxMemory
    ) {
      this.performCleanup();
    }
  }

  /**
   * Clean up expired and least-used entries
   */
  private performCleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // Remove expired entries
    const validEntries = entries.filter(([key, entry]) => {
      const isExpired = now - entry.timestamp > this.config.maxAge;
      if (isExpired) {
        this.cache.delete(key);
      }
      return !isExpired;
    });

    // If still over limits, remove least recently used entries
    if (validEntries.length > this.config.maxEntries) {
      // Sort by last accessed (oldest first)
      validEntries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

      const entriesToRemove = validEntries.length - this.config.maxEntries;
      for (let i = 0; i < entriesToRemove; i++) {
        this.cache.delete(validEntries[i][0]);
      }
    }
  }

  /**
   * Cleanup on destruction
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

// Global cache instance
let globalTimelineCache: TimelineCache | null = null;

/**
 * Get or create global timeline cache instance
 */
export function getTimelineCache(): TimelineCache {
  if (!globalTimelineCache) {
    globalTimelineCache = new TimelineCache();
  }
  return globalTimelineCache;
}

/**
 * Hook for React components to use timeline cache
 */
export function useTimelineCache() {
  const cache = getTimelineCache();

  return {
    get: cache.get.bind(cache),
    set: cache.set.bind(cache),
    invalidate: cache.invalidate.bind(cache),
    clear: cache.clear.bind(cache),
    getStats: cache.getStats.bind(cache),
  };
}

/**
 * Cached timeline data fetcher
 */
export async function getCachedTimelineData(
  entityUid: string,
  fetcher: () => Promise<TimelineResult>,
  filters?: TimelineFilters
): Promise<TimelineResult> {
  const cache = getTimelineCache();

  // Try to get from cache first
  const cached = cache.get(entityUid, filters) as TimelineResult | null;
  if (cached) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache
  cache.set(entityUid, data, filters);

  return data;
}

/**
 * Cached compact timeline data fetcher
 */
export async function getCachedCompactTimelineData(
  entityUid: string,
  granularity: string,
  fetcher: () => Promise<CompactTimelineData>,
  filters?: TimelineFilters
): Promise<CompactTimelineData> {
  const cache = getTimelineCache();

  // Try to get from cache first
  const cached = cache.get(
    entityUid,
    filters,
    granularity
  ) as CompactTimelineData | null;
  if (cached) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache
  cache.set(entityUid, data, filters, granularity);

  return data;
}
