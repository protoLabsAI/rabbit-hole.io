import { BaseChatModel } from "@langchain/core/language_models/chat_models";

import { ProviderConfig } from "../../types/config";
import { ModelCategory, ModelConfig } from "../../types/model";
import {
  LLMProvider,
  ProviderType,
  ModelOptions,
  ModelInfo,
  HealthStatus,
  ProviderModel,
} from "../../types/provider";

/**
 * Abstract base class for LLM providers
 */
export abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly name: string;
  abstract readonly type: ProviderType;

  constructor(protected config: ProviderConfig) {
    if (!config.enabled) {
      throw new Error(`Provider is disabled`);
    }
  }

  abstract getModel(category: ModelCategory, options?: ModelOptions): any;

  getModelByName(name: string, options?: ModelOptions): BaseChatModel {
    for (const [category, models] of Object.entries(this.config.models)) {
      const model = models.find((m) => m.name === name);
      if (model) {
        return this.getModel(category as ModelCategory, {
          ...model,
          ...options,
        });
      }
    }

    throw new Error(`Model "${name}" not found in provider "${this.name}"`);
  }

  async listModels(): Promise<ModelInfo[]> {
    const models: ModelInfo[] = [];

    for (const [category, configs] of Object.entries(this.config.models)) {
      for (const config of configs) {
        models.push({
          name: config.name,
          category: category as ModelCategory,
          provider: this.name,
          config,
        });
      }
    }

    return models;
  }

  abstract isAvailable(): Promise<boolean>;

  /**
   * List available models from provider API
   * Override in subclass to fetch from actual API
   */
  async listAvailableModels(): Promise<ProviderModel[]> {
    // Default implementation returns config models
    const configModels = await this.listModels();
    return configModels.map((m) => ({
      id: m.name,
      name: m.name,
      description: `${m.category} model`,
    }));
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now();
    const available = await this.isAvailable();
    const latency = Date.now() - start;

    return {
      available,
      latency,
      lastChecked: new Date(),
    };
  }

  protected getModelConfig(category: ModelCategory): ModelConfig {
    const models = this.config.models[category];
    if (!models || models.length === 0) {
      throw new Error(
        `No models configured for category "${category}" in provider "${this.name}"`
      );
    }

    return models[0];
  }

  protected getApiKey(envVarName: string): string {
    const key =
      this.config.apiKey ||
      process.env[envVarName] ||
      process.env[`${envVarName}_API_KEY`];

    if (!key) {
      throw new Error(
        `API key not found for provider "${this.name}". ` +
          `Set ${envVarName} environment variable or provide in config.`
      );
    }

    return key;
  }
}
