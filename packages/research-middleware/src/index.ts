/**
 * @proto/research-middleware
 *
 * DeerFlow-inspired middleware pipeline for wrapping AI SDK streamText
 * tool calls. Provides a typed interface for hooking into each stage of
 * the agent execution loop.
 *
 * @example
 * import { MiddlewareRegistry, PassthroughMiddleware } from "@proto/research-middleware";
 *
 * const registry = new MiddlewareRegistry({
 *   entries: [
 *     { id: "passthrough", enabled: true, middleware: new PassthroughMiddleware() },
 *   ],
 * });
 *
 * const chain = registry.buildChain();
 * const ctx = { agentId: generateSecureId(), state: {} };
 * await chain.beforeAgent(ctx);
 */

export type {
  AgentResult,
  MiddlewareConfig,
  MiddlewareContext,
  MiddlewareRegistryEntry,
  ModelMessage,
  ModelResponse,
  ResearchMiddleware,
  ToolExecutor,
} from "./types.js";

export type {
  TracingContext,
  SpanHandle,
  GenerationHandle,
  GenerationUsage,
  CreateTracingContextOptions,
} from "./tracing.js";

export { createTracingContext } from "./tracing.js";
export { MiddlewareChain } from "./runtime.js";
export { MiddlewareRegistry } from "./registry.js";
export { PassthroughMiddleware } from "./middleware/passthrough.js";
export { ResearchPlannerMiddleware } from "./middleware/research-planner.js";
export {
  ClarificationMiddleware,
  CLARIFICATION_RESULT_TYPE,
  CLARIFICATION_BLOCKED_TYPE,
  type ClarificationResult,
  type ClarificationBlockedResult,
} from "./middleware/clarification.js";
export {
  ParallelDecompositionMiddleware,
  SUBQUERY_PLAN_TYPE,
  type SubQueryPlanResult,
  type DecomposeFunction,
  type ParallelDecompositionOptions,
} from "./middleware/parallel-decomposition.js";
export {
  ReflectionMiddleware,
  detectSourceType,
  computeMetrics,
  detectGaps,
  detectSufficiency,
  buildReflectionPrompt,
  buildGapFillingGuidance,
  buildSynthesisGuidance,
  type EvidenceSource,
  type EvidenceMetrics,
  type SourceType,
} from "./middleware/reflection.js";
