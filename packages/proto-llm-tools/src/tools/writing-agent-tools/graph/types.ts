/**
 * Type definitions for Writing Agent Graph
 */

import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { StructuredTool } from "@langchain/core/tools";

/**
 * Coordinator Node Function Type
 *
 * Takes agent state, config, and tools, returns state update
 */
export type CoordinatorNode = (
  state: any,
  config: RunnableConfig,
  tools: StructuredTool[]
) => Promise<any>;

/**
 * Writing Agent Graph Options
 */
export interface WritingAgentGraphOptions {
  /** Optional LLM model (defaults to smart model) */
  model?: BaseChatModel;

  /** Custom coordinator node implementation */
  coordinatorNode: CoordinatorNode;

  /** State annotation from agent package */
  WritingAgentStateAnnotation: any;

  /** Restricted tools for coordinator */
  coordinatorTools: StructuredTool[];

  /** Read file tool */
  readFile: StructuredTool;

  /** Write file tool */
  writeFile: StructuredTool;
}
