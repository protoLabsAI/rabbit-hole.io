import { ChatOllama } from "@langchain/ollama";

import { ModelCategory } from "../../types/model";
import {
  ModelOptions,
  ProviderModel,
  ProviderType,
} from "../../types/provider";

import { BaseLLMProvider } from "./base";

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    parameter_size?: string;
    quantization_level?: string;
  };
}

interface OllamaModelsResponse {
  models: OllamaModel[];
}

export class OllamaProvider extends BaseLLMProvider {
  readonly name = "ollama";
  readonly type = "local" as ProviderType;

  getModel(category: ModelCategory, options?: ModelOptions): ChatOllama {
    const modelConfig = this.getModelConfig(category);
    const baseUrl =
      this.config.baseURL ||
      process.env.OLLAMA_BASE_URL ||
      "http://localhost:11434";

    return new ChatOllama({
      baseUrl,
      model: modelConfig.name,
      temperature: options?.temperature ?? modelConfig.temperature,
      numPredict: options?.maxTokens ?? modelConfig.maxTokens,
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      const baseUrl =
        this.config.baseURL ||
        process.env.OLLAMA_BASE_URL ||
        "http://localhost:11434";

      const response = await fetch(`${baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  async listAvailableModels(): Promise<ProviderModel[]> {
    try {
      const baseUrl =
        this.config.baseURL ||
        process.env.OLLAMA_BASE_URL ||
        "http://localhost:11434";

      const response = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        console.warn("Failed to fetch Ollama models, using config");
        return super.listAvailableModels();
      }

      const data = (await response.json()) as OllamaModelsResponse;
      return data.models
        .sort(
          (a, b) =>
            new Date(b.modified_at).getTime() -
            new Date(a.modified_at).getTime()
        ) // Most recently modified first
        .map((model) => ({
          id: model.name,
          name: model.name,
          description: `Size: ${(model.size / 1e9).toFixed(2)}GB, Modified: ${new Date(model.modified_at).toISOString().split("T")[0]}`,
          contextWindow: model.details?.parameter_size
            ? parseInt(model.details.parameter_size) * 1000
            : undefined,
        }));
    } catch (error) {
      console.warn("Error fetching Ollama models:", error);
      return super.listAvailableModels();
    }
  }
}
