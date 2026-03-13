/**
 * useLLMChat Hook
 *
 * Manages chat state and API communication
 */

import { useState, useCallback } from "react";

import type { Message, PlaygroundConfig, APIKeys, APIMode } from "../types";
import { calculateTokensPerSecond } from "../utils/metrics-calculator";

export interface UseLLMChatOptions {
  config: PlaygroundConfig;
  apiKeys?: APIKeys;
  apiMode: APIMode;
  onMetricsUpdate: (tokensUsed: number, responseTime: number) => void;
}

export interface UseLLMChatReturn {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  sendMessage: () => Promise<void>;
  clearChat: () => void;
  currentModel: string;
}

export function useLLMChat({
  config,
  apiKeys,
  apiMode,
  onMetricsUpdate,
}: UseLLMChatOptions): UseLLMChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>(() => {
    // Generate persistent session ID for this chat
    return `playground-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  });

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const startTime = Date.now();

    try {
      // Strip metadata/timestamp from messages for API (Zod strictObject validation)
      const apiMessages = [...messages, userMessage].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch("/api/llm-playground/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({
          messages: apiMessages,
          config,
          apiKeys: apiMode === "byok" ? apiKeys : undefined,
          useHosted: apiMode === "hosted",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorDetails = data.details
          ? JSON.stringify(data.details, null, 2)
          : data.error;
        throw new Error(`API error (${response.status}): ${errorDetails}`);
      }
      const responseTime = Date.now() - startTime;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.content,
        timestamp: Date.now(),
        metadata: {
          tokensUsed: data.tokensUsed,
          responseTime,
          tokensPerSecond: calculateTokensPerSecond(
            data.tokensUsed,
            responseTime
          ),
          model: data.model,
          provider: config.provider,
          traceUrl: data.traceUrl,
          sessionUrl: data.sessionUrl,
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setCurrentModel(data.model);

      // Update metrics
      onMetricsUpdate(data.tokensUsed || 0, responseTime);
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: Date.now(),
        metadata: {
          responseTime: Date.now() - startTime,
        },
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [
    input,
    messages,
    config,
    apiKeys,
    apiMode,
    isLoading,
    onMetricsUpdate,
    sessionId,
  ]);

  const clearChat = useCallback(() => {
    setMessages([]);
    // Generate new session ID for fresh conversation
    setSessionId(
      `playground-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
  }, []);

  return {
    messages,
    input,
    setInput,
    isLoading,
    sendMessage,
    clearChat,
    currentModel,
  };
}
