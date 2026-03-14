"use client";

import { CopilotChat } from "@copilotkit/react-ui";
import { useState } from "react";

import { Button, Card, CardContent, CardHeader } from "@proto/ui/atoms";

/**
 * CopilotKit Chat Interface for Rabbit Hole
 * Provides AI assistance for research and graph exploration
 */
interface CopilotChatInterfaceProps {
  className?: string;
  placeholder?: string;
}

export function CopilotChatInterface({
  className = "",
  placeholder = "Ask me to research entities or analyze the knowledge graph...",
}: CopilotChatInterfaceProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`copilot-chat-container ${className}`}>
      {/* Chat toggle button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-50"
        title="Open AI Research Assistant"
      >
        <span className="text-xl">🤖</span>
      </Button>

      {/* Chat interface */}
      {isOpen && (
        <Card className="fixed bottom-20 right-4 w-96 h-96 shadow-xl z-40">
          <CardHeader className="flex flex-row items-center justify-between p-3 border-b">
            <h3 className="text-lg font-semibold">AI Research Assistant</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-auto p-1"
            >
              ✕
            </Button>
          </CardHeader>

          <CardContent className="h-80 p-0">
            <CopilotChat
              labels={{
                title: "Rabbit Hole AI Assistant",
                initial:
                  "Hello! I can help you research entities and analyze the knowledge graph. Try asking me to research a person, organization, or movement.",
                placeholder: placeholder,
              }}
              className="h-full"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CopilotChatInterface;
