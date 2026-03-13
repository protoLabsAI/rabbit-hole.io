/**
 * AI Message Component
 *
 * Individual message display with avatars, content formatting, and role-based styling
 * Supports user, assistant, and system message types
 */

"use client";

import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "../../../atoms/avatar";
import { Icon } from "../../../atoms/icon";
import { cn } from "../../../lib/utils";

type MessageRole = "user" | "assistant" | "system";

interface MessageContextValue {
  role: MessageRole;
}

const MessageContext = React.createContext<MessageContextValue | undefined>(
  undefined
);

function useMessage() {
  const context = React.useContext(MessageContext);
  if (!context) {
    throw new Error("Message components must be used within a Message");
  }
  return context;
}

interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  role: MessageRole;
}

const Message = React.forwardRef<HTMLDivElement, MessageProps>(
  ({ className, role, children, ...props }, ref) => {
    return (
      <MessageContext.Provider value={{ role }}>
        <div
          ref={ref}
          className={cn(
            "flex gap-3 group",
            role === "user" && "flex-row-reverse",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </MessageContext.Provider>
    );
  }
);
Message.displayName = "Message";

interface MessageAvatarProps {
  src?: string;
  name?: string;
  fallback?: React.ReactNode;
}

const MessageAvatar = React.forwardRef<HTMLDivElement, MessageAvatarProps>(
  ({ src, name, fallback }, ref) => {
    const { role } = useMessage();

    const defaultFallback = React.useMemo(() => {
      if (fallback) return fallback;
      if (role === "assistant") return <Icon name="bot" size={16} />;
      if (role === "user") return <Icon name="user" size={16} />;
      return null;
    }, [role, fallback]);

    return (
      <Avatar
        ref={ref}
        className={cn(
          "h-8 w-8 shrink-0",
          role === "assistant" && "bg-primary text-primary-foreground",
          role === "user" && "bg-muted"
        )}
      >
        {src && <AvatarImage src={src} alt={name} />}
        <AvatarFallback>{defaultFallback}</AvatarFallback>
      </Avatar>
    );
  }
);
MessageAvatar.displayName = "MessageAvatar";

const MessageContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { role } = useMessage();

  return (
    <div
      ref={ref}
      className={cn(
        "flex-1 space-y-2 overflow-hidden",
        role === "user" && "text-right",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
MessageContent.displayName = "MessageContent";

interface MessageBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  markdown?: boolean;
}

const MessageBubble = React.forwardRef<HTMLDivElement, MessageBubbleProps>(
  ({ className, children, markdown = false, ...props }, ref) => {
    const { role } = useMessage();

    return (
      <div
        ref={ref}
        className={cn(
          "inline-block rounded-lg px-4 py-2 text-sm",
          role === "user" &&
            "bg-primary text-primary-foreground ml-auto max-w-[80%]",
          role === "assistant" &&
            "bg-muted text-foreground mr-auto max-w-[80%]",
          role === "system" && "bg-accent text-accent-foreground max-w-full",
          markdown && "whitespace-normal",
          !markdown && "whitespace-pre-wrap",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
MessageBubble.displayName = "MessageBubble";

const MessageHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { role } = useMessage();

  return (
    <div
      ref={ref}
      className={cn(
        "text-xs text-muted-foreground mb-1",
        role === "user" && "text-right",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
MessageHeader.displayName = "MessageHeader";

const MessageTimestamp = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { timestamp: Date }
>(({ className, timestamp, ...props }, ref) => {
  const formattedTime = React.useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(timestamp);
  }, [timestamp]);

  return (
    <span
      ref={ref}
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    >
      {formattedTime}
    </span>
  );
});
MessageTimestamp.displayName = "MessageTimestamp";

export {
  Message,
  MessageAvatar,
  MessageContent,
  MessageBubble,
  MessageHeader,
  MessageTimestamp,
};
