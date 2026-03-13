/**
 * AI Loader Component
 *
 * Animated loading indicator for AI processing states
 * Includes typing indicators and pulsing animations
 */

"use client";

import * as React from "react";

import { Icon } from "../../../atoms/icon";
import { cn } from "../../../lib/utils";

interface AILoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "typing" | "spinner";
  ref?: React.Ref<HTMLDivElement>;
}

function AILoader({
  className,
  variant = "default",
  ref,
  ...props
}: AILoaderProps) {
  if (variant === "spinner") {
    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-center", className)}
        {...props}
      >
        <Icon
          name="loader-2"
          size={20}
          className="animate-spin text-muted-foreground"
        />
      </div>
    );
  }

  if (variant === "typing") {
    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-1", className)}
        {...props}
      >
        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
      <span className="text-sm text-muted-foreground">AI is thinking...</span>
    </div>
  );
}

export { AILoader };
