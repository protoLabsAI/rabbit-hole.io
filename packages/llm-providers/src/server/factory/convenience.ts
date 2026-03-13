import { BaseChatModel } from "@langchain/core/language_models/chat_models";

import type {
  ProviderName,
  ModelCategory,
  ModelName,
} from "../../generated/config-types";
import { LLMProvider, ModelOptions } from "../../types/provider";

import { LLMProviderFactory } from "./provider-factory";

/**
 * Get provider by name
 */
export function getProvider(name: ProviderName): LLMProvider {
  return LLMProviderFactory.getInstance().getProvider(name);
}

/**
 * Get model by category
 */
export function getModel(
  category: ModelCategory,
  provider?: ProviderName,
  options?: ModelOptions
): BaseChatModel {
  return LLMProviderFactory.getInstance().getModel(category, provider, options);
}

/**
 * Get model by name
 */
export function getModelByName(
  modelName: ModelName | string,
  provider?: ProviderName | string,
  options?: ModelOptions
): BaseChatModel {
  return LLMProviderFactory.getInstance().getModelByName(
    modelName,
    provider,
    options
  );
}

/**
 * List all available providers
 */
export function listProviders(): ProviderName[] {
  return LLMProviderFactory.getInstance().listProviders() as ProviderName[];
}
