"use client";
/// <reference lib="dom" />

/**
 * useWikipedia Hooks
 *
 * React Query-based hooks for Wikipedia API integration.
 * Provides automatic caching, request deduplication, and retry logic.
 */

import {
  useQuery,
  useMutation,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";

import {
  queryWikipedia,
  searchWikipedia,
  fetchWikipediaPage,
  wikipediaConfig,
  type WikipediaQueryResponse,
  type WikipediaSearchResult,
  type WikipediaPage,
  type WikipediaLanguage,
} from "../config/wikipedia-config";

interface WikipediaQueryVariables {
  query: string;
  language?: WikipediaLanguage;
  topKResults?: number;
  maxContentLength?: number;
}

interface WikipediaSearchVariables {
  query: string;
  language?: WikipediaLanguage;
  limit?: number;
}

interface WikipediaPageVariables {
  pageId: number;
  language?: WikipediaLanguage;
  maxContentLength?: number;
}

/**
 * React Query mutation hook for querying Wikipedia
 * Combines search and content fetching
 *
 * @example
 * const { mutate, isPending, data } = useWikipediaQuery();
 * mutate({ query: "Albert Einstein", topKResults: 2 });
 */
export function useWikipediaQuery(
  options?: UseMutationOptions<
    WikipediaQueryResponse,
    Error,
    WikipediaQueryVariables
  >
) {
  return useMutation<WikipediaQueryResponse, Error, WikipediaQueryVariables>({
    mutationFn: async (variables) => {
      const { query, language, topKResults, maxContentLength } = variables;

      if (!query || query.trim().length === 0) {
        throw new Error("Query is required");
      }

      return await queryWikipedia(query, {
        language,
        topKResults,
        maxContentLength,
      });
    },
    ...options,
  });
}

/**
 * React Query mutation hook for searching Wikipedia
 * Returns search results only (no full content)
 *
 * @example
 * const { mutate, isPending, data } = useWikipediaSearch();
 * mutate({ query: "Quantum physics", limit: 5 });
 */
export function useWikipediaSearch(
  options?: UseMutationOptions<
    WikipediaSearchResult[],
    Error,
    WikipediaSearchVariables
  >
) {
  return useMutation<WikipediaSearchResult[], Error, WikipediaSearchVariables>({
    mutationFn: async (variables) => {
      const { query, language, limit } = variables;

      if (!query || query.trim().length === 0) {
        throw new Error("Query is required");
      }

      return await searchWikipedia(query, { language, limit });
    },
    ...options,
  });
}

/**
 * React Query hook for fetching a specific Wikipedia page
 * Uses query for automatic caching of page content
 *
 * @example
 * const { data, isLoading } = useWikipediaPage(12345, { enabled: true });
 */
export function useWikipediaPage(
  pageId: number | null | undefined,
  options?: Omit<
    UseQueryOptions<WikipediaPage | null, Error>,
    "queryKey" | "queryFn"
  > & {
    language?: WikipediaLanguage;
    maxContentLength?: number;
  }
) {
  const { language, maxContentLength, ...queryOptions } = options || {};

  return useQuery<WikipediaPage | null, Error>({
    queryKey: ["wikipedia", "page", pageId, language, maxContentLength],
    queryFn: async () => {
      if (!pageId) {
        return null;
      }
      return await fetchWikipediaPage(pageId, { language, maxContentLength });
    },
    enabled: !!pageId && (queryOptions.enabled ?? true),
    staleTime: 1000 * 60 * 60, // 1 hour - Wikipedia content doesn't change often
    ...queryOptions,
  });
}

/**
 * React Query hook for Wikipedia search with caching
 * Alternative to mutation for scenarios where you want automatic caching
 *
 * @example
 * const { data, isLoading } = useWikipediaSearchQuery("Einstein", { enabled: true });
 */
export function useWikipediaSearchQuery(
  query: string | null | undefined,
  options?: Omit<
    UseQueryOptions<WikipediaSearchResult[], Error>,
    "queryKey" | "queryFn"
  > & {
    language?: WikipediaLanguage;
    limit?: number;
  }
) {
  const { language, limit, ...queryOptions } = options || {};

  return useQuery<WikipediaSearchResult[], Error>({
    queryKey: ["wikipedia", "search", query, language, limit],
    queryFn: async () => {
      if (!query || query.trim().length === 0) {
        return [];
      }
      return await searchWikipedia(query, { language, limit });
    },
    enabled: !!query && (queryOptions.enabled ?? true),
    staleTime: 1000 * 60 * 5, // 5 minutes - search results relatively stable
    ...queryOptions,
  });
}

/**
 * Hook to get Wikipedia configuration
 * Useful for displaying current settings in UI
 */
export function useWikipediaConfig() {
  return {
    config: wikipediaConfig,
    defaults: wikipediaConfig.defaults,
    languages: [
      "en",
      "es",
      "fr",
      "de",
      "ja",
      "zh",
      "ru",
      "pt",
      "it",
      "ar",
    ] as const,
  };
}
