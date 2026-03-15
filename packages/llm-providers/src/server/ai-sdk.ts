/**
 * AI SDK Provider Adapter
 *
 * Creates AI SDK model instances from the same config that powers getModel().
 * Uses @ai-sdk/anthropic directly (not LangChain) for optimal streaming.
 *
 * Usage:
 *   import { getAIModel } from "@proto/llm-providers/server";
 *   const model = getAIModel("smart");
 *   const result = await streamText({ model, ... });
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

import type { ModelCategory } from "../generated/config-types";

import { loadConfig } from "./config";

// Cached provider instance
let cachedProvider: ReturnType<typeof createAnthropic> | null = null;

function getOrCreateProvider() {
  if (cachedProvider) return cachedProvider;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is required for AI SDK. Set it in your environment."
    );
  }

  cachedProvider = createAnthropic({ apiKey });
  return cachedProvider;
}

// Model alias map — matches ava's model-resolver pattern
const MODEL_ALIASES: Record<string, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-6",
};

/**
 * Get an AI SDK LanguageModel by category.
 * Reads model name from llm-providers config, resolves aliases.
 */
export function getAIModel(
  category: ModelCategory = "smart",
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): LanguageModel {
  const provider = getOrCreateProvider();

  // Try to read from config
  let modelName: string;
  try {
    const config = loadConfig();
    const anthropicConfig = config.providers?.anthropic;
    if (anthropicConfig?.models?.[category]?.[0]) {
      modelName = anthropicConfig.models[category][0].name;
    } else {
      // Fallback defaults
      modelName =
        category === "fast"
          ? "claude-haiku-4-5-20251001"
          : category === "reasoning"
            ? "claude-opus-4-6"
            : "claude-sonnet-4-6";
    }
  } catch {
    // Config not available, use defaults
    modelName =
      category === "fast"
        ? "claude-haiku-4-5-20251001"
        : category === "reasoning"
          ? "claude-opus-4-6"
          : "claude-sonnet-4-6";
  }

  // Resolve aliases
  const resolvedName = MODEL_ALIASES[modelName] || modelName;

  return provider(resolvedName);
}

/**
 * Get an AI SDK LanguageModel by explicit model name or alias.
 */
export function getAIModelByName(nameOrAlias: string): LanguageModel {
  const provider = getOrCreateProvider();
  const resolved = MODEL_ALIASES[nameOrAlias] || nameOrAlias;
  return provider(resolved);
}

/**
 * Reset the cached provider (for testing or credential rotation).
 */
export function resetAIProvider() {
  cachedProvider = null;
}
