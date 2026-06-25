/**
 * AI SDK Provider Adapter
 *
 * Creates AI SDK model instances from the same config that powers getModel().
 * Uses @ai-sdk/anthropic directly (not LangChain) for optimal streaming.
 *
 * Usage:
 *   import { getAIModel } from "@protolabsai/llm-providers/server";
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

const DEFAULT_MODELS: Record<string, string> = {
  fast: "claude-haiku-4-5-20251001",
  reasoning: "claude-opus-4-6",
  smart: "claude-sonnet-4-6",
};

/** Resolve a category to a concrete, alias-resolved model name. */
function resolveModelName(category: ModelCategory = "smart"): string {
  let modelName: string = DEFAULT_MODELS[category] ?? DEFAULT_MODELS.smart;
  try {
    const fromConfig =
      loadConfig().providers?.anthropic?.models?.[category]?.[0]?.name;
    if (fromConfig) modelName = fromConfig;
  } catch {
    // Config not available — keep the default.
  }
  return MODEL_ALIASES[modelName] || modelName;
}

/**
 * Get an AI SDK LanguageModel by category, using the server's env-configured
 * (cached) provider.
 */
export function getAIModel(category: ModelCategory = "smart"): LanguageModel {
  return getOrCreateProvider()(resolveModelName(category));
}

/** A per-request bring-your-own-key override, read from request headers. */
export interface RequestKeyOverride {
  apiKey: string;
  baseURL?: string;
  model?: string;
}

/**
 * Extract a per-request LLM key (BYOK) from request headers, or null.
 * Accepts `x-llm-api-key` (web) or `Authorization: Bearer <key>` (OpenAI-compat).
 * Optional `x-llm-base-url` / `x-llm-model` override the endpoint and model.
 */
export function readRequestKey(headers: Headers): RequestKeyOverride | null {
  const direct = headers.get("x-llm-api-key")?.trim();
  const auth = headers.get("authorization") ?? "";
  const bearer = /^bearer\s+/i.test(auth)
    ? auth.replace(/^bearer\s+/i, "").trim()
    : "";
  const apiKey = direct || bearer;
  if (!apiKey) return null;
  return {
    apiKey,
    baseURL: headers.get("x-llm-base-url")?.trim() || undefined,
    model: headers.get("x-llm-model")?.trim() || undefined,
  };
}

/**
 * Like {@link getAIModel}, but honors a per-request BYOK key when the request
 * carries one. With no key it falls back to the env-configured provider, so
 * existing server-key self-hosts are unaffected. Request-scoped providers are
 * never cached.
 */
export function getAIModelForRequest(
  headers: Headers,
  category: ModelCategory = "smart"
): LanguageModel {
  const override = readRequestKey(headers);
  if (!override) return getAIModel(category);

  const provider = createAnthropic({
    apiKey: override.apiKey,
    ...(override.baseURL ? { baseURL: override.baseURL } : {}),
  });
  const modelName = override.model
    ? MODEL_ALIASES[override.model] || override.model
    : resolveModelName(category);
  return provider(modelName);
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
