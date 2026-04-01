/**
 * @proto/deepagent
 *
 * Research prompts and schemas for knowledge graph construction.
 * LangGraph graph code removed in M4 — this package is now a pure library.
 */

// State (pure reducers and types, no LangGraph annotations)
export {
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

// Utils
export { log } from "./utils/logger";

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
