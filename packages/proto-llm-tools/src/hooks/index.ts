/**
 * React Hooks for LLM Tools
 */

export {
  useLangExtract,
  useLangExtractHealth,
  useLangExtractModels,
} from "./useLangExtract";

export {
  useWikipediaQuery,
  useWikipediaSearch,
  useWikipediaPage,
  useWikipediaSearchQuery,
  useWikipediaConfig,
} from "./useWikipedia";

export {
  useYouTubeProcess,
  useYouTubeUpload,
  useYouTubeDownloadURL,
  useYouTubeProcessorHealth,
  type YouTubeProcessRequest,
  type VideoMetadata,
  type YouTubeProcessResponse,
  type UploadRequest,
  type DownloadURLRequest,
  type TranscriptionData,
  type TranscriptSegment,
  type TranscriptionProviderInfo,
  type YouTubeProcessorHealthResponse,
} from "./useYouTubeProcessor";

export {
  useYouTubeDownload,
  type DownloadFilesParams,
} from "./useYouTubeDownload";

export {
  useTranscribe,
  useTranslate,
  useProviderHealth,
  useTranscriptionConfig,
  useFeatureSupport,
  type TranscribeVariables,
  type TranslateVariables,
  type ProviderHealthResponse,
} from "./useTranscription";

export {
  useExtractionWorkflow,
  type ExtractionWorkflowInput,
  type ExtractionWorkflowResult,
} from "./useExtractionWorkflow";

export {
  useHumanLoopExtraction,
  useExtractionSessions,
  type ExtractionConfig,
  type ResumeDecisions,
  type ExtractionState,
  type ExtractionSession,
  type HumanLoopExtractionInput,
  type HumanLoopExtractionResult,
} from "./useHumanLoopExtraction";
