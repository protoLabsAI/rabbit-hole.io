import { ChatOpenAI } from "@langchain/openai";

import { ModelCategory } from "../../types/model";
import { ModelOptions, ProviderType } from "../../types/provider";

import { BaseLLMProvider } from "./base";

/**
 * Custom OpenAI-compatible provider
 * Supports any API that implements OpenAI's chat completion format
 */
export class CustomOpenAIProvider extends BaseLLMProvider {
  readonly name: string;
  readonly type = "custom" as ProviderType;

  constructor(name: string, config: any) {
    super(config);
    this.name = name;

    if (!config.baseURL) {
      throw new Error(
        `Custom OpenAI provider "${name}" requires baseURL in config`
      );
    }
  }

  getModel(category: ModelCategory, options?: ModelOptions): ChatOpenAI {
    const modelConfig = this.getModelConfig(category);
    const apiKey =
      this.config.apiKey || process.env.CUSTOM_OPENAI_API_KEY || "dummy";

    return new ChatOpenAI({
      apiKey,
      configuration: {
        baseURL: this.config.baseURL,
      },
      model: modelConfig.name,
      temperature: options?.temperature ?? modelConfig.temperature,
      maxTokens: options?.maxTokens ?? modelConfig.maxTokens,
    });
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.baseURL) {
      return false;
    }

    try {
      const response = await fetch(`${this.config.baseURL}/health`, {
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      return response?.ok ?? false;
    } catch {
      return false;
    }
  }
}
