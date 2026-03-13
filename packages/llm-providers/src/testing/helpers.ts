import { LLMProviderFactory } from "../server/factory/provider-factory";
import { LLMProvidersConfig } from "../types/config";

/**
 * Create test configuration with fake provider
 */
export function createTestConfig(options?: {
  responses?: string[];
  sleep?: number;
  category?: string;
}): Partial<LLMProvidersConfig> {
  return {
    defaultProvider: "fake" as any,
    defaultCategory: (options?.category as any) || "smart",
    providers: {
      fake: {
        enabled: true,
        models: {
          [options?.category || "smart"]: [
            {
              name: "test-model",
              metadata: {
                responses: options?.responses || ["Test response"],
                sleep: options?.sleep ?? 0,
              },
            },
          ],
        },
      },
    },
  };
}

/**
 * Setup fake provider for testing
 */
export function setupFakeProvider(options?: {
  responses?: string[];
  sleep?: number;
}): void {
  LLMProviderFactory.reset();
  LLMProviderFactory.getInstance(createTestConfig(options));
}

/**
 * Reset to default configuration
 */
export function resetProviders(): void {
  LLMProviderFactory.reset();
}

/**
 * Create fake provider for specific scenarios
 */
export const testScenarios = {
  fast: () =>
    createTestConfig({
      responses: ["Fast response"],
      sleep: 0,
    }),

  realistic: () =>
    createTestConfig({
      responses: ["Realistic response"],
      sleep: 500,
    }),

  slow: () =>
    createTestConfig({
      responses: ["Slow response"],
      sleep: 3000,
    }),

  conversation: () =>
    createTestConfig({
      responses: [
        "Hello! How can I help you today?",
        "I'd be happy to research that for you.",
        "Here's what I found...",
        "Is there anything else you'd like to know?",
      ],
      sleep: 300,
    }),

  research: () =>
    createTestConfig({
      responses: [
        JSON.stringify({
          entity: {
            name: "Test Entity",
            type: "Organization",
            uid: "org:test_entity",
          },
          relationships: [],
          evidence: [],
        }),
      ],
      sleep: 800,
    }),

  error: () =>
    createTestConfig({
      responses: [
        "❌ Research failed: Entity not found",
        "❌ API error occurred",
      ],
      sleep: 200,
    }),
};
