/**
 * LLM Playground - API Types
 *
 * Shared types for LLM provider API configuration
 */

export type APIMode = "hosted" | "byok";

export interface APIKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
  groq?: string;
  ollama?: string;
}
