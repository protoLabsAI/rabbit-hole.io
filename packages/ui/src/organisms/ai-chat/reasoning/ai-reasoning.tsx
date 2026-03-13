/**
 * AI Reasoning Component
 *
 * Collapsible reasoning display showing AI thought processes
 * Auto-expands during streaming, manual toggle after completion
 */

"use client";

import * as React from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../atoms/collapsible";
import { Icon } from "../../../atoms/icon";
import { cn } from "../../../lib/utils";

interface ReasoningProps extends React.HTMLAttributes<HTMLDivElement> {
  isStreaming?: boolean;
  defaultOpen?: boolean;
}

const Reasoning = React.forwardRef<HTMLDivElement, ReasoningProps>(
  (
    { className, isStreaming = false, defaultOpen, children, ...props },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen ?? isStreaming);

    // Auto-expand when streaming starts
    React.useEffect(() => {
      if (isStreaming) {
        setIsOpen(true);
      }
    }, [isStreaming]);

    return (
      <Collapsible
        ref={ref}
        open={isOpen}
        onOpenChange={setIsOpen}
        className={cn(
          "border border-border rounded-lg overflow-hidden",
          className
        )}
        {...props}
      >
        {children}
      </Collapsible>
    );
  }
);
Reasoning.displayName = "Reasoning";

interface ReasoningTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

const ReasoningTrigger = React.forwardRef<
  HTMLButtonElement,
  ReasoningTriggerProps
>(({ className, label = "Reasoning", ...props }, ref) => {
  return (
    <CollapsibleTrigger
      ref={ref}
      className={cn(
        "flex items-center justify-between w-full px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors group",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <Icon name="sparkles" size={16} className="text-primary" />
        <span>{label}</span>
      </div>
      <Icon
        name="chevron-down"
        size={16}
        className="transition-transform duration-200 group-data-[state=open]:rotate-180"
      />
    </CollapsibleTrigger>
  );
});
ReasoningTrigger.displayName = "ReasoningTrigger";

const ReasoningContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <CollapsibleContent
      ref={ref}
      className={cn("border-t border-border", className)}
    >
      <div
        className="px-4 py-3 text-sm text-muted-foreground space-y-2"
        {...props}
      >
        {children}
      </div>
    </CollapsibleContent>
  );
});
ReasoningContent.displayName = "ReasoningContent";

interface ReasoningStepProps extends React.HTMLAttributes<HTMLDivElement> {
  step?: number;
}

const ReasoningStep = React.forwardRef<HTMLDivElement, ReasoningStepProps>(
  ({ className, step, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("flex gap-2", className)} {...props}>
        {step !== undefined && (
          <div className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            {step}
          </div>
        )}
        <div className="flex-1">{children}</div>
      </div>
    );
  }
);
ReasoningStep.displayName = "ReasoningStep";

export { Reasoning, ReasoningTrigger, ReasoningContent, ReasoningStep };
