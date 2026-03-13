/**
 * LLM Tools - Individual tools for specific operations
 */

// LangExtract service client
export { langextractClientTool } from "./langextract-client";

// Basic Entity Extraction (discover + structure only, no relationships)
export {
  entityExtractionBasicTool,
  type EntityExtractionResult,
} from "./entity-extraction-basic";

// Core tools
export { summarizeTool } from "./core/summarize";
export { enrichEntityTool } from "./core/enrich-entity";
export type {
  EnrichEntityInput,
  EnrichEntityOutput,
} from "./core/enrich-entity";
export { discoverEntitiesTool } from "./core/discover-entities";
export type {
  DiscoverEntitiesInput,
  DiscoverEntitiesOutput,
  DiscoveredEntity,
} from "./core/discover-entities";
export { discoverEventsTool } from "./core/discover-events";
export type {
  DiscoverEventsInput,
  DiscoverEventsOutput,
  DiscoveredEvent,
} from "./core/discover-events";

// Research Agent Tools
export * from "./research-agent-tools";

// Writing Agent Tools
export {
  WRITING_COORDINATOR_PROMPT,
  MEDIA_PROCESSING_PROMPT,
} from "./writing-agent-tools/prompts/index.js";
export { buildWritingAgentGraph } from "./writing-agent-tools/graph/index.js";
