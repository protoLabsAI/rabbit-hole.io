/**
 * Proto LLM Tools - Workflow-based AI tools for the Proto project
 *
 * This package provides LangGraph workflow tools that can be used
 * across the application without direct OpenAI dependencies in routes.
 */

// Workflow Tools (as invokable tools)
export * from "./workflows";

// Individual Tools
export * from "./tools";
export { summarizeTool } from "./tools/core/summarize";

export {
  enrichEntityTool,
  EnrichEntityInputSchema,
  EnrichEntityOutputSchema,
} from "./tools/core/enrich-entity";
export type {
  EnrichEntityInput,
  EnrichEntityOutput,
} from "./tools/core/enrich-entity";

export {
  discoverEntitiesTool,
  DiscoverEntitiesInputSchema,
  DiscoverEntitiesOutputSchema,
} from "./tools/core/discover-entities";
export type {
  DiscoverEntitiesInput,
  DiscoverEntitiesOutput,
  DiscoveredEntity,
} from "./tools/core/discover-entities";

export {
  extractRelationshipsTool,
  ExtractRelationshipsInputSchema,
  ExtractRelationshipsOutputSchema,
} from "./tools/core/extract-relationships";
export type {
  ExtractRelationshipsInput,
  ExtractRelationshipsOutput,
  ExtractedRelationship,
} from "./tools/core/extract-relationships";

export {
  discoverEventsTool,
  DiscoverEventsInputSchema,
  DiscoverEventsOutputSchema,
} from "./tools/core/discover-events";
export type {
  DiscoverEventsInput,
  DiscoverEventsOutput,
  DiscoveredEvent,
} from "./tools/core/discover-events";

// LangExtract Configuration
export {
  langextractConfig,
  getLangExtractServiceUrl,
  isLangExtractAvailable,
  getLangExtractModels,
} from "./config/langextract-config";

// Wikipedia Configuration
export {
  wikipediaConfig,
  queryWikipedia,
  searchWikipedia,
  fetchWikipediaPage,
  WIKIPEDIA_LANGUAGES,
  type WikipediaLanguage,
  type WikipediaSearchResult,
  type WikipediaPage,
  type WikipediaQueryResponse,
} from "./config/wikipedia-config";

// YouTube Processor Configuration
export {
  youtubeProcessorConfig,
  getYouTubeProcessorServiceUrl,
  isYouTubeProcessorAvailable,
} from "./config/youtube-config";

// Re-export hook types for server-side usage
export type {
  YouTubeProcessRequest,
  YouTubeProcessResponse,
  UploadRequest,
  DownloadURLRequest,
  VideoMetadata,
  TranscriptionData,
  TranscriptSegment,
  TranscriptionProviderInfo,
  YouTubeProcessorHealthResponse,
} from "./hooks/useYouTubeProcessor";

// Multi-phase extraction workflow
export {
  extractionGraph,
  discoverNode,
  structureNode,
  enrichNode,
  relateNode,
  annotationNode,
  type ExtractionMode,
  type ConfidenceThresholds,
  type SourceGrounding,
  type TiptapAnnotation,
  type Entity,
  type Relationship,
} from "./workflows/multi-phase-extraction";

// Human-in-the-loop extraction workflow
export {
  buildHumanLoopExtractionGraph,
  type HumanLoopExtractionState,
  type UserAction,
  type EntityMerge,
  type FieldCorrection,
  type ReviewData,
} from "./workflows/human-loop-extraction-graph";

// Multi-phase extraction utilities
export {
  getAllDomains,
  getDomainConfig,
  getEntityTypesForDomains,
  getDomainColorForEntity,
  getDomainIconForEntity,
  getDomainNameForEntity,
  generateDomainUID,
  getDomainUIMetadata,
  getAllDomainUIMetadata,
  getRelationshipTypesForDomains,
  validateEntityAgainstDomain,
  getRequiredFieldsForEntity,
  getOptionalFieldsForEntity,
} from "./workflows/multi-phase-extraction-utils";

export {
  getEnrichmentFieldsForEntity,
  generateEnrichmentExample,
} from "./workflows/domain-schema-extractor";

// Job queue utilities
export { pollForJobCompletion } from "./utils/pollForJobCompletion";
export { enqueueLangExtract } from "./utils/enqueueLangExtract";

// Domain example utilities
export {
  getRelationshipExample,
  getRelationshipExamples,
} from "./utils/getRelationshipExample";
export {
  getEnrichmentExample,
  getEnrichmentExamples,
} from "./utils/getEnrichmentExample";

// Graph utilities
export { buildSubagentGraph } from "./workflows/graph/build-subagent";

// Note: React hooks are available via @proto/llm-tools/client
// Do not export hooks from main entry to avoid bundling in server components

// Re-export types for convenience
export type { EntityResearchState } from "./workflows/entity-research/state";
