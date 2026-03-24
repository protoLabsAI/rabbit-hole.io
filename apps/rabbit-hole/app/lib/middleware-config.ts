/**
 * Middleware configuration for the Rabbit Hole research agent.
 *
 * Returns a singleton MiddlewareRegistry seeded with all research middleware.
 * Middleware execute in registration order. The ordering below is intentional:
 *
 *   1. EntityMemory    — beforeAgent: inject prior knowledge from Neo4j
 *   2. ResearchPlanner — beforeAgent: generate research plan for complex queries
 *   3. Clarification   — wrapToolCall: intercept askClarification tool
 *   4. LoopDetection   — wrapToolCall: detect/block repeated tool calls
 *   5. Reflection      — afterModel: evaluate evidence quality, guide gap-filling
 *   6. SubQueryDecomp  — beforeAgent: decompose complex queries into sub-queries
 *   7. StructuredExtr  — afterAgent: extract entities/relationships for graph preview
 *   8. DeferredTools   — beforeAgent: inject deferred tool names, intercept tool_search
 */

import {
  ClarificationMiddleware,
  DeferredToolLoadingMiddleware,
  EntityMemoryMiddleware,
  LoopDetectionMiddleware,
  MiddlewareRegistry,
  ParallelDecompositionMiddleware,
  ReflectionMiddleware,
  ResearchPlannerMiddleware,
  StructuredExtractionMiddleware,
} from "@proto/research-middleware";

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
          id: "entity-memory",
          enabled: true,
          middleware: new EntityMemoryMiddleware(),
        },
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
          id: "structured-extraction",
          enabled: true,
          middleware: new StructuredExtractionMiddleware(),
        },
        {
          id: "deferred-tools",
          enabled: false, // Enable when additional tools are registered
          middleware: new DeferredToolLoadingMiddleware(),
        },
      ],
    });
  }
  return _registry;
}
