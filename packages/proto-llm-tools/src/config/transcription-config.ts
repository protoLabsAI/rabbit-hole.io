/// <reference lib="dom" />

/**
 * Transcription Service Configuration
 *
 * Centralized configuration for OpenAI-compatible transcription APIs.
 * Supports multiple providers: OpenAI, Groq, Local (faster-whisper), etc.
 */

/**
 * Supported transcription providers
 */
export type TranscriptionProvider = "openai" | "groq" | "local" | "custom";

/**
 * OpenAI-compatible transcription models
 */
export type TranscriptionModel =
  // OpenAI models
  | "whisper-1"
  | "gpt-4o-transcribe"
  | "gpt-4o-mini-transcribe"
  | "gpt-4o-transcribe-diarize"
  // Groq models (current as of Oct 2025)
  | "whisper-large-v3"
  | "whisper-large-v3-turbo"
  // Local models (faster-whisper)
  | "large-v3"
  | "large-v2"
  | "medium"
  | "small"
  | "base"
  | "tiny";

/**
 * Response formats supported across providers
 */
export type ResponseFormat =
  | "json" // Standard JSON response
  | "text" // Plain text only
  | "srt" // SubRip subtitle format
  | "vtt" // WebVTT subtitle format
  | "verbose_json" // JSON with detailed metadata
  | "diarized_json"; // JSON with speaker labels (diarization)

/**
 * Audio file formats supported
 */
export type AudioFormat =
  | "mp3"
  | "mp4"
  | "mpeg"
  | "mpga"
  | "m4a"
  | "wav"
  | "webm";

/**
 * Timestamp granularity options
 */
export type TimestampGranularity = "segment" | "word";

/**
 * Chunking strategy for diarization
 */
export type ChunkingStrategy = "auto" | "vad";

/**
 * Provider-specific configuration
 */
export interface ProviderConfig {
  provider: TranscriptionProvider;
  baseUrl: string;
  defaultModel: TranscriptionModel;
  supportsStreaming: boolean;
  supportsDiarization: boolean;
  supportsTimestamps: boolean;
  maxFileSizeMB: number;
  apiKeyEnvVar?: string;
}

/**
 * Transcription request options
 */
export interface TranscriptionOptions {
  model?: TranscriptionModel;
  language?: string;
  prompt?: string;
  responseFormat?: ResponseFormat;
  temperature?: number;
  timestampGranularities?: TimestampGranularity[];
  stream?: boolean;
  // Diarization options
  diarize?: boolean;
  chunkingStrategy?: ChunkingStrategy;
  knownSpeakerNames?: string[];
  knownSpeakerReferences?: string[]; // Data URLs of audio references
}

/**
 * Transcription response structure (OpenAI-compatible)
 */
export interface TranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
  segments?: TranscriptionSegment[];
  words?: TranscriptionWord[];
}

/**
 * Transcription segment with timing and speaker info
 */
export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker?: string;
  confidence?: number;
}

/**
 * Word-level transcription with timing
 */
export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

/**
 * Provider configurations
 */
export const PROVIDER_CONFIGS: Record<TranscriptionProvider, ProviderConfig> = {
  openai: {
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini-transcribe",
    supportsStreaming: true,
    supportsDiarization: true,
    supportsTimestamps: true,
    maxFileSizeMB: 25,
    apiKeyEnvVar: "OPENAI_API_KEY",
  },
  groq: {
    provider: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "whisper-large-v3",
    supportsStreaming: false,
    supportsDiarization: false,
    supportsTimestamps: true,
    maxFileSizeMB: 25,
    apiKeyEnvVar: "GROQ_API_KEY",
  },
  local: {
    provider: "local",
    baseUrl: "http://localhost:8020/v1", // Default local faster-whisper server
    defaultModel: "large-v3",
    supportsStreaming: false,
    supportsDiarization: true,
    supportsTimestamps: true,
    maxFileSizeMB: 100, // Local can handle larger files
    apiKeyEnvVar: undefined, // No API key needed for local
  },
  custom: {
    provider: "custom",
    baseUrl: "", // Must be provided at runtime
    defaultModel: "whisper-1",
    supportsStreaming: false,
    supportsDiarization: false,
    supportsTimestamps: true,
    maxFileSizeMB: 25,
    apiKeyEnvVar: undefined,
  },
};

/**
 * Get transcription service configuration from environment
 *
 * Priority:
 * 1. TRANSCRIPTION_PROVIDER environment variable (openai/groq/local/custom)
 * 2. NEXT_PUBLIC_TRANSCRIPTION_PROVIDER for client-side
 * 3. Default to OpenAI
 */
export function getTranscriptionProvider(): TranscriptionProvider {
  if (typeof process !== "undefined" && process.env) {
    // Server-side
    const serverProvider = process.env
      .TRANSCRIPTION_PROVIDER as TranscriptionProvider;
    if (serverProvider && PROVIDER_CONFIGS[serverProvider]) {
      return serverProvider;
    }

    // Client-side with NEXT_PUBLIC_ prefix
    const clientProvider = process.env
      .NEXT_PUBLIC_TRANSCRIPTION_PROVIDER as TranscriptionProvider;
    if (clientProvider && PROVIDER_CONFIGS[clientProvider]) {
      return clientProvider;
    }
  }

  // Client-side (browser) - check window object
  if (typeof window !== "undefined") {
    const windowProvider = (window as any)
      .__NEXT_PUBLIC_TRANSCRIPTION_PROVIDER__ as TranscriptionProvider;
    if (windowProvider && PROVIDER_CONFIGS[windowProvider]) {
      return windowProvider;
    }
  }

  return "openai"; // Default to OpenAI
}

/**
 * Get base URL for the current provider
 */
export function getTranscriptionBaseUrl(
  provider?: TranscriptionProvider
): string {
  const activeProvider = provider || getTranscriptionProvider();
  const config = PROVIDER_CONFIGS[activeProvider];

  // Check for custom base URL override
  if (typeof process !== "undefined" && process.env) {
    const customUrl = process.env.TRANSCRIPTION_BASE_URL;
    if (customUrl) {
      return customUrl;
    }
  }

  return config.baseUrl;
}

/**
 * Get API key for the current provider
 *
 * Priority:
 * 1. Server-side: GROQ_API_KEY, OPENAI_API_KEY
 * 2. Client-side: NEXT_PUBLIC_GROQ_API_KEY, NEXT_PUBLIC_OPENAI_API_KEY
 * 3. Window object: __NEXT_PUBLIC_GROQ_API_KEY__, etc.
 */
export function getTranscriptionApiKey(
  provider?: TranscriptionProvider
): string | undefined {
  const activeProvider = provider || getTranscriptionProvider();
  const config = PROVIDER_CONFIGS[activeProvider];

  if (!config.apiKeyEnvVar) {
    return undefined; // No API key needed (e.g., local)
  }

  // Server-side (Node.js)
  if (typeof process !== "undefined" && process.env) {
    const serverKey = process.env[config.apiKeyEnvVar];
    if (serverKey) {
      return serverKey;
    }

    // Client-side with NEXT_PUBLIC_ prefix
    const clientKey = process.env[`NEXT_PUBLIC_${config.apiKeyEnvVar}`];
    if (clientKey) {
      return clientKey;
    }
  }

  // Client-side (browser) - check window object
  if (typeof window !== "undefined") {
    const windowKey = (window as any)[`__NEXT_PUBLIC_${config.apiKeyEnvVar}__`];
    if (windowKey) {
      return windowKey;
    }
  }

  return undefined;
}

/**
 * Get provider configuration
 */
export function getProviderConfig(
  provider?: TranscriptionProvider
): ProviderConfig {
  const activeProvider = provider || getTranscriptionProvider();
  return PROVIDER_CONFIGS[activeProvider];
}

/**
 * Transcription service configuration
 */
export const transcriptionConfig = {
  /**
   * Get the current active provider
   */
  getProvider: getTranscriptionProvider,

  /**
   * Get base URL for transcription API
   */
  getBaseUrl: getTranscriptionBaseUrl,

  /**
   * Get API key for current provider
   */
  getApiKey: getTranscriptionApiKey,

  /**
   * Get provider configuration
   */
  getConfig: getProviderConfig,

  /**
   * Get transcription endpoint URL
   */
  getTranscriptionUrl: (provider?: TranscriptionProvider) => {
    const baseUrl = getTranscriptionBaseUrl(provider);
    return `${baseUrl}/audio/transcriptions`;
  },

  /**
   * Get translation endpoint URL (OpenAI Whisper only)
   */
  getTranslationUrl: (provider?: TranscriptionProvider) => {
    const baseUrl = getTranscriptionBaseUrl(provider);
    return `${baseUrl}/audio/translations`;
  },

  /**
   * Default transcription options
   */
  defaults: {
    model: "gpt-4o-mini-transcribe" as TranscriptionModel,
    language: "en",
    responseFormat: "verbose_json" as ResponseFormat,
    temperature: 0.0,
    timestampGranularities: ["segment"] as TimestampGranularity[],
    stream: false,
    diarize: false,
  },

  /**
   * Provider configurations
   */
  providers: PROVIDER_CONFIGS,
} as const;

/**
 * Helper: Check if a provider supports a feature
 */
export function supportsFeature(
  feature: "streaming" | "diarization" | "timestamps",
  provider?: TranscriptionProvider
): boolean {
  const config = getProviderConfig(provider);
  switch (feature) {
    case "streaming":
      return config.supportsStreaming;
    case "diarization":
      return config.supportsDiarization;
    case "timestamps":
      return config.supportsTimestamps;
    default:
      return false;
  }
}

/**
 * Helper: Validate file size
 */
export function validateFileSize(
  fileSizeMB: number,
  provider?: TranscriptionProvider
): boolean {
  const config = getProviderConfig(provider);
  return fileSizeMB <= config.maxFileSizeMB;
}

/**
 * Helper: Convert File to base64 data URL (for speaker references)
 */
export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert file to data URL"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
