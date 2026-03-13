"use client";
/// <reference lib="dom" />

/**
 * useLangExtract Hook
 *
 * React Query-based hooks for the LangExtract microservice.
 * Provides automatic caching, request deduplication, and retry logic.
 */

import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

import { langextractConfig } from "../config/langextract-config";

// Local type definitions to avoid importing server-side dependencies
export interface ExtractionExample {
  input_text: string;
  expected_output: Record<string, any>;
}

export interface LangExtractRequest {
  textOrDocuments: string[];
  promptDescription: string;
  modelId?: string;
  serviceUrl?: string;
  includeSourceGrounding?: boolean;
  examples?: ExtractionExample[];
}

export interface LangExtractResponse {
  data: any;
  metadata?: Record<string, any>;
  error?: string;
}

interface ExtractVariables {
  textOrDocuments: string[];
  promptDescription: string;
  modelId?: string;
  serviceUrl?: string;
  includeSourceGrounding?: boolean;
  examples?: ExtractionExample[];
}

/**
 * React Query mutation hook for extracting structured data using LangExtract service
 *
 * @example
 * const { mutate, isPending, error, data } = useLangExtract({
 *   onSuccess: (result) => console.log("Extracted:", result),
 * });
 *
 * mutate({
 *   textOrDocuments: "Elon Musk is CEO of Tesla",
 *   promptDescription: "Extract person information"
 * });
 */
export function useLangExtract(
  options?: UseMutationOptions<LangExtractResponse, Error, ExtractVariables>
) {
  return useMutation<LangExtractResponse, Error, ExtractVariables>({
    mutationFn: async (variables) => {
      const {
        textOrDocuments,
        promptDescription,
        modelId = langextractConfig.defaults.modelId,
        serviceUrl = langextractConfig.getServiceUrl(),
        includeSourceGrounding = langextractConfig.defaults
          .includeSourceGrounding,
        examples,
      } = variables;

      // Validate serviceUrl
      if (!serviceUrl || typeof serviceUrl !== "string" || !serviceUrl.trim()) {
        throw new Error("serviceUrl is required for extract request");
      }

      const response = await fetch(`${serviceUrl}/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text_or_documents: textOrDocuments,
          prompt_description: promptDescription,
          model_id: modelId,
          include_source_grounding: includeSourceGrounding,
          examples: examples,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail
          ? `Extraction failed: ${response.status} ${response.statusText} - ${errorData.detail}`
          : `Extraction failed: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      return {
        data: result.data || result,
        metadata: result.metadata || {},
        error: result.error,
      };
    },
    ...options,
  });
}

/**
 * React Query hook to check if LangExtract service is available
 *
 * @example
 * const { data: isAvailable, isLoading, refetch } = useLangExtractHealth();
 */
export function useLangExtractHealth(
  options?: Omit<UseQueryOptions<boolean, Error>, "queryKey" | "queryFn">
) {
  return useQuery<boolean, Error>({
    queryKey: ["langextract", "health"],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(langextractConfig.getHealthUrl(), {
          method: "GET",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response.ok;
      } catch (error) {
        clearTimeout(timeoutId);
        console.warn("LangExtract service not available:", error);
        return false;
      }
    },
    staleTime: 30000, // 30 seconds - health status changes relatively slowly
    refetchOnWindowFocus: true, // Check when user returns to window
    retry: 1, // Only retry once for health checks
    ...options,
  });
}

/**
 * React Query hook to fetch available models from LangExtract
 *
 * @example
 * const { data: models, isLoading, refetch } = useLangExtractModels({ enabled: false });
 * // Later: refetch() to load models
 */
export function useLangExtractModels(
  options?: Omit<
    UseQueryOptions<
      {
        gemini_models: string[];
        openai_models: string[];
        ollama_models: string[];
        current_default: string;
      } | null,
      Error
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: ["langextract", "models"],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(langextractConfig.getModelsUrl(), {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          return null;
        }
        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        console.warn("Failed to fetch LangExtract models:", error);
        return null;
      }
    },
    staleTime: 300000, // 5 minutes - models rarely change
    enabled: false, // Manual fetch - use refetch() to trigger
    ...options,
  });
}
