/**
 * Database Health Check Utilities
 *
 * Early validation to prevent loading states when database is unavailable.
 */

import { Neo4jClient } from "./neo4j-client";

export interface HealthCheckResult {
  isHealthy: boolean;
  responseTime?: number;
  error?: string;
  stats?: {
    nodeCount: number;
    relationshipCount: number;
  };
}

/**
 * Quick health check - fails fast if database unavailable
 * Use this at the start of API routes to prevent loading states
 */
export async function quickHealthCheck(
  client: Neo4jClient
): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // Simple connectivity test with 3 second timeout
    const session = client.getSession();

    try {
      const result = await Promise.race([
        session.run("RETURN 1 as test", {}, { timeout: 3000 }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Health check timeout")), 3000)
        ),
      ]);

      if (!result || result.records.length === 0) {
        throw new Error("Database returned no results for health check");
      }

      return {
        isHealthy: true,
        responseTime: Date.now() - startTime,
      };
    } finally {
      await session.close();
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown database connection error";

    return {
      isHealthy: false,
      responseTime: Date.now() - startTime,
      error: formatHealthCheckError(errorMessage),
    };
  }
}

/**
 * Format error message for client consumption
 */
function formatHealthCheckError(rawError: string): string {
  // Connection refused
  if (rawError.includes("ECONNREFUSED") || rawError.includes("ECONNRESET")) {
    return "Database connection failed - Neo4j is not running or not reachable. Please check that Neo4j is started and accessible.";
  }

  // Authentication failed
  if (rawError.includes("authentication") || rawError.includes("credentials")) {
    return "Database authentication failed - check NEO4J_USERNAME and NEO4J_PASSWORD environment variables.";
  }

  // Timeout
  if (rawError.includes("timeout") || rawError.includes("timed out")) {
    return "Database connection timeout - Neo4j is not responding. Check database status.";
  }

  // ServiceUnavailable
  if (rawError.includes("ServiceUnavailable")) {
    return "Database service unavailable - Neo4j may be starting up or experiencing issues.";
  }

  // Generic fallback
  return `Database connection error: ${rawError}`;
}

/**
 * Cached health check to avoid repeated checks
 * Cache valid for 30 seconds
 */
const healthCheckCache = {
  result: null as HealthCheckResult | null,
  timestamp: 0,
  ttl: 30000, // 30 seconds
};

export async function getCachedHealthCheck(
  client: Neo4jClient
): Promise<HealthCheckResult> {
  const now = Date.now();

  // Return cached result if valid
  if (
    healthCheckCache.result &&
    now - healthCheckCache.timestamp < healthCheckCache.ttl
  ) {
    return healthCheckCache.result;
  }

  // Perform new health check
  const result = await quickHealthCheck(client);

  // Only cache successful checks
  if (result.isHealthy) {
    healthCheckCache.result = result;
    healthCheckCache.timestamp = now;
  }

  return result;
}

/**
 * Clear health check cache (useful after reconnection)
 */
export function clearHealthCheckCache(): void {
  healthCheckCache.result = null;
  healthCheckCache.timestamp = 0;
}
