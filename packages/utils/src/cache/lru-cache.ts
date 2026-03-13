/**
 * Generic LRU Cache with TTL Support
 *
 * High-performance Least Recently Used cache implementation using JavaScript Map.
 * Features:
 * - O(1) get, set, delete operations
 * - TTL (Time-To-Live) support for automatic expiration
 * - Memory-bounded with configurable max size
 * - Hit/miss rate tracking
 * - Type-safe generic implementation
 *
 * Based on 2025 best practices: https://markmurray.co/blog/lru-cache/
 */

export interface LRUCacheOptions {
  /**
   * Maximum number of entries in cache
   * When exceeded, least recently used entry is evicted
   */
  maxSize: number;

  /**
   * Time-to-live in milliseconds
   * Entries older than TTL are considered stale
   * @default undefined (no expiration)
   */
  ttl?: number;

  /**
   * Optional callback when entry is evicted
   */
  onEvict?: (key: string, value: any) => void;
}

export interface LRUCacheEntry<V> {
  value: V;
  timestamp: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
}

/**
 * LRU Cache Implementation
 *
 * Uses JavaScript Map which maintains insertion order.
 * Most recently used items are moved to end of Map.
 * Least recently used items are at the beginning.
 *
 * @example
 * ```typescript
 * const cache = new LRUCache<string, User>({ maxSize: 100, ttl: 60000 });
 *
 * cache.set("user:123", { name: "Alice" });
 * const user = cache.get("user:123"); // Cache hit
 *
 * console.log(cache.stats()); // { hits: 1, misses: 0, hitRate: 100 }
 * ```
 */
export class LRUCache<K extends string | number, V> {
  private cache = new Map<K, LRUCacheEntry<V>>();
  private readonly options: Required<LRUCacheOptions>;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(options: LRUCacheOptions) {
    this.options = {
      maxSize: options.maxSize,
      ttl: options.ttl ?? Infinity,
      onEvict: options.onEvict ?? (() => {}),
    };

    if (this.options.maxSize < 1) {
      throw new Error("maxSize must be at least 1");
    }
  }

  /**
   * Get value from cache
   * Returns undefined if not found or expired
   * Moves accessed entry to end (most recently used)
   *
   * @param key - Cache key
   * @returns Cached value or undefined
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check TTL expiration
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    // Update access stats
    this.hits++;

    return entry.value;
  }

  /**
   * Set value in cache
   * Evicts least recently used entry if at capacity
   * Updates timestamp for TTL tracking
   *
   * @param key - Cache key
   * @param value - Value to cache
   */
  set(key: K, value: V): void {
    // If key exists, delete it first (will be re-added at end)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.options.maxSize) {
      this.evictOldest();
    }

    // Add new entry at end (most recently used)
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if entry exists (without updating recency)
   *
   * @param key - Cache key
   * @returns true if key exists and not expired
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete entry from cache
   *
   * @param key - Cache key
   * @returns true if entry was deleted
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Get all keys in cache (most recent last)
   *
   * @returns Array of keys in LRU order
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get current size of cache
   *
   * @returns Number of entries
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   *
   * @returns Performance and usage metrics
   */
  stats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      evictions: this.evictions,
    };
  }

  /**
   * Remove expired entries
   * Returns number of entries removed
   *
   * @returns Count of expired entries removed
   */
  prune(): number {
    if (this.options.ttl === Infinity) return 0;

    let removed = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.options.ttl) {
        this.cache.delete(key);
        this.options.onEvict(key as string, entry.value);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get all entries as array (for debugging)
   *
   * @returns Array of [key, value] tuples
   */
  entries(): Array<[K, V]> {
    return Array.from(this.cache.entries()).map(([key, entry]) => [
      key,
      entry.value,
    ]);
  }

  /**
   * Reset statistics (hits, misses, evictions)
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Check if entry is expired based on TTL
   */
  private isExpired(entry: LRUCacheEntry<V>): boolean {
    if (this.options.ttl === Infinity) return false;
    return Date.now() - entry.timestamp > this.options.ttl;
  }

  /**
   * Evict least recently used entry (first entry in Map)
   */
  private evictOldest(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      const entry = this.cache.get(firstKey);
      this.cache.delete(firstKey);
      this.evictions++;

      if (entry) {
        this.options.onEvict(firstKey as string, entry.value);
      }
    }
  }
}

/**
 * Create LRU cache with sensible defaults for API responses
 *
 * @param maxSize - Maximum entries (default: 100)
 * @param ttl - Time-to-live in ms (default: 5 minutes)
 * @returns Configured LRU cache
 *
 * @example
 * ```typescript
 * const apiCache = createDefaultLRUCache<string, ApiResponse>(50, 300000);
 * ```
 */
export function createDefaultLRUCache<K extends string | number, V>(
  maxSize: number = 100,
  ttl: number = 5 * 60 * 1000
): LRUCache<K, V> {
  return new LRUCache({ maxSize, ttl });
}
