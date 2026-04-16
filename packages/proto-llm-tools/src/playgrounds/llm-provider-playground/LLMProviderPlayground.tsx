/**
 * LLM Provider Playground - Refactored Orchestrator
 *
 * Interactive testing environment for @protolabsai/llm-providers
 */

"use client";

import { useState, useEffect } from "react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@protolabsai/ui/atoms";

import { ApiKeyManager } from "./components/ApiKeyManager";
import { ChatInterface } from "./components/ChatInterface";
import { MetricsDashboard } from "./components/MetricsDashboard";
import { ModelBrowser } from "./components/ModelBrowser";
import { ModeToggle } from "./components/ModeToggle";
import { ProviderSettings } from "./components/ProviderSettings";
import {
  useLLMMetrics,
  useProviderConfig,
  useApiKeyManager,
  useLLMModels,
  useLLMValidation,
  useLLMChat,
} from "./hooks";
import { getExpectedModel } from "./utils/model-helpers";

export function LLMProviderPlayground() {
  const [activeTab, setActiveTab] = useState<string>("provider");
  const [configMappings, setConfigMappings] = useState<
    Record<string, Record<string, string | null>>
  >({});

  // Initialize hooks
  const metrics = useLLMMetrics();
  const providerConfig = useProviderConfig();
  const apiKeyManager = useApiKeyManager(
    providerConfig.config.apiMode || "hosted"
  );
  const chat = useLLMChat({
    config: providerConfig.config,
    apiKeys: apiKeyManager.apiKeys,
    apiMode: providerConfig.config.apiMode || "hosted",
    onMetricsUpdate: metrics.recordMetrics,
  });
  const models = useLLMModels({
    provider: providerConfig.config.provider,
    configMappings,
    apiKeys: apiKeyManager.apiKeys,
    apiMode: providerConfig.config.apiMode || "hosted",
  });
  const validation = useLLMValidation({
    provider: providerConfig.config.provider,
    category: providerConfig.config.category,
    currentModel: chat.currentModel,
    apiKeys: apiKeyManager.apiKeys,
    apiMode: providerConfig.config.apiMode || "hosted",
  });

  // Fetch config model mappings on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/llm-playground/config");
        if (response.ok) {
          const data = await response.json();
          setConfigMappings(data.modelMappings || {});
        }
      } catch (error) {
        console.error("Failed to fetch LLM config:", error);
      }
    };
    fetchConfig();
  }, []);

  // Auto-fetch models when Models tab is opened
  useEffect(() => {
    if (
      activeTab === "models" &&
      models.availableModels.length === 0 &&
      apiKeyManager.providerStatus[providerConfig.config.provider]
    ) {
      models.fetchModels();
    }
  }, [
    activeTab,
    models.availableModels.length,
    apiKeyManager.providerStatus,
    providerConfig.config.provider,
  ]);

  const currentModelId = getExpectedModel(
    configMappings,
    models.modelOverrides,
    providerConfig.config.provider,
    providerConfig.config.category
  );

  const handleClearChat = () => {
    chat.clearChat();
    metrics.resetMetrics();
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">LLM Provider Playground</h1>
        <p className="text-muted-foreground mt-2">
          Test and compare different LLM providers with real-time metrics
        </p>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
        {/* Chat Area - 2 columns */}
        <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">
          {/* Metrics Bar */}
          <MetricsDashboard
            totalTokens={metrics.totalTokens}
            avgResponseTime={metrics.avgResponseTime}
            messageCount={metrics.messageCount}
          />

          {/* Chat Messages */}
          <ChatInterface
            messages={chat.messages}
            input={chat.input}
            onInputChange={chat.setInput}
            onSendMessage={chat.sendMessage}
            onClearChat={handleClearChat}
            isLoading={chat.isLoading}
            disabled={
              !apiKeyManager.providerStatus[providerConfig.config.provider]
            }
          />
        </div>

        {/* Settings Panel - 1 column */}
        <div className="flex flex-col gap-6 min-h-0">
          <ModeToggle
            mode={providerConfig.config.apiMode || "hosted"}
            onModeChange={(mode) =>
              providerConfig.setParameter("apiMode", mode)
            }
            providerStatus={apiKeyManager.providerStatus}
            currentProvider={providerConfig.config.provider}
          />

          <Tabs
            defaultValue="provider"
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="provider">Provider</TabsTrigger>
              <TabsTrigger value="models">Models</TabsTrigger>
              <TabsTrigger value="keys">API Keys</TabsTrigger>
            </TabsList>

            <TabsContent
              value="provider"
              className="flex-1 space-y-4 overflow-auto"
            >
              <ProviderSettings
                config={providerConfig.config}
                onConfigChange={(partial) => {
                  Object.entries(partial).forEach(([key, value]) => {
                    providerConfig.setParameter(
                      key as keyof import("./types").PlaygroundConfig,
                      value
                    );
                  });
                }}
                currentModel={currentModelId}
                onValidate={validation.validateModels}
                validationResults={validation.validationResults}
                showResetButton={Boolean(
                  models.modelOverrides[providerConfig.config.provider]?.[
                    providerConfig.config.category
                  ]
                )}
                onReset={models.clearCategoryOverride}
              />
            </TabsContent>

            <TabsContent
              value="models"
              className="flex-1 space-y-4 overflow-auto"
            >
              <ModelBrowser
                provider={providerConfig.config.provider}
                category={providerConfig.config.category}
                models={models.availableModels}
                loading={models.loadingModels}
                onRefresh={models.fetchModels}
                onModelSelect={(modelId) =>
                  models.assignModelToCategory(
                    modelId,
                    providerConfig.config.category
                  )
                }
                getModelCategories={models.getModelCategories}
                currentModelId={currentModelId}
                hasApiKey={
                  apiKeyManager.providerStatus[providerConfig.config.provider]
                }
              />
            </TabsContent>

            <TabsContent
              value="keys"
              className="flex-1 space-y-4 overflow-auto"
            >
              <ApiKeyManager
                apiMode={providerConfig.config.apiMode || "hosted"}
                apiKeys={apiKeyManager.apiKeys}
                tempKey={apiKeyManager.tempKey}
                onTempKeyChange={apiKeyManager.setTempKey}
                showKeys={apiKeyManager.showKeys}
                onShowKeysChange={apiKeyManager.setShowKeys}
                onSaveKey={(provider) => {
                  const typedProvider = provider as
                    | "openai"
                    | "anthropic"
                    | "google"
                    | "groq"
                    | "ollama";
                  apiKeyManager.saveKey(typedProvider, apiKeyManager.tempKey);
                  apiKeyManager.setTempKey("");
                }}
                onClearKey={(provider) => {
                  const typedProvider = provider as
                    | "openai"
                    | "anthropic"
                    | "google"
                    | "groq"
                    | "ollama";
                  apiKeyManager.clearKey(typedProvider);
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
