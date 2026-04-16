/**
 * @protolabsai/llm-providers/client
 *
 * Client-safe utilities for browser/React components
 */

// Re-export types for convenience
export type {
  LLMProvider,
  ProviderType,
  ModelOptions,
  ModelInfo,
  HealthStatus,
  ProviderModel,
} from "../types/provider";

export type { ModelCategory, ModelConfig } from "../types/model";

export type { LLMProvidersConfig, ProviderConfig } from "../types/config";

// Client-safe constants
export const MODEL_CATEGORIES = [
  "fast",
  "smart",
  "reasoning",
  "vision",
  "coding",
] as const;

export const PROVIDER_TYPES = ["cloud", "local", "custom"] as const;

// Client utilities (no Node.js APIs)
export { formatValidationResults } from "../utils/model-validator";
