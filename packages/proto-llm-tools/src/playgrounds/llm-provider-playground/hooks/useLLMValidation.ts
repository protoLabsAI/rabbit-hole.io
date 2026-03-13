/**
 * useLLMValidation Hook
 *
 * Validates configured models against provider APIs
 */

import { useState, useCallback } from "react";

import type { ValidationResult, APIKeys, APIMode } from "../types";

export interface UseLLMValidationOptions {
  provider: string;
  category: string;
  currentModel: string;
  apiKeys?: APIKeys;
  apiMode: APIMode;
}

export interface UseLLMValidationReturn {
  validationResults: ValidationResult[];
  validateModels: () => Promise<void>;
  isValidating: boolean;
}

export function useLLMValidation({
  provider,
  category,
  currentModel,
  apiKeys,
  apiMode,
}: UseLLMValidationOptions): UseLLMValidationReturn {
  const [validationResults, setValidationResults] = useState<
    ValidationResult[]
  >([]);
  const [isValidating, setIsValidating] = useState(false);

  const validateModels = useCallback(async () => {
    setIsValidating(true);
    try {
      const configuredModels = {
        [category]: [{ name: currentModel }],
      };

      const response = await fetch("/api/llm-playground/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          configuredModels,
          apiKey:
            apiMode === "byok"
              ? apiKeys?.[provider as keyof APIKeys]
              : undefined,
          useHosted: apiMode === "hosted",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setValidationResults(data.results || []);
      }
    } catch (error) {
      console.error("Validation failed:", error);
    } finally {
      setIsValidating(false);
    }
  }, [provider, category, currentModel, apiKeys, apiMode]);

  return {
    validationResults,
    validateModels,
    isValidating,
  };
}
