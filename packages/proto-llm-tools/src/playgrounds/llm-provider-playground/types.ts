/**
 * LLM Provider Playground - Type Definitions
 *
 * Re-exports shared types and defines UI-specific types
 */

import { APIKeys, APIMode, PlaygroundConfig } from "@protolabsai/types";

// Shared types from monorepo packages
export type {
  Message,
  MessageMetadata,
  APIMode,
  APIKeys,
  LLMValidationResult as ValidationResult,
  LLMMetrics,
  PlaygroundConfig,
  ModelCategory,
} from "@protolabsai/types";

// Type-only imports prevent bundling server-only code in client components
export type {
  ModelConfig,
  ProviderModel,
  ModelOptions,
} from "@protolabsai/llm-providers";

// UI-specific component props
export interface MetricsDashboardProps {
  totalTokens: number;
  avgResponseTime: number;
  messageCount: number;
}

export interface ChatInterfaceProps {
  messages: import("@protolabsai/types").Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onClearChat: () => void;
  isLoading: boolean;
  disabled: boolean;
}

export interface ProviderSettingsProps {
  config: import("@protolabsai/types").PlaygroundConfig;
  onConfigChange: (
    config: Partial<import("@protolabsai/types").PlaygroundConfig>
  ) => void;
  currentModel: string;
  onValidate?: () => void;
  validationResults?: import("@protolabsai/types").LLMValidationResult[];
  showResetButton?: boolean;
  onReset?: (category: string) => void;
}

export interface ModelBrowserProps {
  provider: string;
  category: string;
  models: import("@protolabsai/llm-providers").ProviderModel[];
  loading: boolean;
  onRefresh: () => void;
  onModelSelect: (modelId: string) => void;
  getModelCategories: (modelId: string) => string[];
  currentModelId: string;
  hasApiKey: boolean;
}

export interface ApiKeyManagerProps {
  apiMode: import("@protolabsai/types").APIMode;
  apiKeys: import("@protolabsai/types").APIKeys;
  tempKey: string;
  onTempKeyChange: (key: string) => void;
  showKeys: boolean;
  onShowKeysChange: (show: boolean) => void;
  onSaveKey: (provider: keyof import("@protolabsai/types").APIKeys) => void;
  onClearKey: (provider: keyof import("@protolabsai/types").APIKeys) => void;
}

export interface ModeToggleProps {
  mode: import("@protolabsai/types").APIMode;
  onModeChange: (mode: import("@protolabsai/types").APIMode) => void;
  providerStatus: Record<string, boolean>;
  currentProvider: string;
}
