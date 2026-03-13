/**
 * Deep Agent Graph - Main StateGraph Definition
 */

import { ToolMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { StructuredTool } from "@langchain/core/tools";
import { tool } from "@langchain/core/tools";
import { StateGraph, START, Command } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

import { getModel } from "@proto/llm-providers/server";
import { mergePartialBundle, createEmptyPartialBundle } from "@proto/types";
import type { PartialBundle, ResearchPhase } from "@proto/types";

import {
  EntityResearchAgentStateAnnotation,
  type EntityResearchAgentStateType,
} from "../state";
import {
  writeTodos,
  readFile,
  writeFile,
  ls,
  wikipediaFetchTool,
  langextractWrapperTool,
  batchFieldMappingLookupTool,
  validateBundleTool,
} from "../tools";
import { log } from "../utils/logger";

import {
  createGapDetectionNode,
  routeAfterGapDetection,
} from "./gap-detection";
import { coordinatorNode, resetCoordinatorModel } from "./nodes";
import { createParallelGatherNode } from "./parallel-gather";
import { routeFromCoordinator } from "./routing";
import { buildScopingGraph } from "./scoping";
import {
  buildEvidenceGathererGraph,
  buildEntityExtractorGraph,
  buildFieldAnalyzerGraph,
  buildEntityCreatorGraph,
  buildRelationshipMapperGraph,
  buildBundleAssemblerGraph,
} from "./subgraphs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedSubgraphs: Record<string, any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedModel: any = null;

function createSimpleTaskTool(): StructuredTool {
  return tool(
    async (input: { description: string; subagent_type: string }, config) => {
      log.debug(`Task tool fallback: ${input.subagent_type}`);
      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: `Task delegated to ${input.subagent_type}`,
              tool_call_id:
                (config as { toolCall?: { id: string } }).toolCall?.id ||
                "task_fallback",
            }),
          ],
        },
      });
    },
    {
      name: "task",
      description: "Delegate to specialized subagent.",
      schema: z.object({
        description: z.string(),
        subagent_type: z.enum([
          "evidence-gatherer",
          "entity-extractor",
          "field-analyzer",
          "entity-creator",
          "relationship-mapper",
          "bundle-assembler",
        ]),
      }),
    }
  );
}

/** Map subagent names to their research phase for partial bundle tracking */
const SUBAGENT_PHASE_MAP: Record<string, ResearchPhase> = {
  "evidence-gatherer": "evidence-gathering",
  "entity-extractor": "entity-extraction",
  "field-analyzer": "field-analysis",
  "entity-creator": "entity-creation",
  "relationship-mapper": "relationship-mapping",
  "bundle-assembler": "bundle-assembly",
};

/**
 * Extract partial bundle data from a subagent result based on what that subagent produces.
 */
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
    case "evidence-gatherer":
      return {
        evidence: result.files
          ? Object.values(result.files)
              .map((content: unknown) => {
                try {
                  const parsed = JSON.parse(content as string);
                  return parsed.evidence || [];
                } catch {
                  return [];
                }
              })
              .flat()
          : [],
      };
    case "entity-extractor":
    case "entity-creator":
      return {
        entities: result.files
          ? Object.values(result.files)
              .map((content: unknown) => {
                try {
                  const parsed = JSON.parse(content as string);
                  return parsed.createdEntities || (parsed.entity ? [parsed.entity] : []);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createSubgraphWrapper(subgraphName: string, compiledSubgraph: any) {
  return async (
    state: EntityResearchAgentStateType,
    config: RunnableConfig
  ): Promise<Partial<EntityResearchAgentStateType>> => {
    const lastMessage = state.messages[state.messages.length - 1] as {
      tool_calls?: Array<{
        name: string;
        args?: { description?: string };
        arguments?: { description?: string };
        id?: string;
      }>;
    };
    const taskCall = lastMessage?.tool_calls?.find((tc) => tc.name === "task");
    const description =
      taskCall?.args?.description ||
      taskCall?.arguments?.description ||
      `Execute ${subgraphName}`;
    const toolCallId = taskCall?.id || `task_${subgraphName}`;

    log.debug(`[${subgraphName}] Invoked`, { description });

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
      tool_call_id: toolCallId,
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

type CoordinatorNodeType = (
  state: any,
  config: any,
  tools: any[]
) => Promise<any>;

export function buildDeepAgentGraph(options?: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model?: any;
  coordinatorNode?: CoordinatorNodeType;
}) {
  let model = options?.model;
  if (!model) {
    if (!cachedModel)
      cachedModel = getModel("smart", undefined, { maxTokens: 4096 });
    model = cachedModel;
  }

  const customCoordinatorNode = options?.coordinatorNode || coordinatorNode;

  const coordinatorBuiltinTools = [writeTodos, readFile, writeFile, ls];
  const subagentBuiltinTools = [readFile];
  const customTools: StructuredTool[] = [
    wikipediaFetchTool,
    langextractWrapperTool,
    batchFieldMappingLookupTool,
    validateBundleTool,
  ];

  const subagentToolsForMap = [...subagentBuiltinTools, ...customTools];
  const toolsMap: Record<string, StructuredTool> = {};
  for (const t of subagentToolsForMap) {
    if (t.name) toolsMap[t.name] = t;
  }

  const taskTool = createSimpleTaskTool();
  const coordinatorTools = [...coordinatorBuiltinTools, taskTool];
  const allTools = [...coordinatorBuiltinTools, taskTool];
  const toolNode = new ToolNode(allTools);

  if (!cachedSubgraphs) {
    cachedSubgraphs = {
      scoping: buildScopingGraph(model),
      "evidence-gatherer": buildEvidenceGathererGraph(model, toolsMap),
      "entity-extractor": buildEntityExtractorGraph(model, toolsMap),
      "field-analyzer": buildFieldAnalyzerGraph(model, toolsMap),
      "entity-creator": buildEntityCreatorGraph(model, toolsMap),
      "relationship-mapper": buildRelationshipMapperGraph(model, toolsMap),
      "bundle-assembler": buildBundleAssemblerGraph(model, toolsMap),
    };
  }

  const coordinatorNodeWithTools = (
    state: EntityResearchAgentStateType,
    config: RunnableConfig
  ) => customCoordinatorNode(state, config, coordinatorTools);

  // Scoping node runs as a direct function (not via task tool dispatch),
  // so we wrap it to avoid needing a tool_call_id
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
    log.debug("[scoping] Scoping complete", {
      brief: result.researchBrief?.slice(0, 100),
      questions: result.subQuestions?.length,
    });
    return {
      researchBrief: result.researchBrief,
      subQuestions: result.subQuestions,
      gaps: result.gaps,
    };
  };

  const parallelGatherNode = createParallelGatherNode(
    cachedSubgraphs["evidence-gatherer"]
  );
  const gapDetectionNode = createGapDetectionNode(model);

  const graph = new StateGraph(EntityResearchAgentStateAnnotation)
    .addNode("scoping", scopingNode)
    .addNode("parallel-gather", parallelGatherNode)
    .addNode("gap-detection", gapDetectionNode)
    .addNode("coordinator", coordinatorNodeWithTools)
    .addNode("tools", toolNode)
    .addNode(
      "evidence-gatherer",
      createSubgraphWrapper(
        "evidence-gatherer",
        cachedSubgraphs["evidence-gatherer"]
      )
    )
    .addNode(
      "entity-extractor",
      createSubgraphWrapper(
        "entity-extractor",
        cachedSubgraphs["entity-extractor"]
      )
    )
    .addNode(
      "field-analyzer",
      createSubgraphWrapper("field-analyzer", cachedSubgraphs["field-analyzer"])
    )
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
    .addEdge(START, "scoping")
    .addEdge("scoping", "parallel-gather")
    .addEdge("parallel-gather", "gap-detection")
    .addConditionalEdges("gap-detection", routeAfterGapDetection, {
      "parallel-gather": "parallel-gather",
      coordinator: "coordinator",
    })
    .addConditionalEdges("coordinator", routeFromCoordinator)
    .addEdge("tools", "coordinator")
    .addEdge("evidence-gatherer", "coordinator")
    .addEdge("entity-extractor", "coordinator")
    .addEdge("field-analyzer", "coordinator")
    .addEdge("entity-creator", "coordinator")
    .addEdge("relationship-mapper", "coordinator")
    .addEdge("bundle-assembler", "coordinator");

  return graph;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedGraph: any = null;

/**
 * Get a cached, compiled deep agent graph.
 *
 * Note: Options are only applied on first call. The graph is cached for
 * performance - subsequent calls return the same compiled graph regardless
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

export {
  createGapDetectionNode,
  routeAfterGapDetection,
  parseGapAnalysis,
  computeMaxIterations,
} from "./gap-detection";
export { coordinatorNode, resetCoordinatorModel } from "./nodes";
export { createParallelGatherNode, deduplicateByUrl } from "./parallel-gather";
export { routeFromCoordinator, resetIterationTracking } from "./routing";
export { buildScopingGraph } from "./scoping";
export { buildSubagentGraph, resetSubagentIterations } from "./build-subagent";
export * from "./subgraphs";
