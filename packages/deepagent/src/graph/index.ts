/**
 * Deep Agent Graph - Main StateGraph Definition
 *
 * Linear pipeline:
 *   START → scoping → research-loop → entity-creator → relationship-mapper → bundle-assembler → END
 *
 * The research-loop node is a ReAct loop that drives multi-hop web research
 * internally (not a separate LangGraph sub-graph). The old coordinator +
 * parallel-gather + gap-detection + 6-subagent dispatch pattern has been
 * replaced by this simpler pipeline.
 */

import { ToolMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { StructuredTool } from "@langchain/core/tools";
import { StateGraph, START, END } from "@langchain/langgraph";

import { getModel } from "@proto/llm-providers/server";
import { mergePartialBundle, createEmptyPartialBundle } from "@proto/types";
import type { ResearchPhase } from "@proto/types";

import {
  EntityResearchAgentStateAnnotation,
  type EntityResearchAgentStateType,
} from "../state";
import {
  readFile,
  writeFile,
  searxngSearchTool,
  langextractWrapperTool,
  batchFieldMappingLookupTool,
  validateBundleTool,
} from "../tools";
import { log } from "../utils/logger";

import { createAutoIngestNode } from "./auto-ingest";
import { resetCoordinatorModel } from "./nodes";
import { createResearchLoopNode } from "./research-loop";
import { buildScopingGraph } from "./scoping";
import {
  buildEntityCreatorGraph,
  buildRelationshipMapperGraph,
  buildBundleAssemblerGraph,
} from "./subgraphs";

// ---------------------------------------------------------------------------
// Caches
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedSubgraphs: Record<string, any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedModel: any = null;

// ---------------------------------------------------------------------------
// Subagent phase mapping (for partial bundle tracking)
// ---------------------------------------------------------------------------

const SUBAGENT_PHASE_MAP: Record<string, ResearchPhase> = {
  "entity-creator": "entity-creation",
  "relationship-mapper": "relationship-mapping",
  "bundle-assembler": "bundle-assembly",
};

// ---------------------------------------------------------------------------
// extractPartialBundleUpdate — used by createSubgraphWrapper for the
// remaining subgraph nodes (entity-creator, relationship-mapper,
// bundle-assembler).
// ---------------------------------------------------------------------------

function extractPartialBundleUpdate(
  subgraphName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any
): {
  entities?: unknown[];
  relationships?: unknown[];
  evidence?: unknown[];
  isComplete?: boolean;
} {
  switch (subgraphName) {
    case "entity-creator":
      return {
        entities: result.files
          ? Object.values(result.files)
              .map((content: unknown) => {
                try {
                  const parsed = JSON.parse(content as string);
                  return (
                    parsed.createdEntities ||
                    (parsed.entity ? [parsed.entity] : [])
                  );
                } catch {
                  return [];
                }
              })
              .flat()
          : [],
      };
    case "relationship-mapper":
      return {
        relationships: result.relationships || [],
      };
    case "bundle-assembler":
      return {
        entities: result.bundle?.entities || [],
        relationships: result.bundle?.relationships || [],
        evidence: result.bundle?.evidence || [],
        isComplete: true,
      };
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// createSubgraphWrapper — wraps a compiled subgraph as a LangGraph node
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createSubgraphWrapper(subgraphName: string, compiledSubgraph: any) {
  return async (
    state: EntityResearchAgentStateType,
    config: RunnableConfig
  ): Promise<Partial<EntityResearchAgentStateType>> => {
    log.debug(`[${subgraphName}] Invoked`);

    // Feed the subgraph a clean message list with a summary prompt
    const description = `Execute ${subgraphName} phase for entity "${state.entityName}"`;

    const transformedState: EntityResearchAgentStateType = {
      ...state,
      messages: [
        { role: "user", content: description },
      ] as unknown as EntityResearchAgentStateType["messages"],
    };

    const subgraphConfig: RunnableConfig = {
      ...config,
      callbacks: undefined,
      tags: [...(config.tags || []), `subgraph:${subgraphName}`],
    };

    const result = await compiledSubgraph.invoke(
      transformedState,
      subgraphConfig
    );

    const toolResponse = new ToolMessage({
      content: `${subgraphName} completed. Files: ${Object.keys(result.files || {}).join(", ")}`,
      tool_call_id: `task_${subgraphName}`,
    });

    // Build partial bundle progressively
    const phase = SUBAGENT_PHASE_MAP[subgraphName];
    const bundleUpdate = extractPartialBundleUpdate(subgraphName, result);
    const currentPartial = state.partialBundle || createEmptyPartialBundle();
    const nextPartialBundle = phase
      ? mergePartialBundle(currentPartial, {
          ...bundleUpdate,
          phase,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
      : currentPartial;

    log.debug(`[${subgraphName}] Partial bundle updated`, {
      phase,
      entities: nextPartialBundle.entityCount,
      relationships: nextPartialBundle.relationshipCount,
      evidence: nextPartialBundle.evidenceCount,
      isComplete: nextPartialBundle.isComplete,
    });

    return {
      files: result.files,
      messages: [toolResponse],
      todos: result.todos,
      relationships: result.relationships,
      confidence: result.confidence,
      completeness: result.completeness,
      bundle: result.bundle,
      partialBundle: nextPartialBundle,
    };
  };
}

// ---------------------------------------------------------------------------
// maxHops helper
// ---------------------------------------------------------------------------

function maxHopsForDepth(
  depth: "basic" | "detailed" | "comprehensive" | undefined
): number {
  switch (depth) {
    case "basic":
      return 3;
    case "comprehensive":
      return 12;
    case "detailed":
    default:
      return 6;
  }
}

// ---------------------------------------------------------------------------
// buildDeepAgentGraph
// ---------------------------------------------------------------------------

export function buildDeepAgentGraph(options?: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model?: any;
  /** @deprecated coordinatorNode is no longer used — the ReAct research loop replaced the coordinator pattern. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  coordinatorNode?: any;
}) {
  let model = options?.model;
  if (!model) {
    if (!cachedModel)
      cachedModel = getModel("smart", undefined, { maxTokens: 32768 });
    model = cachedModel;
  }

  // Custom tools available to the research loop and subgraphs
  const customTools: StructuredTool[] = [
    searxngSearchTool,
    langextractWrapperTool,
    batchFieldMappingLookupTool,
    validateBundleTool,
  ];

  const toolsMap: Record<string, StructuredTool> = {};
  for (const t of [readFile, writeFile, ...customTools]) {
    if (t?.name) toolsMap[t.name] = t;
  }

  // Build subgraphs (cached)
  if (!cachedSubgraphs) {
    cachedSubgraphs = {
      scoping: buildScopingGraph(model),
      "entity-creator": buildEntityCreatorGraph(model, toolsMap),
      "relationship-mapper": buildRelationshipMapperGraph(model, toolsMap),
      "bundle-assembler": buildBundleAssemblerGraph(model, toolsMap),
    };
  }

  // Research loop node (ReAct loop — runs internally, not a subgraph)
  const researchLoopNode = createResearchLoopNode(model, toolsMap);

  // -------------------------------------------------------------------------
  // Scoping node — runs the scoping subgraph and sets maxHops
  // -------------------------------------------------------------------------
  const scopingNode = async (
    state: EntityResearchAgentStateType,
    config: RunnableConfig
  ): Promise<Partial<EntityResearchAgentStateType>> => {
    log.debug("[scoping] Starting scoping phase");
    const result = await cachedSubgraphs!["scoping"].invoke(state, {
      ...config,
      callbacks: undefined,
      tags: [...(config.tags || []), "subgraph:scoping"],
    });

    const maxHops = maxHopsForDepth(state.researchDepth);

    log.debug("[scoping] Scoping complete", {
      brief: result.researchBrief?.slice(0, 100),
      questions: result.subQuestions?.length,
      maxHops,
    });

    return {
      researchBrief: result.researchBrief,
      subQuestions: result.subQuestions,
      gaps: result.gaps,
      maxHops,
    };
  };

  // -------------------------------------------------------------------------
  // Wire the graph
  // -------------------------------------------------------------------------
  const graph = new StateGraph(EntityResearchAgentStateAnnotation)
    .addNode("scoping", scopingNode)
    .addNode("research-loop", researchLoopNode)
    .addNode(
      "entity-creator",
      createSubgraphWrapper("entity-creator", cachedSubgraphs["entity-creator"])
    )
    .addNode(
      "relationship-mapper",
      createSubgraphWrapper(
        "relationship-mapper",
        cachedSubgraphs["relationship-mapper"]
      )
    )
    .addNode(
      "bundle-assembler",
      createSubgraphWrapper(
        "bundle-assembler",
        cachedSubgraphs["bundle-assembler"]
      )
    )
    .addNode("auto-ingest", createAutoIngestNode())
    .addEdge(START, "scoping")
    .addEdge("scoping", "research-loop")
    .addEdge("research-loop", "entity-creator")
    .addEdge("entity-creator", "relationship-mapper")
    .addEdge("relationship-mapper", "bundle-assembler")
    .addEdge("bundle-assembler", "auto-ingest")
    .addEdge("auto-ingest", END);

  return graph;
}

// ---------------------------------------------------------------------------
// Cached compiled graph
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedGraph: any = null;

/**
 * Get a cached, compiled deep agent graph.
 *
 * Note: Options are only applied on first call. The graph is cached for
 * performance — subsequent calls return the same compiled graph regardless
 * of options passed. Use resetDeepAgentGraph() before calling with new
 * options if you need to rebuild with different configuration.
 */
export function getDeepAgentGraph(
  options?: Parameters<typeof buildDeepAgentGraph>[0]
) {
  if (!cachedGraph) cachedGraph = buildDeepAgentGraph(options).compile();
  return cachedGraph;
}

export function resetDeepAgentGraph() {
  cachedGraph = null;
  cachedSubgraphs = null;
  cachedModel = null;
  resetCoordinatorModel();
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export { buildScopingGraph } from "./scoping";
export { buildSubagentGraph, resetSubagentIterations } from "./build-subagent";
export * from "./subgraphs";
