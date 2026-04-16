/**
 * Testing utilities for @protolabsai/llm-providers
 *
 * Import from "@protolabsai/llm-providers/testing" in test files
 */

export {
  createTestConfig,
  setupFakeProvider,
  resetProviders,
  testScenarios,
} from "./helpers";

export { getModel, getModelByName } from "../server/factory/convenience";

export { FakeProvider } from "../server/providers/fake";

export type { LLMProvidersConfig, ProviderConfig } from "../types/config";
export type { ModelConfig } from "../types/model";
