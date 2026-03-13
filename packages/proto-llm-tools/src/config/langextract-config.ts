/// <reference lib="dom" />

/**
 * LangExtract Service Configuration
 *
 * Centralized configuration for the LangExtract microservice connection.
 * Supports both client-side and server-side usage with environment variables.
 */

/**
 * Get the LangExtract service URL from environment variables
 *
 * Priority:
 * 1. LANGEXTRACT_URL environment variable
 * 2. NEXT_PUBLIC_LANGEXTRACT_URL for client-side
 * 3. Default to localhost:8000
 *
 * @returns The LangExtract service base URL
 */
export function getLangExtractServiceUrl(): string {
  // Server-side (Node.js)
  if (typeof process !== "undefined" && process.env) {
    const serverUrl = process.env.LANGEXTRACT_URL;
    if (serverUrl) {
      return serverUrl;
    }
  }

  // Client-side (browser)
  if (typeof window !== "undefined") {
    const clientUrl =
      (window as any).__NEXT_PUBLIC_LANGEXTRACT_URL__ ||
      (typeof process !== "undefined" &&
        process.env?.NEXT_PUBLIC_LANGEXTRACT_URL);
    if (clientUrl) {
      return clientUrl;
    }
  }

  // Default for development
  return "http://localhost:8000";
}

/**
 * LangExtract service configuration
 */
export const langextractConfig = {
  /**
   * Get the service base URL
   */
  getServiceUrl: getLangExtractServiceUrl,

  /**
   * Get the extract endpoint URL
   */
  getExtractUrl: () => `${getLangExtractServiceUrl()}/extract`,

  /**
   * Get the health check URL
   */
  getHealthUrl: () => `${getLangExtractServiceUrl()}/health`,

  /**
   * Get the models list URL
   */
  getModelsUrl: () => `${getLangExtractServiceUrl()}/models`,

  /**
   * Default model configuration
   */
  defaults: {
    modelId: "gemini-2.5-flash-lite",
    provider: "gemini",
    includeSourceGrounding: true,
    temperature: 0.1,
    maxTokens: 8192,
    // Phase-specific model overrides
    resolutionModelId: "gpt-4o-mini",
    structureModelId: "gemini-2.5-flash-lite",
  },
} as const;

/**
 * Check if LangExtract service is available
 *
 * @returns Promise<boolean> - true if service is healthy
 */
export async function isLangExtractAvailable(): Promise<boolean> {
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
}

/**
 * Get available models from LangExtract service
 *
 * @returns Promise<object> - Available models by provider
 */
export async function getLangExtractModels(): Promise<{
  gemini_models: string[];
  openai_models: string[];
  ollama_models: string[];
  current_default: string;
} | null> {
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
}
