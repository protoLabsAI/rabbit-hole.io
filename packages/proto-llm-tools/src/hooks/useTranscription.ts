"use client";
/// <reference lib="dom" />

/**
 * useTranscription Hooks
 *
 * React Query-based hooks for OpenAI-compatible transcription APIs.
 * Supports multiple providers: OpenAI, Groq, Local (faster-whisper), Custom.
 * Provides automatic caching, request deduplication, and retry logic.
 */

import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

import {
  transcriptionConfig,
  getProviderConfig,
  supportsFeature,
  validateFileSize,
  type TranscriptionProvider,
  type TranscriptionModel,
  type ResponseFormat,
  type TimestampGranularity,
  type ChunkingStrategy,
  type TranscriptionResponse,
  type ProviderConfig,
} from "../config/transcription-config";

/**
 * Variables for transcription mutation
 */
export interface TranscribeVariables {
  file: File;
  provider?: TranscriptionProvider;
  model?: TranscriptionModel;
  language?: string;
  prompt?: string;
  responseFormat?: ResponseFormat;
  temperature?: number;
  timestampGranularities?: TimestampGranularity[];
  // Diarization options
  diarize?: boolean;
  chunkingStrategy?: ChunkingStrategy;
  knownSpeakerNames?: string[];
  knownSpeakerReferences?: File[]; // Audio files for speaker references
}

/**
 * Variables for translation mutation (translate to English)
 */
export interface TranslateVariables {
  file: File;
  provider?: TranscriptionProvider;
  model?: TranscriptionModel;
  prompt?: string;
  responseFormat?: ResponseFormat;
  temperature?: number;
}

/**
 * Provider health check response
 */
export interface ProviderHealthResponse {
  provider: TranscriptionProvider;
  available: boolean;
  baseUrl: string;
  config: ProviderConfig;
}

/**
 * React Query mutation hook for transcribing audio files
 *
 * @example
 * const { mutate, isPending, data } = useTranscribe({
 *   onSuccess: (result) => console.log("Transcription:", result.text),
 * });
 *
 * mutate({
 *   file: audioFile,
 *   provider: "groq",
 *   language: "en",
 *   timestampGranularities: ["word", "segment"]
 * });
 */
export function useTranscribe(
  options?: UseMutationOptions<
    TranscriptionResponse,
    Error,
    TranscribeVariables
  >
) {
  return useMutation<TranscriptionResponse, Error, TranscribeVariables>({
    mutationFn: async (variables) => {
      const {
        file,
        provider,
        model,
        language = transcriptionConfig.defaults.language,
        prompt,
        responseFormat = transcriptionConfig.defaults.responseFormat,
        temperature = transcriptionConfig.defaults.temperature,
        timestampGranularities = transcriptionConfig.defaults
          .timestampGranularities,
        diarize = false,
        chunkingStrategy,
        knownSpeakerNames,
        knownSpeakerReferences,
      } = variables;

      // Validate file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (!validateFileSize(fileSizeMB, provider)) {
        const config = getProviderConfig(provider);
        throw new Error(
          `File size (${fileSizeMB.toFixed(2)} MB) exceeds maximum allowed size (${config.maxFileSizeMB} MB) for provider ${config.provider}`
        );
      }

      // Get provider configuration
      const config = getProviderConfig(provider);
      const effectiveModel = model || config.defaultModel;

      // Use API proxy in browser, direct API on server
      const isClient = typeof window !== "undefined";
      const useProxy = isClient; // Always proxy from browser

      // Storybook runs on :6006, Next.js on :3000
      const apiBase =
        isClient && window.location.port === "6006"
          ? "http://localhost:3000"
          : "";

      const url = useProxy
        ? `${apiBase}/api/transcribe` // Proxy route (no auth needed)
        : transcriptionConfig.getTranscriptionUrl(provider); // Direct API

      // Build form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("model", effectiveModel);
      formData.append("provider", config.provider); // Tell proxy which provider to use

      if (language) {
        formData.append("language", language);
      }

      if (prompt) {
        formData.append("prompt", prompt);
      }

      formData.append("response_format", responseFormat);

      if (temperature !== undefined) {
        formData.append("temperature", temperature.toString());
      }

      // Timestamps (if supported)
      if (supportsFeature("timestamps", provider) && timestampGranularities) {
        timestampGranularities.forEach((granularity) => {
          formData.append("timestamp_granularities[]", granularity);
        });
      }

      // Diarization (if supported and requested)
      if (diarize && supportsFeature("diarization", provider)) {
        formData.append("diarize", "true");

        if (chunkingStrategy) {
          formData.append("chunking_strategy", chunkingStrategy);
        }

        if (knownSpeakerNames && knownSpeakerNames.length > 0) {
          knownSpeakerNames.forEach((name) => {
            formData.append("known_speaker_names[]", name);
          });
        }

        if (knownSpeakerReferences && knownSpeakerReferences.length > 0) {
          // Convert reference files to data URLs
          const dataUrls = await Promise.all(
            knownSpeakerReferences.map(async (refFile) => {
              return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  if (typeof reader.result === "string") {
                    resolve(reader.result);
                  } else {
                    reject(new Error("Failed to convert file to data URL"));
                  }
                };
                reader.onerror = reject;
                reader.readAsDataURL(refFile);
              });
            })
          );

          dataUrls.forEach((dataUrl) => {
            formData.append("known_speaker_references[]", dataUrl);
          });
        }
      }

      // Build headers (only for direct API calls on server)
      const headers: HeadersInit = {};
      if (!useProxy) {
        const apiKey = transcriptionConfig.getApiKey(provider);
        if (apiKey) {
          headers["Authorization"] = `Bearer ${apiKey}`;
        }
      }

      // Make API request (proxy or direct) with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

      let response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers,
          body: formData,
          signal: controller.signal,
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          throw new Error(
            "Transcription request timed out after 5 minutes. Try a smaller file or different provider."
          );
        }

        if (
          fetchError instanceof TypeError &&
          fetchError.message.includes("Failed to fetch")
        ) {
          throw new Error(
            `Cannot connect to transcription service. ${provider === "local" ? "Make sure local server is running at ${url}" : "Service may be down."}`
          );
        }

        throw new Error(
          `Network error: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`
        );
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || errorData.details
            ? `${errorData.error}${errorData.details ? `: ${errorData.details}` : ""}`
            : `Transcription failed: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Normalize response to standard format
      return {
        text: result.text || "",
        language: result.language,
        duration: result.duration,
        segments: result.segments,
        words: result.words,
      };
    },
    ...options,
  });
}

/**
 * React Query mutation hook for translating audio to English
 * (OpenAI Whisper only)
 *
 * @example
 * const { mutate, isPending, data } = useTranslate();
 * mutate({ file: germanAudio, model: "whisper-1" });
 */
export function useTranslate(
  options?: UseMutationOptions<TranscriptionResponse, Error, TranslateVariables>
) {
  return useMutation<TranscriptionResponse, Error, TranslateVariables>({
    mutationFn: async (variables) => {
      const {
        file,
        provider = "groq", // Groq now supports translation (FREE)
        model = provider === "groq" ? "whisper-large-v3" : "whisper-1",
        prompt,
        responseFormat = "json",
        temperature = 0.0,
      } = variables;

      // Validate file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (!validateFileSize(fileSizeMB, provider)) {
        const config = getProviderConfig(provider);
        throw new Error(
          `File size (${fileSizeMB.toFixed(2)} MB) exceeds maximum allowed size (${config.maxFileSizeMB} MB)`
        );
      }

      // Use API proxy in browser, direct API on server
      const isClient = typeof window !== "undefined";
      const useProxy = isClient;

      // Storybook runs on :6006, Next.js on :3000
      const apiBase =
        isClient && window.location.port === "6006"
          ? "http://localhost:3000"
          : "";

      const url = useProxy
        ? `${apiBase}/api/transcribe/translate` // Proxy route
        : transcriptionConfig.getTranslationUrl(provider); // Direct API

      // Build form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("model", model);

      if (prompt) {
        formData.append("prompt", prompt);
      }

      formData.append("response_format", responseFormat);
      // Clamp temperature to valid range (0-1)
      const clampedTemperature = Math.max(0, Math.min(1, temperature));
      formData.append("temperature", clampedTemperature.toString());

      // Build headers (only for direct API calls on server)
      const headers: HeadersInit = {};
      if (!useProxy) {
        const apiKey = transcriptionConfig.getApiKey(provider);
        if (apiKey) {
          headers["Authorization"] = `Bearer ${apiKey}`;
        }
      }

      // Make API request (proxy or direct)
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message
          ? `Translation failed: ${response.status} ${response.statusText} - ${errorData.error.message}`
          : `Translation failed: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();

      return {
        text: result.text || "",
        language: "en", // Translation always outputs English
        duration: result.duration,
        segments: result.segments,
        words: result.words,
      };
    },
    ...options,
  });
}

/**
 * React Query hook to check provider health/availability
 *
 * @example
 * const { data, isLoading, refetch } = useProviderHealth("groq");
 * if (data?.available) { ... }
 */
export function useProviderHealth(
  provider?: TranscriptionProvider,
  options?: Omit<
    UseQueryOptions<ProviderHealthResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  const activeProvider = provider || transcriptionConfig.getProvider();

  return useQuery<ProviderHealthResponse, Error>({
    queryKey: ["transcription", "health", activeProvider],
    queryFn: async () => {
      const config = getProviderConfig(activeProvider);
      const baseUrl = transcriptionConfig.getBaseUrl(activeProvider);

      // For local/custom providers, check if endpoint is reachable
      if (activeProvider === "local" || activeProvider === "custom") {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(`${baseUrl}/health`, {
            method: "GET",
            signal: controller.signal,
          }).catch(() => null);

          clearTimeout(timeoutId);

          return {
            provider: activeProvider,
            available: response?.ok || false,
            baseUrl,
            config,
          };
        } catch {
          return {
            provider: activeProvider,
            available: false,
            baseUrl,
            config,
          };
        }
      }

      // Use proxy health check in browser
      const isClient = typeof window !== "undefined";

      if (isClient) {
        // Storybook runs on :6006, Next.js on :3000
        const apiBase =
          window.location.port === "6006" ? "http://localhost:3000" : "";

        // Call proxy health endpoint
        try {
          const response = await fetch(
            `${apiBase}/api/transcribe/health?provider=${activeProvider}`
          );
          if (response.ok) {
            const data = await response.json();
            return {
              provider: activeProvider,
              available: data.available,
              baseUrl: data.baseUrl,
              config,
            };
          }
        } catch (error) {
          console.warn(`Health check failed for ${activeProvider}:`, error);
        }

        return {
          provider: activeProvider,
          available: false,
          baseUrl,
          config,
        };
      }

      // Server-side: check API key directly
      const apiKey = transcriptionConfig.getApiKey(activeProvider);
      return {
        provider: activeProvider,
        available: !!apiKey,
        baseUrl,
        config,
      };
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
    retry: 0,
    ...options,
  });
}

/**
 * Hook to get transcription configuration
 * Useful for displaying current settings in UI
 *
 * @example
 * const { provider, config, defaults } = useTranscriptionConfig();
 */
export function useTranscriptionConfig() {
  const provider = transcriptionConfig.getProvider();
  const config = getProviderConfig(provider);

  return {
    provider,
    config,
    defaults: transcriptionConfig.defaults,
    baseUrl: transcriptionConfig.getBaseUrl(),
    apiKey: !!transcriptionConfig.getApiKey(), // Return boolean for security
    providers: Object.keys(
      transcriptionConfig.providers
    ) as TranscriptionProvider[],
    supportsStreaming: supportsFeature("streaming", provider),
    supportsDiarization: supportsFeature("diarization", provider),
    supportsTimestamps: supportsFeature("timestamps", provider),
  };
}

/**
 * Hook to check feature support for a specific provider
 *
 * @example
 * const { data: supportsDiarization } = useFeatureSupport("groq", "diarization");
 */
export function useFeatureSupport(
  provider: TranscriptionProvider,
  feature: "streaming" | "diarization" | "timestamps"
) {
  return useQuery({
    queryKey: ["transcription", "feature", provider, feature],
    queryFn: () => supportsFeature(feature, provider),
    staleTime: Infinity, // Feature support doesn't change
  });
}
