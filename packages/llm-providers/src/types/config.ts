import type { ProviderName } from "../generated/config-types";

import { ModelCategory, ModelConfig } from "./model";

/**
 * Root configuration object
 */
export interface LLMProvidersConfig {
  /**
   * Default provider to use when none specified
   * @default "openai"
   */
  defaultProvider?: ProviderName;

  /**
   * Default category to use when none specified
   * @default "smart"
   */
  defaultCategory?: ModelCategory;

  /**
   * Provider configurations
   */
  providers: {
    [providerName: string]: ProviderConfig;
  };
}

/**
 * Configuration for a single provider
 */
export interface ProviderConfig {
  /**
   * Whether this provider is enabled
   * @default true
   */
  enabled: boolean;

  /**
   * API key (usually from environment variable)
   */
  apiKey?: string;

  /**
   * Base URL for API requests (for custom providers)
   */
  baseURL?: string;

  /**
   * Model definitions by category
   */
  models: {
    [category: string]: ModelConfig[];
  };

  /**
   * Provider-specific metadata
   */
  metadata?: {
    /**
     * Priority for fallback order (1 = highest)
     */
    priority?: number;

    /**
     * Request timeout in milliseconds
     * @default 60000
     */
    timeout?: number;

    /**
     * Maximum retry attempts
     * @default 3
     */
    maxRetries?: number;

    /**
     * Custom provider settings
     */
    [key: string]: any;
  };
}
