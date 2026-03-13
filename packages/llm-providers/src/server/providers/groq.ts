import { ChatGroq } from "@langchain/groq";

import { ModelCategory } from "../../types/model";
import {
  ModelOptions,
  ProviderType,
  ProviderModel,
} from "../../types/provider";

import { BaseLLMProvider } from "./base";

interface GroqModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  context_window?: number;
}

interface GroqModelsResponse {
  object: string;
  data: GroqModel[];
}

export class GroqProvider extends BaseLLMProvider {
  readonly name = "groq";
  readonly type = "cloud" as ProviderType;

  getModel(category: ModelCategory, options?: ModelOptions): ChatGroq {
    const modelConfig = this.getModelConfig(category);
    const apiKey = this.getApiKey("GROQ_API_KEY");

    return new ChatGroq({
      apiKey,
      model: modelConfig.name,
      temperature: options?.temperature ?? modelConfig.temperature,
      maxTokens: options?.maxTokens ?? modelConfig.maxTokens,
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      this.getApiKey("GROQ_API_KEY");
      return true;
    } catch {
      return false;
    }
  }

  async listAvailableModels(): Promise<ProviderModel[]> {
    try {
      const apiKey = this.getApiKey("GROQ_API_KEY");
      const response = await fetch("https://api.groq.com/openai/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.warn("Failed to fetch Groq models, using config");
        return super.listAvailableModels();
      }

      const data = (await response.json()) as GroqModelsResponse;
      return data.data.map((model) => ({
        id: model.id,
        name: model.id,
        description: model.owned_by || "Groq",
        contextWindow: model.context_window,
      }));
    } catch (error) {
      console.warn("Error fetching Groq models:", error);
      return super.listAvailableModels();
    }
  }
}
