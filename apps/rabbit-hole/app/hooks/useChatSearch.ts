"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useMemo } from "react";

import { readByokKey } from "./useByokKey";

const transport = new DefaultChatTransport({
  api: "/api/chat",
  // BYOK: attach the visitor's own key (from localStorage) per request, read
  // fresh each time so it picks up changes without a reload.
  prepareSendMessagesRequest: ({ headers, body }) => {
    const key = readByokKey();
    return {
      body: body ?? {},
      headers: {
        ...(headers as Record<string, string> | undefined),
        ...(key ? { "x-llm-api-key": key } : {}),
      },
    };
  },
});

export function useChatSearch() {
  const {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
    error,
    regenerate,
  } = useChat({ transport });

  const isStreaming = status === "streaming" || status === "submitted";
  const isIdle = messages.length === 0 && status === "ready";

  const search = useCallback(
    (query: string) => {
      sendMessage({ role: "user", parts: [{ type: "text", text: query }] });
    },
    [sendMessage]
  );

  const reset = useCallback(() => {
    stop();
    setMessages([]);
  }, [stop, setMessages]);

  // Extract the last assistant message for convenience
  const lastAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i];
    }
    return null;
  }, [messages]);

  return {
    messages,
    isStreaming,
    isIdle,
    status,
    error,
    search,
    reset,
    stop,
    setMessages,
    lastAssistantMessage,
    regenerate,
  };
}
