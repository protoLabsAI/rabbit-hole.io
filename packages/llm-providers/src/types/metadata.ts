/**
 * Provider and Category Display Metadata
 *
 * Centralized labels and descriptions for UI rendering
 */

/**
 * Provider display names for UI
 */
export const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  groq: "Groq",
  ollama: "Ollama (Local)",
  bedrock: "AWS Bedrock",
  "custom-openai": "Custom OpenAI",
} as const;

/**
 * Category display labels for UI
 */
export const CATEGORY_LABELS: Record<string, string> = {
  fast: "Fast",
  smart: "Smart",
  reasoning: "Reasoning",
  vision: "Vision",
  long: "Long Context",
  coding: "Coding",
} as const;

/**
 * Category descriptions for tooltips/help text
 */
export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  fast: "Quick responses, optimized for speed",
  smart: "Balanced quality and speed for general tasks",
  reasoning: "Complex reasoning and deep analysis",
  vision: "Multimodal models with image input support",
  long: "Extended context windows for large documents",
  coding: "Specialized for code generation and analysis",
} as const;

/**
 * Provider descriptions
 */
export const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  openai: "OpenAI GPT models - Industry leading language models",
  anthropic: "Anthropic Claude models - Advanced reasoning and safety",
  google: "Google Gemini models - Fast and efficient",
  groq: "Groq - Ultra-fast inference with open models",
  ollama: "Ollama - Self-hosted local models",
  bedrock: "AWS Bedrock - Managed cloud AI services",
  "custom-openai": "Custom OpenAI-compatible endpoint",
} as const;
