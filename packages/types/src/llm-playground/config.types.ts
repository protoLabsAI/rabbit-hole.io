/**
 * LLM Playground - Configuration Types
 *
 * Shared types for playground configuration
 */

import type { APIMode } from "./api.types";

export type ModelCategory =
  | "fast"
  | "smart"
  | "reasoning"
  | "vision"
  | "long"
  | "coding";

export interface PlaygroundConfig {
  provider: "openai" | "anthropic" | "google" | "groq" | "ollama" | "fake";
  category: ModelCategory;
  apiMode?: APIMode;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}
