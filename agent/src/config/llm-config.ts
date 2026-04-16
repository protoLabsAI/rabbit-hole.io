import { getModel } from "@protolabsai/llm-providers/server";

/**
 * Centralized LLM configuration for agents
 *
 * Uses category-based model selection for flexibility:
 * - fast: Quick responses for simple tasks
 * - smart: Balanced quality/speed for main agent logic
 * - reasoning: Complex reasoning for advanced analysis
 * - coding: Code generation and analysis
 */

type ModelOptions = { temperature?: number; maxTokens?: number };

export const agentLLMConfig = {
  /**
   * Research agents use smart models for balanced quality/speed
   */
  research: (opts?: ModelOptions) =>
    getModel("smart", "anthropic", { temperature: 0.1, ...opts }),

  /**
   * Chat interactions use fast models for quick responses
   */
  chat: (opts?: ModelOptions) => getModel("smart", "anthropic", { ...opts }),

  /**
   * Complex reasoning tasks
   */
  reasoning: (opts?: ModelOptions) =>
    getModel("reasoning", "anthropic", { ...opts }),

  /**
   * Code generation/analysis
   */
  coding: (opts?: ModelOptions) =>
    getModel("coding", "openai", { temperature: 0.3, ...opts }),

  /**
   * Multimodal tasks requiring vision
   */
  vision: (opts?: ModelOptions) => getModel("vision", "openai", { ...opts }),
};

/**
 * Get model with custom options
 */
export function getAgentModel(
  task: keyof typeof agentLLMConfig,
  options?: ModelOptions
) {
  const modelFn = agentLLMConfig[task];
  if (!modelFn) {
    throw new Error(`Unknown task: ${task}`);
  }
  return modelFn(options);
}
