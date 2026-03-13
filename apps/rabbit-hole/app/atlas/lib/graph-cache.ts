/**
 * Graph Cache Layer
 *
 * Caches graph payloads from Neo4j GDS
 * Format: {nodes, edges, x, y, metrics}
 */

interface CachedGraphPayload {
  nodes: any[];
  edges: any[];
  metrics?: {
    communities?: Record<string, number>;
    pageRank?: Record<string, number>;
    embeddings?: Record<string, number[]>;
  };
  generatedAt: string;
  cacheKey: string;
}

const CACHE_VERSION = "v1";
const CACHE_EXPIRY_MS = 1000 * 60 * 30; // 30 minutes

/**
 * Generate cache key from query parameters
 */
export function generateCacheKey(params: {
  viewMode: string;
  centerEntity?: string;
  communityId?: number;
  timeWindow?: { from: string; to: string };
  hops?: number;
  limit?: number;
}): string {
  const parts = [
    CACHE_VERSION,
    params.viewMode,
    params.centerEntity || "all",
    params.communityId?.toString() || "none",
    params.timeWindow
      ? `${params.timeWindow.from}_${params.timeWindow.to}`
      : "all-time",
    params.hops?.toString() || "2",
    params.limit?.toString() || "100",
  ];

  return parts.join(":");
}

/**
 * Get cached graph payload
 */
export async function getCachedGraph(
  cacheKey: string
): Promise<CachedGraphPayload | null> {
  try {
    const cached = localStorage.getItem(`graph-cache:${cacheKey}`);
    if (!cached) return null;

    const payload: CachedGraphPayload = JSON.parse(cached);

    // Check expiry
    const age = Date.now() - new Date(payload.generatedAt).getTime();
    if (age > CACHE_EXPIRY_MS) {
      localStorage.removeItem(`graph-cache:${cacheKey}`);
      return null;
    }

    return payload;
  } catch (error) {
    console.error("Cache read error:", error);
    return null;
  }
}

/**
 * Store graph payload in cache
 */
export async function setCachedGraph(
  cacheKey: string,
  payload: Omit<CachedGraphPayload, "generatedAt" | "cacheKey">
): Promise<void> {
  try {
    const cached: CachedGraphPayload = {
      ...payload,
      generatedAt: new Date().toISOString(),
      cacheKey,
    };

    localStorage.setItem(`graph-cache:${cacheKey}`, JSON.stringify(cached));
  } catch (error) {
    console.error("Cache write error:", error);
  }
}

/**
 * Invalidate cache entries matching pattern
 */
export function invalidateCache(pattern?: string): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith("graph-cache:")) {
        if (!pattern || key.includes(pattern)) {
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error("Cache invalidation error:", error);
  }
}

/**
 * Clear all graph caches
 */
export function clearAllGraphCaches(): void {
  invalidateCache();
}
