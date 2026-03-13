/**
 * LLM Provider Playground - Type Definitions
 *
 * Re-exports shared types and defines UI-specific types
 */

import { APIKeys, APIMode, PlaygroundConfig } from "@proto/types";

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
} from "@proto/types";

// Type-only imports prevent bundling server-only code in client components
export type {
  ModelConfig,
  ProviderModel,
  ModelOptions,
} from "@proto/llm-providers";

// UI-specific component props
export interface MetricsDashboardProps {
  totalTokens: number;
  avgResponseTime: number;
  messageCount: number;
}

export interface ChatInterfaceProps {
  messages: import("@proto/types").Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onClearChat: () => void;
  isLoading: boolean;
  disabled: boolean;
}

export interface ProviderSettingsProps {
  config: import("@proto/types").PlaygroundConfig;
  onConfigChange: (
    config: Partial<import("@proto/types").PlaygroundConfig>
  ) => void;
  currentModel: string;
  onValidate?: () => void;
  validationResults?: import("@proto/types").LLMValidationResult[];
  showResetButton?: boolean;
  onReset?: (category: string) => void;
}

export interface ModelBrowserProps {
  provider: string;
  category: string;
  models: import("@proto/llm-providers").ProviderModel[];
  loading: boolean;
  onRefresh: () => void;
  onModelSelect: (modelId: string) => void;
  getModelCategories: (modelId: string) => string[];
  currentModelId: string;
  hasApiKey: boolean;
}

export interface ApiKeyManagerProps {
  apiMode: import("@proto/types").APIMode;
  apiKeys: import("@proto/types").APIKeys;
  tempKey: string;
  onTempKeyChange: (key: string) => void;
  showKeys: boolean;
  onShowKeysChange: (show: boolean) => void;
  onSaveKey: (provider: keyof import("@proto/types").APIKeys) => void;
  onClearKey: (provider: keyof import("@proto/types").APIKeys) => void;
}

export interface ModeToggleProps {
  mode: import("@proto/types").APIMode;
  onModeChange: (mode: import("@proto/types").APIMode) => void;
  providerStatus: Record<string, boolean>;
  currentProvider: string;
}
