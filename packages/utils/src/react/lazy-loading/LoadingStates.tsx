"use client";

/**
 * Loading States for Lazy Features
 *
 * Reusable skeleton screens for dynamically loaded features.
 * Prevents layout shift and provides consistent UX.
 */

import { Icon } from "@proto/icon-system";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function CopilotKitLoadingSkeleton({
  message = "Loading AI chat...",
  className = "",
}: LoadingStateProps) {
  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      {/* Chat header skeleton */}
      <div className="border-b p-4 space-y-2">
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        <div className="h-4 w-48 bg-muted animate-pulse rounded" />
      </div>

      {/* Chat messages skeleton */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-16 w-full bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>

      {/* Input skeleton */}
      <div className="border-t p-4">
        <div className="h-10 w-full bg-muted animate-pulse rounded" />
      </div>

      {/* Loading indicator */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}

export function TldrawLoadingSkeleton({
  message = "Loading drawing tools...",
  className = "",
}: LoadingStateProps) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center ${className}`}
    >
      <div className="text-center space-y-3">
        <Icon
          name="pencil"
          size={32}
          className="mx-auto text-primary animate-pulse"
        />
        <div className="space-y-1">
          <p className="text-sm font-medium">{message}</p>
          <div className="h-1 w-32 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-primary animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function GenericFeatureLoadingSkeleton({
  message = "Loading feature...",
  className = "",
}: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center h-full ${className}`}>
      <div className="text-center space-y-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
