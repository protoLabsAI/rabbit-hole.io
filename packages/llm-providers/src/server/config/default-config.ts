import { LLMProvidersConfig } from "../../types/config";

export const defaultConfig: LLMProvidersConfig = {
  defaultProvider: "anthropic",
  defaultCategory: "fast",

  providers: {
    openai: {
      enabled: true,
      models: {
        fast: [
          {
            name: "gpt-5-nano",
            temperature: 1,
            maxTokens: 8192,
          },
        ],
        smart: [
          {
            name: "gpt-4o",
            temperature: 1,
            maxTokens: 8192,
          },
        ],
        reasoning: [
          {
            name: "o3-deep-research",
            temperature: 0.5,
            maxTokens: 8192,
          },
        ],
        vision: [
          {
            name: "gpt-5-pro",
            temperature: 0.5,
            maxTokens: 8192,
          },
        ],
        coding: [
          {
            name: "codex-mini-latest",
            temperature: 0.3,
            maxTokens: 8192,
          },
        ],
      },
      metadata: {
        priority: 1,
        timeout: 60000,
        maxRetries: 3,
      },
    },

    anthropic: {
      enabled: true,
      models: {
        fast: [
          {
            name: "claude-3-5-haiku-latest",
            temperature: 0.7,
            maxTokens: 8192,
          },
        ],
        smart: [
          {
            name: "claude-haiku-4-5",
            temperature: 0.5,
            maxTokens: 8192,
          },
        ],
        reasoning: [
          {
            name: "claude-sonnet-4-5",
            temperature: 0.3,
            maxTokens: 8192,
          },
        ],
        vision: [
          {
            name: "claude-3-7-sonnet-latest",
            temperature: 0.5,
            maxTokens: 8192,
          },
        ],
        long: [
          {
            name: "claude-sonnet-4-5",
            temperature: 0.5,
            maxTokens: 8192,
          },
        ],
      },
      metadata: {
        priority: 2,
        timeout: 60000,
        maxRetries: 3,
      },
    },

    google: {
      enabled: true,
      models: {
        fast: [
          {
            name: "gemini-2.5-flash-lite",
            temperature: 0.7,
            maxTokens: 8192,
          },
          {
            name: "gemini-2.5-flash",
            temperature: 0.7,
            maxTokens: 8192,
          },
        ],
        smart: [
          {
            name: "gemini-2.5-pro",
            temperature: 0.5,
            maxTokens: 8192,
          },
        ],
        reasoning: [
          {
            name: "gemini-2.5-pro",
            temperature: 0.3,
            maxTokens: 8192,
          },
        ],
        vision: [
          {
            name: "gemini-2.5-pro",
            temperature: 0.5,
            maxTokens: 8192,
          },
        ],
        coding: [
          {
            name: "gemini-2.5-pro",
            temperature: 0.3,
            maxTokens: 8192,
          },
        ],
        long: [
          {
            name: "gemini-2.5-pro",
            temperature: 0.5,
            maxTokens: 8192,
          },
        ],
      },
      metadata: {
        priority: 3,
        timeout: 60000,
        maxRetries: 3,
      },
    },

    groq: {
      enabled: true,
      models: {
        fast: [
          {
            name: "llama-3.1-8b-instant",
            temperature: 0.7,
            maxTokens: 8192,
          },
          {
            name: "openai/gpt-oss-20b",
            temperature: 0.7,
            maxTokens: 8192,
          },
        ],
        smart: [
          {
            name: "llama-3.3-70b-versatile",
            temperature: 0.5,
            maxTokens: 8192,
          },
          {
            name: "openai/gpt-oss-120b",
            temperature: 0.7,
            maxTokens: 8192,
          },
        ],
        coding: [
          {
            name: "qwen/qwen3-32b",
            temperature: 0.3,
            maxTokens: 8192,
          },
        ],
        reasoning: [
          {
            name: "moonshotai/kimi-k2-instruct-0905",
            temperature: 0.5,
            maxTokens: 16_384,
          },
        ],
      },
      metadata: {
        priority: 4,
        timeout: 30000,
        maxRetries: 2,
      },
    },

    ollama: {
      enabled: true,
      baseURL: "http://localhost:11434",
      models: {
        fast: [
          {
            name: "llama-3.1-8b-instant",
            temperature: 0.7,
            maxTokens: 8192,
          },
          {
            name: "openai/gpt-oss-20b",
            temperature: 0.7,
            maxTokens: 8192,
          },
        ],
        smart: [
          {
            name: "llama-3.3-70b-versatile",
            temperature: 0.5,
            maxTokens: 8192,
          },
          {
            name: "openai/gpt-oss-120b",
            temperature: 0.7,
            maxTokens: 8192,
          },
        ],
        coding: [
          {
            name: "qwen/qwen3-32b",
            temperature: 0.3,
            maxTokens: 8192,
          },
        ],
      },
      metadata: {
        priority: 5,
        timeout: 120000,
      },
    },

    bedrock: {
      enabled: false,
      models: {
        smart: [
          {
            name: "anthropic.claude-3-5-sonnet-20240620-v1:0",
            temperature: 0.5,
            maxTokens: 2000,
          },
        ],
        reasoning: [
          {
            name: "anthropic.claude-3-opus-20240229-v1:0",
            temperature: 0.3,
            maxTokens: 4000,
          },
        ],
      },
      metadata: {
        priority: 6,
        region: "us-east-1",
      },
    },

    "custom-openai": {
      enabled: false,
      baseURL: "",
      models: {
        smart: [
          {
            name: "custom-model-v1",
            temperature: 0.5,
            maxTokens: 2000,
          },
        ],
      },
      metadata: {
        priority: 10,
      },
    },
  },
};
