/**
 * @proto/llm-providers
 *
 * Types only - safe for client component imports
 * For functionality, use:
 * - Client: @proto/llm-providers/client
 * - Server: @proto/llm-providers/server
 */

// Types (safe for client)
export type {
  LLMProvider,
  ProviderType,
  ModelOptions,
  ModelInfo,
  HealthStatus,
  ProviderModel,
} from "./types/provider";

export type { ModelCategory, ModelConfig } from "./types/model";

export type { LLMProvidersConfig, ProviderConfig } from "./types/config";

// Generated types (safe for client)
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
} from "./generated/config-types";

export {
  PROVIDER_NAMES,
  MODEL_CATEGORIES,
  PROVIDER_METADATA,
} from "./generated/config-types";
