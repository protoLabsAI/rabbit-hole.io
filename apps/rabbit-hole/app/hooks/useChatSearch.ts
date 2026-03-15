"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useMemo } from "react";

const transport = new DefaultChatTransport({
  api: "/api/chat",
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
