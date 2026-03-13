import { useRef, useEffect } from "react";

import { Icon } from "@proto/icon-system";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ScrollArea,
} from "@proto/ui/atoms";

import type { ChatInterfaceProps } from "../../types";

import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";

export function ChatInterface({
  messages,
  input,
  onInputChange,
  onSendMessage,
  onClearChat,
  isLoading,
  disabled,
}: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Conversation</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearChat}
            disabled={messages.length === 0}
          >
            <Icon name="Trash2" className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 gap-4">
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Icon
                  name="Info"
                  className="h-12 w-12 mx-auto mb-4 opacity-50"
                />
                <p>Send a message to start testing</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <ChatMessage key={idx} message={msg} />
              ))
            )}
          </div>
        </ScrollArea>
        <ChatInput
          value={input}
          onChange={onInputChange}
          onSend={onSendMessage}
          disabled={disabled}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}
