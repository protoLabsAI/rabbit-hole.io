/**
 * Research Agent
 *
 * Entity research with 6 specialized subagents:
 * - Evidence Gatherer: Wikipedia/web evidence collection
 * - Entity Extractor: Identifies entities from evidence
 * - Field Analyzer: Analyzes entity field mappings
 * - Entity Creator: Structures entity data
 * - Relationship Mapper: Maps relationships between entities
 * - Bundle Assembler: Assembles final research bundle
 *
 * Uses shared graph building from @protolabsai/llm-tools with custom coordinator
 */

import "../instrumentation.js"; // MUST BE FIRST - Initializes OpenTelemetry
import { MemorySaver } from "@langchain/langgraph";

import { buildDeepAgentGraph } from "@protolabsai/deepagent/graph";

import { agentLLMConfig } from "../config/llm-config.js";

import { coordinatorNode } from "./graph/nodes.js";

const memory = new MemorySaver();

// Build graph with CopilotKit-enhanced coordinator and compile with memory
export const graph = buildDeepAgentGraph({
  model: agentLLMConfig.research({ maxTokens: 4096 }),
  coordinatorNode: coordinatorNode as any,
}).compile({ checkpointer: memory });

export type { ResearchAgentState, DeepAgentState } from "./state.js";
export {
  ResearchAgentStateAnnotation,
  DeepAgentStateAnnotation,
} from "./state.js";
