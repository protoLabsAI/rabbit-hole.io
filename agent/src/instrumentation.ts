/**
 * Instrumentation / Observability Initialization
 *
 * This file MUST be imported FIRST in all agent entry points to ensure
 * observability is configured before any other code runs.
 *
 * Langfuse Integration:
 * - Uses @langfuse/langchain CallbackHandler for LangChain/LangGraph tracing
 * - Handler created per-request in agent nodes (see config/langfuse.ts)
 * - This file validates configuration on startup
 */

import { CallbackHandler } from "@langfuse/langchain";

// Validate Langfuse configuration on startup
function validateLangfuseConfig(): void {
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const baseUrl = process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com";

  if (!secretKey || !publicKey) {
    console.warn(
      "[Instrumentation] Langfuse not configured - LLM tracing disabled"
    );
    console.warn(
      "[Instrumentation] Set LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY to enable"
    );
    return;
  }

  // Verify handler can be created (validates credentials format)
  try {
    const testHandler = new CallbackHandler({
      sessionId: "startup-validation",
      tags: ["startup-test"],
    });

    console.log("[Instrumentation] Langfuse configured successfully", {
      baseUrl,
      publicKeyPrefix: publicKey.substring(0, 10) + "...",
    });

    // Don't use the test handler - just verify it can be created
  } catch (error) {
    console.error(
      "[Instrumentation] Langfuse configuration error:",
      error instanceof Error ? error.message : error
    );
  }
}

// Graceful shutdown handlers
function setupShutdownHandlers(): void {
  const shutdown = async (signal: string) => {
    console.log(`[Instrumentation] Received ${signal}, shutting down...`);
    // Allow time for any pending traces to flush
    await new Promise((resolve) => setTimeout(resolve, 1000));
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// Run on import
console.log("[Instrumentation] Initializing observability...");
validateLangfuseConfig();
setupShutdownHandlers();
console.log("[Instrumentation] Initialization complete");
