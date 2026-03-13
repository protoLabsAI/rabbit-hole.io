"use client";

import { useEffect, useState } from "react";

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  category: string;
  metadata: {
    isFree?: boolean;
    speed?: "fast" | "balanced" | "slow";
    temperature: number;
    maxTokens: number;
  };
}

export interface UseModelDataOptions {
  provider?: string;
  category?: string;
  enabled?: boolean;
}

export interface UseModelDataReturn {
  models: ModelOption[];
  loading: boolean;
  error: string | null;
  defaultModel: string;
}

/**
 * Hook to fetch available models from the API
 *
 * @param options - Filter options for provider/category
 * @returns Model data with loading and error states
 */
export function useModelData(
  options?: UseModelDataOptions
): UseModelDataReturn {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultModel, setDefaultModel] = useState("");

  useEffect(() => {
    if (options?.enabled === false) return;

    const fetchModels = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (options?.provider) params.set("provider", options.provider);
        if (options?.category) params.set("category", options.category);

        const response = await fetch(`/api/models?${params}`);
        if (!response.ok) throw new Error("Failed to fetch models");

        const data = await response.json();

        setModels(data.models || []);
        setDefaultModel(data.defaultModel || "");
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load models");
        setModels([]);
        setDefaultModel("");
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [options?.provider, options?.category, options?.enabled]);

  return { models, loading, error, defaultModel };
}
