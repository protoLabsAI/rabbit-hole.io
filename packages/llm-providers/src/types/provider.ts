import { ModelCategory, ModelConfig } from "./model";

export type ProviderType = "cloud" | "local" | "custom";

export interface ModelOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  [key: string]: any;
}

export interface ModelInfo {
  name: string;
  category: ModelCategory;
  provider: string;
  config: ModelConfig;
}

export interface HealthStatus {
  available: boolean;
  latency?: number;
  errorRate?: number;
  lastChecked: Date;
}

export interface ProviderModel {
  id: string;
  name: string;
  description?: string;
  contextWindow?: number;
  capabilities?: string[];
  pricing?: {
    input?: number;
    output?: number;
  };
}

/**
 * Core LLM provider interface
 */
export interface LLMProvider {
  /**
   * Provider name (e.g., "openai", "anthropic")
   */
  readonly name: string;

  /**
   * Provider type (cloud, local, custom)
   */
  readonly type: ProviderType;

  /**
   * Get a model by category (fast, smart, reasoning, etc.)
   */
  getModel(category: ModelCategory, options?: ModelOptions): any;

  /**
   * Get a specific model by name
   */
  getModelByName(name: string, options?: ModelOptions): any;

  /**
   * List all available models for this provider (from config)
   */
  listModels(): Promise<ModelInfo[]>;

  /**
   * List available models from provider API (live data)
   */
  listAvailableModels(): Promise<ProviderModel[]>;

  /**
   * Check if provider is available (API key present, service reachable)
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get provider health status
   */
  healthCheck(): Promise<HealthStatus>;
}
