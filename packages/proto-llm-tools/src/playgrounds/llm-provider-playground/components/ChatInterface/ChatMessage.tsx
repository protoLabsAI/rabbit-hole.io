import type { Message } from "../../types";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          message.role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        {message.metadata && (
          <div className="mt-2 pt-2 border-t border-border/50 text-xs space-y-1">
            {message.metadata.tokensUsed && (
              <div>Tokens: {message.metadata.tokensUsed}</div>
            )}
            {message.metadata.responseTime && (
              <div>Time: {message.metadata.responseTime}ms</div>
            )}
            {message.metadata.tokensPerSecond && (
              <div>
                Speed: {message.metadata.tokensPerSecond.toFixed(1)} tok/s
              </div>
            )}
            {message.metadata.model && (
              <div className="font-mono">{message.metadata.model}</div>
            )}
            {(message.metadata.traceUrl || message.metadata.sessionUrl) && (
              <div className="flex gap-2">
                {message.metadata.traceUrl && (
                  <a
                    href={message.metadata.traceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 underline"
                  >
                    Trace →
                  </a>
                )}
                {message.metadata.sessionUrl && (
                  <a
                    href={message.metadata.sessionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-500 hover:text-purple-600 underline"
                  >
                    Session →
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
