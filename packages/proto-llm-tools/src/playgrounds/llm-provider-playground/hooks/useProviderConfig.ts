/**
 * useProviderConfig Hook
 *
 * Manages provider and category configuration state
 */

import { useState, useCallback } from "react";

import type { PlaygroundConfig } from "../types";

export interface UseProviderConfigReturn {
  config: PlaygroundConfig;
  setProvider: (provider: PlaygroundConfig["provider"]) => void;
  setCategory: (category: PlaygroundConfig["category"]) => void;
  setParameter: <K extends keyof PlaygroundConfig>(
    key: K,
    value: PlaygroundConfig[K]
  ) => void;
  resetConfig: () => void;
}

const DEFAULT_CONFIG: PlaygroundConfig = {
  provider: "openai",
  category: "smart",
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

export function useProviderConfig(
  initialConfig?: Partial<PlaygroundConfig>
): UseProviderConfigReturn {
  const [config, setConfig] = useState<PlaygroundConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  const setProvider = useCallback((provider: PlaygroundConfig["provider"]) => {
    setConfig((prev) => ({ ...prev, provider }));
  }, []);

  const setCategory = useCallback((category: PlaygroundConfig["category"]) => {
    setConfig((prev) => ({ ...prev, category }));
  }, []);

  const setParameter = useCallback(
    <K extends keyof PlaygroundConfig>(key: K, value: PlaygroundConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  return {
    config,
    setProvider,
    setCategory,
    setParameter,
    resetConfig,
  };
}
