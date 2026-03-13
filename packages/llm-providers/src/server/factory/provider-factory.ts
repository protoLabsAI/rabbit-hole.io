import { BaseChatModel } from "@langchain/core/language_models/chat_models";

import type {
  ProviderName,
  ModelCategory,
  ModelName,
} from "../../generated/config-types";
import { LLMProvidersConfig } from "../../types/config";
import { LLMProvider, ModelOptions } from "../../types/provider";
import { loadConfig } from "../config";
import {
  OpenAIProvider,
  AnthropicProvider,
  GoogleProvider,
  GroqProvider,
  OllamaProvider,
  BedrockProvider,
  CustomOpenAIProvider,
  FakeProvider,
} from "../providers";

/**
 * Factory for creating and managing LLM providers
 */
export class LLMProviderFactory {
  private static instance: LLMProviderFactory;
  private config: LLMProvidersConfig;
  private providers: Map<string, LLMProvider> = new Map();

  private constructor(customConfig?: Partial<LLMProvidersConfig>) {
    this.config = loadConfig(customConfig);
  }

  /**
   * Get singleton instance
   */
  static getInstance(
    customConfig?: Partial<LLMProvidersConfig>
  ): LLMProviderFactory {
    if (!this.instance) {
      this.instance = new LLMProviderFactory(customConfig);
    }
    return this.instance;
  }

  /**
   * Reset singleton (useful for testing)
   */
  static reset(): void {
    this.instance = null as any;
  }

  /**
   * Get provider by name
   */
  getProvider(name: ProviderName | string): LLMProvider {
    if (this.providers.has(name)) {
      return this.providers.get(name)!;
    }

    const provider = this.createProvider(name);
    this.providers.set(name, provider);
    return provider;
  }

  /**
   * Get model by category from default or specified provider
   */
  getModel(
    category: ModelCategory,
    provider?: ProviderName | string,
    options?: ModelOptions
  ): BaseChatModel {
    const providerName = provider || this.config.defaultProvider || "openai";
    const providerInstance = this.getProvider(providerName);
    return providerInstance.getModel(category, options);
  }

  /**
   * Get model by specific name
   */
  getModelByName(
    modelName: ModelName | string,
    provider?: ProviderName | string,
    options?: ModelOptions
  ): BaseChatModel {
    const providerName = provider || this.config.defaultProvider || "openai";
    const providerInstance = this.getProvider(providerName);
    return providerInstance.getModelByName(modelName, options);
  }

  /**
   * List all available providers
   */
  listProviders(): ProviderName[] {
    return Object.keys(this.config.providers).filter(
      (name) => this.config.providers[name].enabled
    ) as ProviderName[];
  }

  /**
   * Get configuration
   */
  getConfig(): LLMProvidersConfig {
    return { ...this.config };
  }

  /**
   * Create provider instance
   */
  private createProvider(name: string): LLMProvider {
    const config = this.config.providers[name];

    if (!config) {
      throw new Error(`Provider "${name}" not found in configuration`);
    }

    if (!config.enabled) {
      throw new Error(`Provider "${name}" is disabled`);
    }

    switch (name) {
      case "openai":
        return new OpenAIProvider(config);

      case "anthropic":
        return new AnthropicProvider(config);

      case "google":
        return new GoogleProvider(config);

      case "groq":
        return new GroqProvider(config);

      case "ollama":
        return new OllamaProvider(config);

      case "bedrock":
        return new BedrockProvider(config);

      case "fake":
        return new FakeProvider(config);

      default:
        if (config.baseURL) {
          return new CustomOpenAIProvider(name, config);
        }
        throw new Error(`Unknown provider: ${name}`);
    }
  }
}
