import { ChatAnthropic } from "@langchain/anthropic";

import { ModelCategory } from "../../types/model";
import {
  ModelOptions,
  ProviderModel,
  ProviderType,
} from "../../types/provider";

import { BaseLLMProvider } from "./base";

interface AnthropicModelInfo {
  id: string;
  display_name: string;
  created_at: string;
  type: "model";
}

interface AnthropicModelsResponse {
  data: AnthropicModelInfo[];
  first_id: string | null;
  has_more: boolean;
  last_id: string | null;
}

export class AnthropicProvider extends BaseLLMProvider {
  readonly name = "anthropic";
  readonly type = "cloud" as ProviderType;

  getModel(category: ModelCategory, options?: ModelOptions): ChatAnthropic {
    const modelConfig = this.getModelConfig(category);
    const apiKey = this.getApiKey("ANTHROPIC_API_KEY");

    return new ChatAnthropic({
      apiKey,
      model: modelConfig.name,
      temperature: options?.temperature ?? modelConfig.temperature,
      maxTokens: options?.maxTokens ?? modelConfig.maxTokens,
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      this.getApiKey("ANTHROPIC_API_KEY");
      return true;
    } catch {
      return false;
    }
  }

  async listAvailableModels(): Promise<ProviderModel[]> {
    try {
      const apiKey = this.getApiKey("ANTHROPIC_API_KEY");
      const response = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      });

      if (!response.ok) {
        console.warn("Failed to fetch Anthropic models, using fallback");
        return this.getFallbackModels();
      }

      const data = (await response.json()) as AnthropicModelsResponse;
      return data.data
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ) // Newest first
        .map((model) => ({
          id: model.id,
          name: model.display_name,
          description: `Created: ${new Date(model.created_at).toISOString().split("T")[0]}`,
          contextWindow: 200000, // Anthropic models typically have 200k context
          capabilities: model.id.includes("opus")
            ? ["vision", "reasoning"]
            : ["vision"],
        }));
    } catch (error) {
      console.warn("Error fetching Anthropic models:", error);
      return this.getFallbackModels();
    }
  }

  private getFallbackModels(): ProviderModel[] {
    return [
      {
        id: "claude-3-5-sonnet-20240620",
        name: "Claude 3.5 Sonnet",
        description: "Most intelligent model, balanced performance",
        contextWindow: 200000,
        capabilities: ["vision", "code", "analysis"],
      },
      {
        id: "claude-3-opus-20240229",
        name: "Claude 3 Opus",
        description: "Powerful model for complex tasks",
        contextWindow: 200000,
        capabilities: ["vision", "reasoning", "analysis"],
      },
      {
        id: "claude-3-sonnet-20240229",
        name: "Claude 3 Sonnet",
        description: "Balanced intelligence and speed",
        contextWindow: 200000,
        capabilities: ["vision", "code"],
      },
      {
        id: "claude-3-haiku-20240307",
        name: "Claude 3 Haiku",
        description: "Fast and compact model",
        contextWindow: 200000,
        capabilities: ["vision"],
      },
    ];
  }
}
