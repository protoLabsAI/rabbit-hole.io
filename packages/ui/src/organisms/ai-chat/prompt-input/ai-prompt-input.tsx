/**
 * AI Prompt Input Component
 *
 * Advanced input component with model selection, submit button, and toolbar
 * Supports keyboard shortcuts and disabled states during streaming
 */

"use client";

import * as React from "react";

import { Button } from "../../../atoms/button";
import { Icon } from "../../../atoms/icon";
import { Textarea } from "../../../atoms/textarea";
import { cn } from "../../../lib/utils";

interface PromptInputContextValue {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isDisabled: boolean;
  isLoading: boolean;
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
}

const PromptInputContext = React.createContext<
  PromptInputContextValue | undefined
>(undefined);

function usePromptInput() {
  const context = React.useContext(PromptInputContext);
  if (!context) {
    throw new Error("PromptInput components must be used within a PromptInput");
  }
  return context;
}

interface PromptInputProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
}

const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  (
    {
      className,
      children,
      value,
      onChange,
      onSubmit,
      isLoading = false,
      disabled = false,
      selectedModel,
      onModelChange,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <PromptInputContext.Provider
        value={{
          value,
          onChange,
          onSubmit,
          isDisabled,
          isLoading,
          selectedModel,
          onModelChange,
        }}
      >
        <div
          ref={ref}
          className={cn("border-t border-border bg-background p-4", className)}
          {...props}
        >
          {children}
        </div>
      </PromptInputContext.Provider>
    );
  }
);
PromptInput.displayName = "PromptInput";

interface PromptInputTextareaProps
  extends Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "onChange"
  > {
  maxRows?: number;
  minRows?: number;
}

const PromptInputTextarea = React.forwardRef<
  HTMLTextAreaElement,
  PromptInputTextareaProps
>(({ className, maxRows = 5, minRows = 1, onKeyDown, ...props }, ref) => {
  const { value, onChange, onSubmit, isDisabled } = usePromptInput();
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
    const maxHeight = lineHeight * maxRows;
    const minHeight = lineHeight * minRows;

    textarea.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
  }, [value, maxRows, minRows]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isDisabled) {
        onSubmit();
      }
    }
    onKeyDown?.(e);
  };

  return (
    <Textarea
      ref={(node) => {
        textareaRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      disabled={isDisabled}
      className={cn(
        "resize-none min-h-[44px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none",
        className
      )}
      {...props}
    />
  );
});
PromptInputTextarea.displayName = "PromptInputTextarea";

const PromptInputSubmit = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { onSubmit, isDisabled, isLoading, value } = usePromptInput();

  return (
    <Button
      ref={ref}
      size="icon"
      disabled={isDisabled || !value.trim()}
      onClick={onSubmit}
      className={cn("h-9 w-9 shrink-0", className)}
      {...props}
    >
      {isLoading ? (
        <Icon name="loader-2" size={16} className="animate-spin" />
      ) : (
        children || <Icon name="send" size={16} />
      )}
    </Button>
  );
});
PromptInputSubmit.displayName = "PromptInputSubmit";

const PromptInputToolbar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex items-center justify-between gap-2 mt-2", className)}
      {...props}
    >
      {children}
    </div>
  );
});
PromptInputToolbar.displayName = "PromptInputToolbar";

const PromptInputActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex items-center gap-2 flex-1", className)}
      {...props}
    >
      {children}
    </div>
  );
});
PromptInputActions.displayName = "PromptInputActions";

export {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputToolbar,
  PromptInputActions,
};
