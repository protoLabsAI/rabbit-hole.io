/**
 * Time Slice Data Cache
 *
 * Intelligent caching system for time slice data with LRU eviction
 * and smart prefetching strategies.
 */

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheOptions {
  maxSize: number;
  maxAge: number; // milliseconds
  prefetchThreshold: number; // prefetch when this many items left
}

export class TimeSliceCache {
  private cache = new Map<string, CacheEntry>();
  private options: CacheOptions;

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = {
      maxSize: 50,
      maxAge: 5 * 60 * 1000, // 5 minutes
      prefetchThreshold: 0.8,
      ...options,
    };
  }

  /**
   * Generate cache key from time slice parameters
   */
  generateKey(params: {
    timeWindow: { from: string; to: string };
    entityUid?: string;
    cursor?: string;
    pageSize?: number;
    aggregate?: boolean;
    granularity?: string;
    sentiments?: string[];
    entityTypes?: string[];
  }): string {
    const keyParts = [
      `${params.timeWindow.from}-${params.timeWindow.to}`,
      params.entityUid || "all",
      params.cursor || "first",
      params.pageSize || 1000,
      params.aggregate ? "agg" : "raw",
      params.granularity || "day",
      params.sentiments?.join(",") || "all",
      params.entityTypes?.join(",") || "all",
    ];
    return keyParts.join("|");
  }

  /**
   * Get cached data if available and fresh
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > this.options.maxAge) {
      this.cache.delete(key);
      return null;
    }

    // Update access stats
    entry.lastAccessed = now;
    entry.accessCount++;

    return entry.data;
  }

  /**
   * Store data in cache with LRU eviction
   */
  set(key: string, data: any): void {
    const now = Date.now();

    // Evict if at capacity
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, {
      key,
      data,
      timestamp: now,
      lastAccessed: now,
      accessCount: 1,
    });
  }

  /**
   * Prefetch next page based on current cursor
   */
  async prefetchNext(
    currentKey: string,
    fetchFn: (key: string) => Promise<any>
  ): Promise<void> {
    const entry = this.cache.get(currentKey);
    if (!entry?.data?.pagination?.cursor) return;

    // Generate next page key (simplified - would need more context in real usage)
    const nextKey = currentKey.replace(/first$/, entry.data.pagination.cursor);

    if (!this.cache.has(nextKey)) {
      try {
        const nextData = await fetchFn(nextKey);
        this.set(nextKey, nextData);
      } catch (error) {
        console.warn("Prefetch failed:", error);
      }
    }
  }

  /**
   * Smart eviction based on LRU and access patterns
   */
  private evictLeastRecentlyUsed(): void {
    let oldestEntry: CacheEntry | null = null;
    let oldestKey = "";

    for (const [key, entry] of this.cache.entries()) {
      if (!oldestEntry || entry.lastAccessed < oldestEntry.lastAccessed) {
        oldestEntry = entry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clear expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.options.maxAge) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    averageAge: number;
  } {
    const now = Date.now();
    let totalAccesses = 0;
    let totalAge = 0;

    for (const entry of this.cache.values()) {
      totalAccesses += entry.accessCount;
      totalAge += now - entry.timestamp;
    }

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hitRate: this.cache.size > 0 ? totalAccesses / this.cache.size : 0,
      averageAge: this.cache.size > 0 ? totalAge / this.cache.size : 0,
    };
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
export const globalTimeSliceCache = new TimeSliceCache();
