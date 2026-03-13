/**
 * Scoping Subgraph
 *
 * Runs before the main research loop to analyze the query,
 * generate a research brief, and decompose into sub-questions.
 *
 * Graph: START → analyze-query → END
 *
 * This is intentionally simple — a single node that makes one LLM call.
 * The depth setting controls how many sub-questions are generated.
 */

import { StateGraph, START, END } from "@langchain/langgraph";

import { EntityResearchAgentStateAnnotation } from "../../state";

import { createAnalyzeQueryNode } from "./nodes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildScopingGraph(model: any) {
  const analyzeQuery = createAnalyzeQueryNode(model);

  const graph = new StateGraph(EntityResearchAgentStateAnnotation)
    .addNode("analyze-query", analyzeQuery)
    .addEdge(START, "analyze-query")
    .addEdge("analyze-query", END);

  return graph.compile();
}

export { createAnalyzeQueryNode } from "./nodes";
export { parseScopingResponse } from "./nodes";
export type { ScopingResult } from "./nodes";
export { ANALYZE_QUERY_PROMPT, SCOPING_SYSTEM_PROMPT } from "./prompts";
