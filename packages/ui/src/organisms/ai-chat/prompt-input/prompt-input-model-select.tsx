"use client";

import * as React from "react";

import { Badge } from "../../../atoms/badge";
import { Icon } from "../../../atoms/icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../atoms/select";
import { cn } from "../../../lib/utils";

import { useModelData } from "./use-model-data";

interface PromptInputModelSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  provider?: string;
  category?: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const PromptInputModelSelect = React.forwardRef<
  HTMLButtonElement,
  PromptInputModelSelectProps
>(
  (
    { value, onValueChange, provider, category, disabled, className, children },
    ref
  ) => {
    const { models, loading, defaultModel } = useModelData({
      provider,
      category,
    });

    // Use provided value, or default from API
    const currentValue = value || defaultModel;

    // If no children provided, use default structure
    if (!children) {
      return (
        <Select
          value={currentValue}
          onValueChange={onValueChange}
          disabled={disabled || loading}
        >
          <PromptInputModelSelectTrigger ref={ref} className={className} />
          <PromptInputModelSelectContent>
            {models.map((model) => (
              <PromptInputModelSelectItem key={model.id} value={model.id}>
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="truncate">{model.name}</span>
                  {model.metadata.isFree && (
                    <Badge variant="secondary" className="text-xs">
                      Free
                    </Badge>
                  )}
                </div>
              </PromptInputModelSelectItem>
            ))}
          </PromptInputModelSelectContent>
        </Select>
      );
    }

    // Custom children - pass through Select wrapper
    return (
      <Select
        value={currentValue}
        onValueChange={onValueChange}
        disabled={disabled || loading}
      >
        {children}
      </Select>
    );
  }
);
PromptInputModelSelect.displayName = "PromptInputModelSelect";

const PromptInputModelSelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof SelectTrigger>
>(({ className, ...props }, ref) => {
  return (
    <SelectTrigger
      ref={ref}
      className={cn("w-[200px] h-9", className)}
      {...props}
    >
      <Icon name="sparkles" size={14} className="mr-2 text-primary" />
      <SelectValue placeholder="Select model" />
    </SelectTrigger>
  );
});
PromptInputModelSelectTrigger.displayName = "PromptInputModelSelectTrigger";

const PromptInputModelSelectContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SelectContent>
>(({ className, children, ...props }, ref) => {
  return (
    <SelectContent ref={ref} className={className} {...props}>
      {children}
    </SelectContent>
  );
});
PromptInputModelSelectContent.displayName = "PromptInputModelSelectContent";

const PromptInputModelSelectItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SelectItem>
>(({ className, ...props }, ref) => {
  return <SelectItem ref={ref} className={className} {...props} />;
});
PromptInputModelSelectItem.displayName = "PromptInputModelSelectItem";

const PromptInputModelSelectValue = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof SelectValue>
>(({ className, ...props }, ref) => {
  return <SelectValue ref={ref} className={className} {...props} />;
});
PromptInputModelSelectValue.displayName = "PromptInputModelSelectValue";

export {
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectValue,
};
