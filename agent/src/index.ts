/**
 * Main Agent Exports
 *
 * Two agents:
 * 1. Research Agent - entity research with 6 subagents (evidence, extraction, analysis, creation, mapping, assembly)
 * 2. Writing Agent - document editing + media processing
 */

// Export research agent
export {
  graph as researchGraph,
  ResearchAgentState,
  ResearchAgentStateAnnotation,
} from "./research-agent/index.js";

// Export writing agent
export {
  graph as writingGraph,
  WritingAgentState,
  WritingAgentStateAnnotation,
} from "./writing-agent/index.js";

// Re-export modules
export * as researchAgent from "./research-agent/index.js";
export * as writingAgent from "./writing-agent/index.js";
