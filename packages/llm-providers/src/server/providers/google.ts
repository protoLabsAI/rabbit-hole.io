import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { ModelCategory } from "../../types/model";
import {
  ModelOptions,
  ProviderType,
  ProviderModel,
} from "../../types/provider";

import { BaseLLMProvider } from "./base";

interface GoogleModelInfo {
  name: string;
  version: string;
  displayName: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportedGenerationMethods: string[];
  temperature?: number;
  topP?: number;
  topK?: number;
}

interface GoogleModelsResponse {
  models: GoogleModelInfo[];
}

export class GoogleProvider extends BaseLLMProvider {
  readonly name = "google";
  readonly type = "cloud" as ProviderType;

  getModel(
    category: ModelCategory,
    options?: ModelOptions
  ): ChatGoogleGenerativeAI {
    const modelConfig = this.getModelConfig(category);
    const apiKey = this.getApiKey("GOOGLE_API_KEY");

    return new ChatGoogleGenerativeAI({
      apiKey,
      model: modelConfig.name,
      temperature: options?.temperature ?? modelConfig.temperature,
      maxOutputTokens: options?.maxTokens ?? modelConfig.maxTokens,
      topP: options?.topP ?? modelConfig.topP,
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      this.getApiKey("GOOGLE_API_KEY");
      return true;
    } catch {
      return false;
    }
  }

  async listAvailableModels(): Promise<ProviderModel[]> {
    try {
      const apiKey = this.getApiKey("GOOGLE_API_KEY");

      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models",
          {
            method: "GET",
            headers: {
              "x-goog-api-key": apiKey,
            },
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn("Failed to fetch Google models, using fallback");
          return this.getFallbackModels();
        }

        const data = (await response.json()) as GoogleModelsResponse;

        // Filter to only Gemini models that support generateContent
        return data.models
          .filter(
            (m) =>
              m.name.includes("gemini") &&
              m.supportedGenerationMethods.includes("generateContent")
          )
          .sort((a, b) => b.version.localeCompare(a.version)) // Newest version first
          .map((model) => ({
            id: model.name.replace("models/", ""),
            name: model.displayName,
            description: model.description,
            contextWindow: model.inputTokenLimit,
            capabilities:
              model.name.includes("vision") || model.name.includes("pro")
                ? ["vision", "code"]
                : ["code"],
          }));
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.warn("Error during Google models fetch:", fetchError);
        return this.getFallbackModels();
      }
    } catch (error) {
      console.warn("Error fetching Google models:", error);
      return this.getFallbackModels();
    }
  }

  private getFallbackModels(): ProviderModel[] {
    return [
      {
        id: "gemini-2.0-flash-exp",
        name: "Gemini 2.0 Flash (Experimental)",
        description: "Latest experimental flash model",
        contextWindow: 1000000,
        capabilities: ["vision", "code", "multimodal"],
      },
      {
        id: "gemini-1.5-pro",
        name: "Gemini 1.5 Pro",
        description: "Most capable model for complex tasks",
        contextWindow: 2000000,
        capabilities: ["vision", "code", "reasoning"],
      },
      {
        id: "gemini-1.5-flash",
        name: "Gemini 1.5 Flash",
        description: "Fast and efficient model",
        contextWindow: 1000000,
        capabilities: ["vision", "code"],
      },
      {
        id: "gemini-pro",
        name: "Gemini Pro",
        description: "Balanced performance",
        contextWindow: 32000,
        capabilities: ["code"],
      },
    ];
  }
}
