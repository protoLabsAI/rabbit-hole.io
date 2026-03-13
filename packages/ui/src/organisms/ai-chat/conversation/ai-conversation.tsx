/**
 * AI Conversation Component
 *
 * Scrollable conversation container with auto-scroll management and manual controls
 * Built for AI chat interfaces with streaming message support
 */

"use client";

import * as React from "react";

import { Button } from "../../../atoms/button";
import { Icon } from "../../../atoms/icon";
import { ScrollArea } from "../../../atoms/scroll-area";
import { cn } from "../../../lib/utils";

interface ConversationContextValue {
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  isAtBottom: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

const ConversationContext = React.createContext<
  ConversationContextValue | undefined
>(undefined);

function useConversation() {
  const context = React.useContext(ConversationContext);
  if (!context) {
    throw new Error(
      "Conversation components must be used within a Conversation"
    );
  }
  return context;
}

interface ConversationProps extends React.HTMLAttributes<HTMLDivElement> {
  autoScrollThreshold?: number;
  ref?: React.Ref<HTMLDivElement>;
}

function Conversation({
  className,
  children,
  autoScrollThreshold = 50,
  ref,
  ...props
}: ConversationProps) {
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  const [userScrolled, setUserScrolled] = React.useState(false);

  const scrollToBottom = React.useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const scrollContainer = scrollAreaRef.current?.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior,
        });
        setIsAtBottom(true);
        setUserScrolled(false);
      }
    },
    []
  );

  const checkIfAtBottom = React.useCallback(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (scrollContainer) {
      const threshold = autoScrollThreshold;
      const isBottom =
        scrollContainer.scrollHeight -
          scrollContainer.scrollTop -
          scrollContainer.clientHeight <
        threshold;
      setIsAtBottom(isBottom);
      return isBottom;
    }
    return false;
  }, [autoScrollThreshold]);

  // Auto-scroll to bottom when new content is added
  React.useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (!scrollContainer) return;

    const observer = new MutationObserver(() => {
      if (!userScrolled || isAtBottom) {
        scrollToBottom("auto");
      }
    });

    if (contentRef.current) {
      observer.observe(contentRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => observer.disconnect();
  }, [userScrolled, isAtBottom, scrollToBottom]);

  // Track user scroll
  React.useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (!scrollContainer) return;

    const handleScroll = () => {
      const wasAtBottom = checkIfAtBottom();
      if (!wasAtBottom) {
        setUserScrolled(true);
      } else {
        setUserScrolled(false);
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [checkIfAtBottom]);

  return (
    <ConversationContext.Provider
      value={{
        scrollAreaRef,
        contentRef,
        isAtBottom,
        scrollToBottom,
      }}
    >
      <div
        ref={ref}
        className={cn("relative flex flex-col h-full", className)}
        {...props}
      >
        {children}
      </div>
    </ConversationContext.Provider>
  );
}
Conversation.displayName = "Conversation";

interface ConversationContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
}

function ConversationContent({
  className,
  children,
  ...props
}: ConversationContentProps) {
  const { scrollAreaRef, contentRef } = useConversation();

  return (
    <ScrollArea ref={scrollAreaRef} className={cn("flex-1", className)}>
      <div ref={contentRef} className="space-y-4 p-4" {...props}>
        {children}
      </div>
    </ScrollArea>
  );
}
ConversationContent.displayName = "ConversationContent";

interface ConversationScrollButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  showThreshold?: number;
  ref?: React.Ref<HTMLButtonElement>;
}

function ConversationScrollButton({
  className,
  showThreshold = 100,
  ...props
}: ConversationScrollButtonProps) {
  const { isAtBottom, scrollToBottom, scrollAreaRef } = useConversation();
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (!scrollContainer) return;

    const handleScroll = () => {
      const distanceFromBottom =
        scrollContainer.scrollHeight -
        scrollContainer.scrollTop -
        scrollContainer.clientHeight;
      setShow(distanceFromBottom > showThreshold);
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [scrollAreaRef, showThreshold]);

  if (!show || isAtBottom) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      <Button
        variant="secondary"
        size="sm"
        className={cn(
          "rounded-full shadow-lg hover:shadow-xl transition-all",
          className
        )}
        onClick={() => scrollToBottom("smooth")}
        {...props}
      >
        <Icon name="chevron-down" size={16} className="mr-1" />
        Scroll to bottom
      </Button>
    </div>
  );
}
ConversationScrollButton.displayName = "ConversationScrollButton";

export { Conversation, ConversationContent, ConversationScrollButton };
