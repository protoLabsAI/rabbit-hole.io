/**
 * Langfuse Client for API Routes
 * Provides observability for direct LLM calls in Next.js routes and services
 */

import { Langfuse } from "langfuse";

// Singleton instance
let langfuseInstance: Langfuse | null = null;

/**
 * Get or create Langfuse client instance
 * Returns null if not configured (graceful degradation)
 */
export function getLangfuse(): Langfuse | null {
  // Return existing instance
  if (langfuseInstance !== null) {
    return langfuseInstance;
  }

  // Check if configured
  if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) {
    console.warn("[Langfuse] Not configured, skipping API route tracing");
    langfuseInstance = null;
    return null;
  }

  try {
    const baseUrl =
      process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com";

    langfuseInstance = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl,
      requestTimeout: 30000, // 30s timeout for Railway cold starts
      enabled: true,
      persistence: "memory", // Don't persist to disk in serverless
      // Note: Some options (flushAt, flushInterval, release, environment, sdkIntegration)
      // may not be documented in 3.38.x but are accepted by the SDK for backward compatibility
    });

    console.log("[Langfuse] Initialized for API routes", {
      baseUrl,
      environment: process.env.NODE_ENV,
    });
    return langfuseInstance;
  } catch (error) {
    console.error("[Langfuse] Failed to initialize:", error);
    langfuseInstance = null;
    return null;
  }
}

/**
 * Check if Langfuse is configured
 *
 * Returns true if environment variables are set, regardless of connection health.
 * This is a simple configuration check, not a health check.
 *
 * Note: This differs from agent/src/config/langfuse.ts:isLangfuseEnabled
 * which also checks circuit breaker state. This observability package version
 * is intentionally simpler - it only checks if credentials are configured.
 */
export function isLangfuseEnabled(): boolean {
  return Boolean(
    process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY
  );
}

/**
 * Flush any pending traces to Langfuse
 * Fire and forget - doesn't block on completion
 * Catches and logs errors without throwing
 */
export function flushLangfuseAsync(): void {
  const langfuse = getLangfuse();
  if (langfuse) {
    // Use flush() instead of flushAsync() per Langfuse 3.38.x official API
    // Fire and forget - don't await
    (langfuse as any).flush()?.catch?.((error: Error) => {
      console.warn(
        "[Langfuse] Background flush failed:",
        error instanceof Error ? error.message : error
      );
    });
  }
}

/**
 * Shutdown Langfuse and flush remaining traces
 * Use this in cleanup handlers, not in request paths
 */
export async function shutdownLangfuse(): Promise<void> {
  const langfuse = getLangfuse();
  if (langfuse) {
    try {
      await langfuse.shutdown();
      langfuseInstance = null; // Clear singleton to prevent reuse of shut-down client
    } catch (error) {
      console.warn(
        "[Langfuse] Shutdown failed:",
        error instanceof Error ? error.message : error
      );
    }
  }
}
