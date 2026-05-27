/**
 * Middleware configuration for the Rabbit Hole search agent.
 *
 * Returns a singleton MiddlewareRegistry seeded with the launch-stack
 * middleware. Middleware execute in registration order:
 *
 *   1. ResearchPlanner — beforeAgent: generate research plan for complex queries
 *   2. Clarification   — wrapToolCall: intercept askClarification tool
 *   3. LoopDetection   — wrapToolCall: detect/block repeated tool calls
 *   4. Reflection      — afterModel: evaluate evidence quality, guide gap-filling
 *   5. SubQueryDecomp  — beforeAgent: decompose complex queries into sub-queries
 *   6. DeferredTools   — beforeAgent: inject deferred tool names, intercept tool_search
 *
 * The graph-backed middleware (EntityMemory, StructuredExtraction) are
 * disabled in the launch stack since the search agent no longer talks
 * to Neo4j. Re-enable them in the research stack via a dedicated config
 * if/when graph features come back.
 */

import {
  ClarificationMiddleware,
  DeferredToolLoadingMiddleware,
  LoopDetectionMiddleware,
  MiddlewareRegistry,
  ParallelDecompositionMiddleware,
  ReflectionMiddleware,
  ResearchPlannerMiddleware,
} from "@protolabsai/research-middleware";

let _registry: MiddlewareRegistry | null = null;

/**
 * Returns the shared MiddlewareRegistry for the search agent.
 * The registry is created once (singleton) and reused across requests.
 */
export function getMiddlewareRegistry(): MiddlewareRegistry {
  if (!_registry) {
    _registry = new MiddlewareRegistry({
      entries: [
        {
          id: "research-planner",
          enabled: true,
          middleware: new ResearchPlannerMiddleware(),
        },
        {
          id: "clarification",
          enabled: true,
          middleware: new ClarificationMiddleware(),
        },
        {
          id: "loop-detection",
          enabled: true,
          middleware: new LoopDetectionMiddleware(),
        },
        {
          id: "reflection",
          enabled: true,
          middleware: new ReflectionMiddleware(),
        },
        {
          id: "parallel-decomposition",
          enabled: true,
          middleware: new ParallelDecompositionMiddleware(),
        },
        {
          id: "deferred-tools",
          enabled: false, // Enable when additional tools are registered
          middleware: new DeferredToolLoadingMiddleware({ deferredTools: [] }),
        },
      ],
    });
  }
  return _registry;
}
