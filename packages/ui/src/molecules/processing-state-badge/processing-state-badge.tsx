/**
 * Processing State Badge Component
 *
 * Displays file processing states with appropriate colors and icons.
 * Used across file management interfaces.
 */

import React from "react";

export type FileProcessingState =
  | "unprocessed"
  | "queued"
  | "processing"
  | "processed"
  | "failed";

interface ProcessingStateBadgeProps {
  state: FileProcessingState;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const stateConfig = {
  unprocessed: {
    label: "Unprocessed",
    icon: "📋",
    bgColor: "bg-warning/10",
    textColor: "text-warning-foreground",
    description: "Ready for processing",
  },
  queued: {
    label: "Queued",
    icon: "⏳",
    bgColor: "bg-info/10",
    textColor: "text-info-foreground",
    description: "Waiting in processing queue",
  },
  processing: {
    label: "Processing",
    icon: "⚙️",
    bgColor: "bg-primary/10",
    textColor: "text-primary",
    description: "Currently being processed",
  },
  processed: {
    label: "Processed",
    icon: "✅",
    bgColor: "bg-success/10",
    textColor: "text-success-foreground",
    description: "Processing completed",
  },
  failed: {
    label: "Failed",
    icon: "❌",
    bgColor: "bg-destructive/10",
    textColor: "text-destructive-foreground",
    description: "Processing failed",
  },
};

const sizeConfig = {
  sm: {
    containerClass: "px-2 py-1 text-xs",
    iconClass: "text-xs",
  },
  md: {
    containerClass: "px-3 py-1 text-sm",
    iconClass: "text-sm",
  },
  lg: {
    containerClass: "px-4 py-2 text-base",
    iconClass: "text-base",
  },
};

export function ProcessingStateBadge({
  state,
  size = "md",
  showLabel = true,
}: ProcessingStateBadgeProps) {
  const config = stateConfig[state];
  const sizeClasses = sizeConfig[size];

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded font-medium
        ${config.bgColor} ${config.textColor}
        ${sizeClasses.containerClass}
      `}
      title={config.description}
    >
      <span className={sizeClasses.iconClass}>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

/**
 * Processing State Description Component
 *
 * Shows detailed information about processing state with next steps
 */
interface ProcessingStateInfoProps {
  state: FileProcessingState;
  processingError?: string;
  processedAt?: string;
  queuedAt?: string;
}

export function ProcessingStateInfo({
  state,
  processingError,
  processedAt,
  queuedAt,
}: ProcessingStateInfoProps) {
  const config = stateConfig[state];

  const getNextSteps = (state: FileProcessingState): string[] => {
    switch (state) {
      case "unprocessed":
        return [
          "File will be automatically queued for processing",
          "Processing includes text extraction, OCR, and metadata analysis",
        ];
      case "queued":
        return [
          "File is in the processing queue",
          "Processing will begin when resources are available",
        ];
      case "processing":
        return [
          "File is currently being processed",
          "This may take several minutes for large files",
        ];
      case "processed":
        return [
          "All processing completed successfully",
          "Extracted content is now searchable in the knowledge graph",
        ];
      case "failed":
        return [
          "Processing encountered an error",
          "File may be re-queued automatically or require manual intervention",
        ];
      default:
        return [];
    }
  };

  const nextSteps = getNextSteps(state);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ProcessingStateBadge state={state} size="md" />
        {queuedAt && state !== "unprocessed" && (
          <span className="text-xs text-muted-foreground">
            Queued: {new Date(queuedAt).toLocaleString()}
          </span>
        )}
        {processedAt && state === "processed" && (
          <span className="text-xs text-muted-foreground">
            Completed: {new Date(processedAt).toLocaleString()}
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{config.description}</p>

      {processingError && state === "failed" && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm">
          <p className="font-medium text-destructive-foreground">
            Error Details:
          </p>
          <p className="text-destructive mt-1">{processingError}</p>
        </div>
      )}

      {nextSteps.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">What&apos;s next:</p>
          <ul className="space-y-1">
            {nextSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-1">
                <span>•</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
