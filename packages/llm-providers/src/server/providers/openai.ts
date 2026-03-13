import { ChatOpenAI } from "@langchain/openai";

import { ModelCategory } from "../../types/model";
import {
  ModelOptions,
  ProviderType,
  ProviderModel,
} from "../../types/provider";

import { BaseLLMProvider } from "./base";

interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface OpenAIModelsResponse {
  object: string;
  data: OpenAIModel[];
}

export class OpenAIProvider extends BaseLLMProvider {
  readonly name = "openai";
  readonly type = "cloud" as ProviderType;

  getModel(category: ModelCategory, options?: ModelOptions): ChatOpenAI {
    const modelConfig = this.getModelConfig(category);
    const apiKey = this.getApiKey("OPENAI_API_KEY");

    return new ChatOpenAI({
      apiKey,
      model: modelConfig.name,
      temperature: options?.temperature ?? modelConfig.temperature,
      maxTokens: options?.maxTokens ?? modelConfig.maxTokens,
      topP: options?.topP ?? modelConfig.topP,
      frequencyPenalty:
        options?.frequencyPenalty ?? modelConfig.frequencyPenalty,
      presencePenalty: options?.presencePenalty ?? modelConfig.presencePenalty,
      timeout: this.config.metadata?.timeout,
      maxRetries: this.config.metadata?.maxRetries,
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      this.getApiKey("OPENAI_API_KEY");
      return true;
    } catch {
      return false;
    }
  }

  async listAvailableModels(): Promise<ProviderModel[]> {
    try {
      const apiKey = this.getApiKey("OPENAI_API_KEY");
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.warn("Failed to fetch OpenAI models, using config");
        return super.listAvailableModels();
      }

      const data = (await response.json()) as OpenAIModelsResponse;
      return data.data
        .filter((m) => m.id.includes("gpt") || m.id.includes("o1"))
        .sort((a, b) => b.created - a.created) // Newest first
        .map((model) => ({
          id: model.id,
          name: model.id,
          description: `Created: ${new Date(model.created * 1000).toISOString().split("T")[0]}`,
          capabilities: model.id.includes("vision") ? ["vision"] : [],
        }));
    } catch (error) {
      console.warn("Error fetching OpenAI models:", error);
      return super.listAvailableModels();
    }
  }
}
