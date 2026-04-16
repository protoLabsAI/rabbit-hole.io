/**
 * Langfuse Tracing Utilities for Deep Agent
 *
 * Direct SDK integration for observability. Uses @protolabsai/observability
 * singleton Langfuse client for consistent tracing across the agent.
 */

import { getLangfuse, isLangfuseEnabled } from "@protolabsai/observability";

export interface TraceContext {
  sessionId: string;
  userId?: string;
  threadId?: string;
  tags?: string[];
}

export interface GenerationInput {
  name: string;
  model: string;
  input: unknown;
  modelParameters?: Record<string, string | number | boolean | string[]>;
  metadata?: Record<string, string | number | boolean | string[]>;
}

/**
 * Create a trace for a deep agent session
 * Returns the trace client or null if Langfuse is not configured
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAgentTrace(context: TraceContext): any {
  const langfuse = getLangfuse();
  if (!langfuse) return null;

  return langfuse.trace({
    name: "deep-agent-research",
    sessionId: context.sessionId,
    userId: context.userId,
    tags: ["deep-agent", ...(context.tags || [])],
    metadata: {
      threadId: context.threadId,
      agentVersion: "2.0",
    },
  });
}

/**
 * Create a generation span for an LLM call within a trace
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createGeneration(trace: any, input: GenerationInput): any {
  if (!trace) return null;
  return trace.generation({
    name: input.name,
    model: input.model,
    input: input.input,
    modelParameters: input.modelParameters,
    metadata: input.metadata,
  });
}

/**
 * End a generation with output
 */
export function endGeneration(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generation: any,
  output: unknown,
  usage?: { inputTokens?: number; outputTokens?: number }
): void {
  if (!generation) return;
  generation.end({
    output,
    usage: usage
      ? {
          input: usage.inputTokens,
          output: usage.outputTokens,
        }
      : undefined,
  });
}

/**
 * Create a span for a subagent execution
 */

export function createSubagentSpan(
  trace: any,
  subagentName: string,
  input: unknown
): any {
  if (!trace) return null;
  return trace.span({
    name: `subagent:${subagentName}`,
    input,
    metadata: {
      subagentType: subagentName,
    },
  });
}

/**
 * Wrap an async function with tracing
 */
export async function withTracing<T>(
  context: TraceContext,
  _name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (trace: any) => Promise<T>
): Promise<T> {
  const trace = createAgentTrace(context);

  try {
    const result = await fn(trace);
    trace?.update({ output: result });
    return result;
  } catch (error) {
    trace?.update({
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

/**
 * Get trace URL for a trace (for debugging/logging)
 */
export function getTraceUrl(traceId: string): string | null {
  const baseUrl = process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com";
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;

  if (!publicKey) return null;

  return `${baseUrl}/trace/${traceId}`;
}

// Re-export for convenience
export { getLangfuse, isLangfuseEnabled };
