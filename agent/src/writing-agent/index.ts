/**
 * Writing Agent - AI-Powered Writing Assistant
 *
 * Provides intelligent writing assistance through CopilotKit integration
 */

import "../instrumentation.js"; // MUST BE FIRST - Initializes OpenTelemetry
import { buildWritingAgentGraph } from "@proto/llm-tools/tools/writing-agent-tools/graph";

import { coordinatorNode } from "./graph/nodes.js";
import { WritingAgentStateAnnotation } from "./state.js";
import { coordinatorTools, readFile, writeFile } from "./tools/index.js";

// Build graph with custom coordinator (for CopilotKit streaming)
// Note: CopilotKit provides checkpointer automatically
export const graph = buildWritingAgentGraph({
  coordinatorNode,
  WritingAgentStateAnnotation,
  coordinatorTools,
  readFile,
  writeFile,
});

// Export state types
export type { WritingAgentState } from "./state.js";
export { WritingAgentStateAnnotation } from "./state.js";
