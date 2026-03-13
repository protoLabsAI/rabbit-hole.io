/**
 * @proto/llm-providers/server
 *
 * Server-only functionality (API routes, Server Components, Server Actions)
 * Uses Node.js APIs - DO NOT import in client components
 */

// Factory and convenience functions
export { LLMProviderFactory } from "./factory/provider-factory";
export {
  getProvider,
  getModel,
  getModelByName,
  listProviders,
} from "./factory/convenience";

// Configuration (uses fs)
export { loadConfig, getConfig } from "./config";

// Providers
export {
  BaseLLMProvider,
  OpenAIProvider,
  AnthropicProvider,
  GoogleProvider,
  GroqProvider,
  OllamaProvider,
  BedrockProvider,
  CustomOpenAIProvider,
  FakeProvider,
} from "./providers";

// Types
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

// Generated types
export type {
  ProviderName,
  ModelName,
  OpenaiModelName,
  AnthropicModelName,
  GoogleModelName,
  GroqModelName,
  OllamaModelName,
  BedrockModelName,
  CustomOpenaiModelName,
  ProviderMetadata,
} from "../generated/config-types";

export {
  PROVIDER_NAMES,
  MODEL_CATEGORIES,
  PROVIDER_METADATA,
  getProviderInfo,
  isValidProviderName,
  isValidModelCategory,
  getModelsForProviderCategory,
} from "../generated/config-types";

// Metadata
export {
  PROVIDER_LABELS,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  PROVIDER_DESCRIPTIONS,
} from "../types/metadata";

// Validation
export {
  validateProviderModels,
  formatValidationResults,
} from "../utils/model-validator";
