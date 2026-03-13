/**
 * useApiKeyManager Hook
 *
 * Manages in-memory API keys and provider status
 */

import { useState, useCallback, useEffect } from "react";

import type { APIKeys, APIMode } from "../types";

export interface UseApiKeyManagerReturn {
  apiKeys: APIKeys;
  tempKey: string;
  setTempKey: (key: string) => void;
  showKeys: boolean;
  setShowKeys: (show: boolean) => void;
  saveKey: (provider: keyof APIKeys, key: string) => void;
  clearKey: (provider: keyof APIKeys) => void;
  providerStatus: Record<string, boolean>;
}

export function useApiKeyManager(apiMode: APIMode): UseApiKeyManagerReturn {
  const [apiKeys, setApiKeys] = useState<APIKeys>({});
  const [tempKey, setTempKey] = useState("");
  const [showKeys, setShowKeys] = useState(false);
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>(
    {}
  );

  // Check provider availability
  useEffect(() => {
    if (apiMode === "hosted") {
      // In hosted mode, all cloud providers are available via server
      setProviderStatus({
        openai: true,
        anthropic: true,
        google: true,
        groq: true,
        ollama: true,
        fake: true,
      });
    } else {
      // In BYOK mode, check for user-provided keys
      const status: Record<string, boolean> = {
        openai: !!apiKeys.openai,
        anthropic: !!apiKeys.anthropic,
        google: !!apiKeys.google,
        groq: !!apiKeys.groq,
        ollama: true,
        fake: true,
      };
      setProviderStatus(status);
    }
  }, [apiKeys, apiMode]);

  const saveKey = useCallback((provider: keyof APIKeys, key: string) => {
    if (key.trim()) {
      setApiKeys((prev) => ({ ...prev, [provider]: key.trim() }));
    }
  }, []);

  const clearKey = useCallback((provider: keyof APIKeys) => {
    setApiKeys((prev) => {
      const updated = { ...prev };
      delete updated[provider];
      return updated;
    });
  }, []);

  return {
    apiKeys,
    tempKey,
    setTempKey,
    showKeys,
    setShowKeys,
    saveKey,
    clearKey,
    providerStatus,
  };
}
