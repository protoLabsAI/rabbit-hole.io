/**
 * Langfuse Handler Factory
 * Creates standardized Langfuse callback handlers for LangChain/LangGraph agents
 */

import { CallbackHandler } from "@langfuse/langchain";

export interface LangfuseMetadata {
  agentName: string;
  userId?: string;
  sessionId?: string;
  environment?: string;
  tags?: string[];
}

let langfuseAvailable = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute

/**
 * Create Langfuse callback handler with standardized metadata
 * Returns undefined if Langfuse is not configured (graceful degradation)
 */
export function createLangfuseHandler(
  metadata: LangfuseMetadata
): CallbackHandler | undefined {
  // Check environment variables
  if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) {
    langfuseAvailable = false;
    console.warn("[Langfuse] Not configured, skipping tracing");
    return undefined;
  }

  // Periodic health check (non-blocking, allows recovery)
  const now = Date.now();
  if (now - lastHealthCheck > HEALTH_CHECK_INTERVAL) {
    lastHealthCheck = now;
    checkLangfuseHealth().catch(() => {
      langfuseAvailable = false;
    });
  }

  // Skip handler creation if currently marked unavailable
  if (!langfuseAvailable) {
    return undefined;
  }

  try {
    const allTags = [
      metadata.agentName,
      metadata.environment || process.env.NODE_ENV || "development",
      ...(metadata.tags || []),
    ];

    const handler = new CallbackHandler({
      sessionId: metadata.sessionId,
      userId: metadata.userId,
      tags: allTags,
    });

    // Always log handler creation for debugging tracing issues
    console.log(`[Langfuse] Handler created:`, {
      agentName: metadata.agentName,
      sessionId: metadata.sessionId || "(none)",
      userId: metadata.userId || "(none)",
      tags: allTags,
      baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com",
    });

    return handler;
  } catch (error) {
    console.error("[Langfuse] Failed to create handler:", error);
    langfuseAvailable = false;
    return undefined;
  }
}

async function checkLangfuseHealth(): Promise<void> {
  // Simple connectivity check
  const baseUrl = process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com";
  const response = await fetch(`${baseUrl}/api/public/health`, {
    method: "GET",
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }

  langfuseAvailable = true;
}

/**
 * Check if Langfuse is enabled and available
 *
 * Returns true only if:
 * 1. Environment variables are configured
 * 2. Circuit breaker is open (not disabled by health check failures)
 *
 * Note: This differs from packages/observability/src/langfuse.ts:isLangfuseEnabled
 * which only checks environment variables. This agent version includes circuit
 * breaker state to prevent handler creation when Langfuse is temporarily unavailable.
 */
export function isLangfuseEnabled(): boolean {
  return (
    langfuseAvailable &&
    Boolean(process.env.LANGFUSE_SECRET_KEY) &&
    Boolean(process.env.LANGFUSE_PUBLIC_KEY)
  );
}

/**
 * Force enable Langfuse (for testing)
 */
export function forceEnableLangfuse(): void {
  langfuseAvailable = true;
  lastHealthCheck = 0;
}
