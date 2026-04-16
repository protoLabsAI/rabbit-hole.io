/**
 * @protolabsai/deepagent
 *
 * Deep agent entity researcher for knowledge graph construction.
 * Uses LangGraph multi-agent pattern with supervisor-worker coordination.
 */

// State
export {
  EntityResearchAgentStateAnnotation,
  type EntityResearchAgentStateType,
  type EntityResearchAgentState,
  TodoSchema,
  fileReducer,
  todoReducer,
  partialBundleReducer,
} from "./state";

// Types
export type {
  SubAgent,
  Todo,
  TodoStatus,
  FieldAnalysis,
  DeduplicationResult,
  ResearchDepth,
} from "./types";

// Graph
export {
  buildDeepAgentGraph,
  getDeepAgentGraph,
  resetDeepAgentGraph,
  buildSubagentGraph,
} from "./graph";

// Subgraphs
export {
  buildEvidenceGathererGraph,
  buildEntityExtractorGraph,
  buildFieldAnalyzerGraph,
  buildEntityCreatorGraph,
  buildRelationshipMapperGraph,
  buildBundleAssemblerGraph,
} from "./subagents";

// Prompts
export {
  COORDINATOR_PROMPT,
  EVIDENCE_GATHERER_PROMPT,
  ENTITY_EXTRACTOR_PROMPT,
  FIELD_ANALYZER_PROMPT,
  ENTITY_CREATOR_PROMPT,
  RELATIONSHIP_MAPPER_PROMPT,
  BUNDLE_ASSEMBLER_PROMPT,
} from "./prompts";

// Tools
export {
  writeTodos,
  readFile,
  writeFile,
  ls,
  langextractWrapperTool,
  batchFieldMappingLookupTool,
  validateBundleTool,
} from "./tools";

// Utils
export { log, getSubmitOutputTool, getAllSubmitOutputTools } from "./utils";

// Schemas
export {
  EvidenceGathererOutputSchema,
  EntityExtractorOutputSchema,
  FieldAnalyzerOutputSchema,
  EntityCreatorOutputSchema,
  RelationshipMapperOutputSchema,
  BundleAssemblerOutputSchema,
  type EvidenceGathererOutput,
  type EntityExtractorOutput,
  type FieldAnalyzerOutput,
  type EntityCreatorOutput,
  type RelationshipMapperOutput,
  type BundleAssemblerOutput,
} from "./schemas/subagent-outputs";

// Constants
export {
  RESEARCH_FILE_PATHS,
  SUBAGENT_OUTPUT_PATHS,
  type ResearchFilePath,
} from "./constants/file-paths";
