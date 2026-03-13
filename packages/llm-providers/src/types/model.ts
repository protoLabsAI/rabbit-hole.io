/**
 * Model categories based on use case
 *
 * @deprecated Import from generated/config-types instead for auto-generated types
 * This re-export is kept for backwards compatibility
 */
export type { ModelCategory } from "../generated/config-types";

/**
 * Model configuration in the config file
 */
export interface ModelConfig {
  /**
   * Model identifier (e.g., "gpt-4o")
   */
  name: string;

  /**
   * Sampling temperature (0-1)
   * @default 0.7
   */
  temperature?: number;

  /**
   * Maximum tokens to generate
   * @default 2000
   */
  maxTokens?: number;

  /**
   * Top-p sampling parameter
   */
  topP?: number;

  /**
   * Frequency penalty (-2.0 to 2.0)
   */
  frequencyPenalty?: number;

  /**
   * Presence penalty (-2.0 to 2.0)
   */
  presencePenalty?: number;

  /**
   * Custom metadata for the model
   */
  metadata?: Record<string, any>;
}
