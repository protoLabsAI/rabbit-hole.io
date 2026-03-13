import { BedrockChat } from "@langchain/community/chat_models/bedrock";

import { ModelCategory } from "../../types/model";
import { ModelOptions, ProviderType } from "../../types/provider";

import { BaseLLMProvider } from "./base";

export class BedrockProvider extends BaseLLMProvider {
  readonly name = "bedrock";
  readonly type = "cloud" as ProviderType;

  getModel(category: ModelCategory, options?: ModelOptions): BedrockChat {
    const modelConfig = this.getModelConfig(category);

    const region =
      this.config.metadata?.region ||
      process.env.BEDROCK_AWS_REGION ||
      "us-east-1";

    return new BedrockChat({
      model: modelConfig.name,
      region,
      credentials: {
        accessKeyId: process.env.BEDROCK_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY!,
      },
      temperature: options?.temperature ?? modelConfig.temperature,
      maxTokens: options?.maxTokens ?? modelConfig.maxTokens,
    });
  }

  async isAvailable(): Promise<boolean> {
    return !!(
      process.env.BEDROCK_AWS_ACCESS_KEY_ID &&
      process.env.BEDROCK_AWS_SECRET_ACCESS_KEY
    );
  }
}
