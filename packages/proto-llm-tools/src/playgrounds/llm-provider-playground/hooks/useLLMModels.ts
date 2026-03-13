/**
 * useLLMModels Hook
 *
 * Manages model fetching and assignment to categories
 */

import { useSessionStorage } from "@uidotdev/usehooks";
import { useState, useCallback, useEffect } from "react";

import type { ProviderModel, APIKeys, APIMode } from "../types";
import { getModelCategories } from "../utils/model-helpers";

export interface UseLLMModelsOptions {
  provider: string;
  configMappings: Record<string, Record<string, string | null>>;
  apiKeys?: APIKeys;
  apiMode: APIMode;
  autoFetch?: boolean;
}

export interface UseLLMModelsReturn {
  availableModels: ProviderModel[];
  loadingModels: boolean;
  fetchModels: () => Promise<void>;
  modelOverrides: Record<string, Record<string, string>>;
  assignModelToCategory: (modelId: string, category: string) => void;
  clearCategoryOverride: (category: string) => void;
  getModelCategories: (modelId: string) => string[];
}

export function useLLMModels({
  provider,
  configMappings,
  apiKeys,
  apiMode,
  autoFetch = false,
}: UseLLMModelsOptions): UseLLMModelsReturn {
  const [availableModels, setAvailableModels] = useState<ProviderModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelOverrides, setModelOverrides] = useSessionStorage<
    Record<string, Record<string, string>>
  >("llm-playground-model-overrides", {});

  const fetchModels = useCallback(async () => {
    setLoadingModels(true);
    try {
      const response = await fetch("/api/llm-playground/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey:
            apiMode === "byok"
              ? apiKeys?.[provider as keyof APIKeys]
              : undefined,
          useHosted: apiMode === "hosted",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableModels(data.models || []);
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, [provider, apiKeys, apiMode]);

  const assignModelToCategory = useCallback(
    (modelId: string, category: string) => {
      setModelOverrides((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          [category]: modelId,
        },
      }));
    },
    [provider, setModelOverrides]
  );

  const clearCategoryOverride = useCallback(
    (category: string) => {
      setModelOverrides((prev) => {
        const updated = { ...prev };
        if (updated[provider]) {
          delete updated[provider][category];
        }
        return updated;
      });
    },
    [provider, setModelOverrides]
  );

  const getModelCategoriesForModel = useCallback(
    (modelId: string) => {
      return getModelCategories(
        configMappings,
        modelOverrides,
        provider,
        modelId
      );
    },
    [configMappings, modelOverrides, provider]
  );

  // Auto-fetch on mount if requested
  useEffect(() => {
    if (autoFetch) {
      fetchModels();
    }
  }, [autoFetch, fetchModels]);

  return {
    availableModels,
    loadingModels,
    fetchModels,
    modelOverrides,
    assignModelToCategory,
    clearCategoryOverride,
    getModelCategories: getModelCategoriesForModel,
  };
}
