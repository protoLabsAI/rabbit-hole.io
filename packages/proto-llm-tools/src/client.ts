/**
 * Client-safe exports for @proto/llm-tools
 *
 * This entry point only exports browser-compatible code without
 * Node.js dependencies (no LangChain, no LangGraph workflows).
 *
 * Import from @proto/llm-tools/client in React components and Storybook.
 */

// React Hooks (browser-safe)
export * from "./hooks";

// LangExtract Configuration (browser-safe)
export {
  langextractConfig,
  getLangExtractServiceUrl,
  isLangExtractAvailable,
  getLangExtractModels,
} from "./config/langextract-config";

// Wikipedia Configuration (browser-safe)
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

// YouTube Processor Configuration (browser-safe)
export {
  youtubeProcessorConfig,
  getYouTubeProcessorServiceUrl,
  isYouTubeProcessorAvailable,
} from "./config/youtube-config";

// Transcription Configuration (browser-safe)
export {
  transcriptionConfig,
  getTranscriptionProvider,
  getTranscriptionBaseUrl,
  getTranscriptionApiKey,
  getProviderConfig,
  supportsFeature,
  validateFileSize,
  fileToDataUrl,
  PROVIDER_CONFIGS,
  type TranscriptionProvider,
  type TranscriptionModel,
  type ResponseFormat,
  type AudioFormat,
  type TimestampGranularity,
  type ChunkingStrategy,
  type ProviderConfig,
  type TranscriptionOptions,
  type TranscriptionResponse,
  type TranscriptionSegment,
  type TranscriptionWord,
} from "./config/transcription-config";

// Multi-phase extraction types (browser-safe - types only)
export type {
  ExtractionMode,
  ConfidenceThresholds,
  SourceGrounding,
  TiptapAnnotation,
  Entity,
  Relationship,
} from "./workflows/multi-phase-extraction";
