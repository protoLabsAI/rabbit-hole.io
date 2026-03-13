/**
 * LLM Provider Playground - Constants
 */

export const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google (Gemini)",
  groq: "Groq",
  ollama: "Ollama (Local)",
  fake: "Fake (Testing)",
};

export const CATEGORY_LABELS: Record<string, string> = {
  fast: "Fast (Quick responses)",
  smart: "Smart (Balanced)",
  reasoning: "Reasoning (Complex)",
  vision: "Vision (Multimodal)",
  coding: "Coding (Code gen)",
};
