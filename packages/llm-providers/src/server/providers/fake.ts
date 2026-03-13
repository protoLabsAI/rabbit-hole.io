import { FakeListChatModel } from "@langchain/core/utils/testing";

import { ModelCategory } from "../../types/model";
import { ModelOptions, ProviderType } from "../../types/provider";

import { BaseLLMProvider } from "./base";

/**
 * Fake LLM provider for testing
 *
 * Returns predefined responses without making API calls.
 * Perfect for unit tests, UI/UX testing, and pipeline testing.
 */
export class FakeProvider extends BaseLLMProvider {
  readonly name = "fake";
  readonly type = "local" as ProviderType;

  getModel(category: ModelCategory, options?: ModelOptions): FakeListChatModel {
    const modelConfig = this.getModelConfig(category);

    // Get predefined responses from config
    const responses = modelConfig.metadata?.responses || [
      "This is a fake response for testing purposes.",
    ];

    // Get sleep duration (simulate API latency)
    const sleep = options?.metadata?.sleep ?? modelConfig.metadata?.sleep ?? 0;

    return new FakeListChatModel({
      responses,
      sleep,
    });
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
