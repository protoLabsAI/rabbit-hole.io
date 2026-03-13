import { StateGraph, END } from "@langchain/langgraph";

import {
  EntityResearchStateAnnotation,
  type ResearchInputState,
  type ResearchProcessingState,
  type ResearchOutputState,
  type ResearchMetadataState,
} from "../state";

import {
  wikipediaFetchingNode,
  entityTypeDetectionNode,
  toolExecutionNode,
  dataProcessingNode,
  bundleGenerationNode,
} from "./nodes";

// Re-export state types for proper TypeScript compilation
export type {
  ResearchInputState,
  ResearchProcessingState,
  ResearchOutputState,
  ResearchMetadataState,
};

/**
 * Entity Research Workflow Graph
 *
 * Comprehensive workflow that can research any entity type:
 * 1. Fetches Wikipedia data automatically if no rawData provided
 * 2. Detects entity type from input data
 * 3. Selects and executes appropriate research tool
 * 4. Processes and validates extracted data
 * 5. Generates Rabbit Hole compatible bundle
 */
export const entityResearchGraph = new StateGraph(EntityResearchStateAnnotation)
  // Add processing nodes
  .addNode("fetchWikipedia", wikipediaFetchingNode)
  .addNode("detectEntityType", entityTypeDetectionNode)
  .addNode("executeResearchTool", toolExecutionNode)
  .addNode("processData", dataProcessingNode)
  .addNode("generateBundle", bundleGenerationNode)

  // Define workflow flow
  .addEdge("__start__", "fetchWikipedia")
  .addEdge("fetchWikipedia", "detectEntityType")
  .addEdge("detectEntityType", "executeResearchTool")
  .addEdge("executeResearchTool", "processData")
  .addEdge("processData", "generateBundle")
  .addEdge("generateBundle", END)

  // Compile the graph
  .compile();
