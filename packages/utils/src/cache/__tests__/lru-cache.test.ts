/**
 * LRU Cache Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { LRUCache, createDefaultLRUCache } from "../lru-cache";

describe("LRUCache", () => {
  describe("Basic Operations", () => {
    it("should store and retrieve values", () => {
      const cache = new LRUCache<string, string>({ maxSize: 3 });

      cache.set("a", "value-a");
      cache.set("b", "value-b");

      expect(cache.get("a")).toBe("value-a");
      expect(cache.get("b")).toBe("value-b");
      expect(cache.size()).toBe(2);
    });

    it("should return undefined for missing keys", () => {
      const cache = new LRUCache<string, number>({ maxSize: 10 });

      expect(cache.get("missing")).toBeUndefined();
      expect(cache.stats().misses).toBe(1);
    });

    it("should update existing keys", () => {
      const cache = new LRUCache<string, number>({ maxSize: 3 });

      cache.set("a", 1);
      cache.set("a", 2);

      expect(cache.get("a")).toBe(2);
      expect(cache.size()).toBe(1);
    });
  });

  describe("LRU Eviction", () => {
    it("should evict least recently used entry when full", () => {
      const cache = new LRUCache<number, string>({ maxSize: 3 });

      cache.set(1, "A");
      cache.set(2, "B");
      cache.set(3, "C");

      // Cache is full, adding 4 should evict 1 (least recently used)
      cache.set(4, "D");

      expect(cache.get(1)).toBeUndefined(); // Evicted
      expect(cache.get(2)).toBe("B");
      expect(cache.get(3)).toBe("C");
      expect(cache.get(4)).toBe("D");
      expect(cache.size()).toBe(3);
    });

    it("should move accessed entries to end (most recent)", () => {
      const cache = new LRUCache<number, string>({ maxSize: 3 });

      cache.set(1, "A");
      cache.set(2, "B");
      cache.set(3, "C");

      // Access 1, making it most recently used
      cache.get(1);

      // Add 4, should evict 2 (least recently used)
      cache.set(4, "D");

      expect(cache.get(1)).toBe("A"); // Still present
      expect(cache.get(2)).toBeUndefined(); // Evicted
      expect(cache.get(3)).toBe("C");
      expect(cache.get(4)).toBe("D");
    });

    it("should track eviction count", () => {
      const cache = new LRUCache<string, number>({ maxSize: 2 });

      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3); // Evicts a
      cache.set("d", 4); // Evicts b

      expect(cache.stats().evictions).toBe(2);
    });
  });

  describe("TTL (Time-To-Live)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should expire entries after TTL", () => {
      const cache = new LRUCache<string, string>({
        maxSize: 10,
        ttl: 60000, // 1 minute
      });

      cache.set("a", "value-a");
      expect(cache.get("a")).toBe("value-a");

      // Advance time by 61 seconds
      vi.advanceTimersByTime(61000);

      // Entry should be expired
      expect(cache.get("a")).toBeUndefined();
      expect(cache.stats().misses).toBe(1);
    });

    it("should not expire entries without TTL", () => {
      const cache = new LRUCache<string, string>({
        maxSize: 10,
        // No TTL
      });

      cache.set("a", "value-a");

      // Advance time by 1 hour
      vi.advanceTimersByTime(3600000);

      // Entry should still be valid
      expect(cache.get("a")).toBe("value-a");
    });

    it("should refresh TTL on re-set", () => {
      const cache = new LRUCache<string, string>({
        maxSize: 10,
        ttl: 60000,
      });

      cache.set("a", "value-a");

      // Advance 30 seconds
      vi.advanceTimersByTime(30000);

      // Re-set refreshes timestamp
      cache.set("a", "value-a-updated");

      // Advance another 40 seconds (70 total from first set)
      vi.advanceTimersByTime(40000);

      // Entry should still be valid (40s since re-set)
      expect(cache.get("a")).toBe("value-a-updated");
    });

    it("should prune expired entries", () => {
      const cache = new LRUCache<string, number>({
        maxSize: 10,
        ttl: 60000,
      });

      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3);

      // Advance past TTL
      vi.advanceTimersByTime(61000);

      const pruned = cache.prune();

      expect(pruned).toBe(3);
      expect(cache.size()).toBe(0);
    });
  });

  describe("Statistics", () => {
    it("should track hit rate correctly", () => {
      const cache = new LRUCache<string, number>({ maxSize: 10 });

      cache.set("a", 1);
      cache.set("b", 2);

      cache.get("a"); // Hit
      cache.get("a"); // Hit
      cache.get("c"); // Miss
      cache.get("b"); // Hit

      const stats = cache.stats();

      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(75); // 3/4 = 75%
    });

    it("should provide accurate size metrics", () => {
      const cache = new LRUCache<string, string>({ maxSize: 5 });

      cache.set("a", "1");
      cache.set("b", "2");
      cache.set("c", "3");

      const stats = cache.stats();

      expect(stats.size).toBe(3);
      expect(stats.maxSize).toBe(5);
    });
  });

  describe("Advanced Features", () => {
    it("should support has() without updating recency", () => {
      const cache = new LRUCache<string, string>({ maxSize: 2 });

      cache.set("a", "A");
      cache.set("b", "B");

      // has() doesn't update recency
      expect(cache.has("a")).toBe(true);

      // Add c, should evict a (oldest)
      cache.set("c", "C");

      expect(cache.get("a")).toBeUndefined();
    });

    it("should call onEvict callback", () => {
      const onEvict = vi.fn();
      const cache = new LRUCache<string, number>({
        maxSize: 2,
        onEvict,
      });

      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3); // Evicts a

      expect(onEvict).toHaveBeenCalledWith("a", 1);
      expect(onEvict).toHaveBeenCalledTimes(1);
    });

    it("should support number keys", () => {
      const cache = new LRUCache<number, string>({ maxSize: 10 });

      cache.set(1, "one");
      cache.set(2, "two");

      expect(cache.get(1)).toBe("one");
      expect(cache.get(2)).toBe("two");
    });

    it("should handle complex value types", () => {
      interface User {
        id: string;
        name: string;
        email: string;
      }

      const cache = new LRUCache<string, User>({ maxSize: 10 });

      const user: User = {
        id: "123",
        name: "Alice",
        email: "alice@example.com",
      };

      cache.set("user:123", user);

      const retrieved = cache.get("user:123");
      expect(retrieved).toEqual(user);
      expect(retrieved?.name).toBe("Alice");
    });
  });

  describe("Edge Cases", () => {
    it("should handle maxSize of 1", () => {
      const cache = new LRUCache<string, number>({ maxSize: 1 });

      cache.set("a", 1);
      expect(cache.get("a")).toBe(1);

      cache.set("b", 2); // Evicts a
      expect(cache.get("a")).toBeUndefined();
      expect(cache.get("b")).toBe(2);
    });

    it("should throw error for invalid maxSize", () => {
      expect(() => {
        new LRUCache<string, string>({ maxSize: 0 });
      }).toThrow("maxSize must be at least 1");

      expect(() => {
        new LRUCache<string, string>({ maxSize: -1 });
      }).toThrow("maxSize must be at least 1");
    });

    it("should handle rapid set/get cycles", () => {
      const cache = new LRUCache<number, number>({ maxSize: 100 });

      // Rapidly add 1000 entries
      for (let i = 0; i < 1000; i++) {
        cache.set(i, i * 2);
      }

      // Should only have last 100
      expect(cache.size()).toBe(100);

      // Oldest 900 should be evicted
      expect(cache.get(0)).toBeUndefined();
      expect(cache.get(50)).toBeUndefined();

      // Newest 100 should be present
      expect(cache.get(900)).toBe(1800);
      expect(cache.get(999)).toBe(1998);
    });
  });

  describe("Utility Methods", () => {
    it("should list all keys in order", () => {
      const cache = new LRUCache<string, number>({ maxSize: 5 });

      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3);

      const keys = cache.keys();

      expect(keys).toEqual(["a", "b", "c"]);
    });

    it("should get all entries", () => {
      const cache = new LRUCache<string, string>({ maxSize: 5 });

      cache.set("a", "A");
      cache.set("b", "B");

      const entries = cache.entries();

      expect(entries).toEqual([
        ["a", "A"],
        ["b", "B"],
      ]);
    });

    it("should clear cache completely", () => {
      const cache = new LRUCache<string, number>({ maxSize: 5 });

      cache.set("a", 1);
      cache.set("b", 2);
      cache.get("a");
      cache.get("missing");

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.stats().hits).toBe(0);
      expect(cache.stats().misses).toBe(0);
    });

    it("should reset statistics without clearing data", () => {
      const cache = new LRUCache<string, number>({ maxSize: 5 });

      cache.set("a", 1);
      cache.get("a");
      cache.get("missing");

      cache.resetStats();

      const stats = cache.stats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(cache.size()).toBe(1); // Data still present
    });
  });

  describe("createDefaultLRUCache", () => {
    it("should create cache with defaults", () => {
      const cache = createDefaultLRUCache<string, number>();

      expect(cache.size()).toBe(0);

      cache.set("test", 123);
      expect(cache.get("test")).toBe(123);
    });

    it("should accept custom parameters", () => {
      const cache = createDefaultLRUCache<string, string>(50, 10000);

      // Fill to capacity
      for (let i = 0; i < 51; i++) {
        cache.set(`key-${i}`, `value-${i}`);
      }

      expect(cache.size()).toBe(50);
      expect(cache.stats().evictions).toBe(1);
    });
  });

  describe("Performance", () => {
    it("should perform get operations in O(1) time", () => {
      const cache = new LRUCache<number, number>({ maxSize: 10000 });

      // Fill cache
      for (let i = 0; i < 10000; i++) {
        cache.set(i, i * 2);
      }

      // Time 1000 get operations
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        cache.get(Math.floor(Math.random() * 10000));
      }
      const end = performance.now();

      // Should be very fast (< 10ms for 1000 operations)
      expect(end - start).toBeLessThan(10);
    });

    it("should perform set operations in O(1) time", () => {
      const cache = new LRUCache<number, number>({ maxSize: 10000 });

      // Time 1000 set operations
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        cache.set(i, i * 2);
      }
      const end = performance.now();

      // Should be very fast (< 10ms for 1000 operations)
      expect(end - start).toBeLessThan(10);
    });
  });
});
