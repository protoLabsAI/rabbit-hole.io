"use client";

import { Progress } from "@proto/ui/atoms";

interface FileExtractionProgressStepProps {
  status: string;
  progress: number;
}

/**
 * Clamps a value between 0 and 100
 */
function clampProgress(value: number | undefined): number {
  if (value === undefined || isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function FileExtractionProgressStep({
  status,
  progress,
}: FileExtractionProgressStepProps) {
  const clampedProgress = clampProgress(progress);

  return (
    <div className="space-y-6 py-8">
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="font-medium">{status}</span>
          <span className="text-muted-foreground">{clampedProgress}%</span>
        </div>
        <Progress value={clampedProgress} className="h-2" />
      </div>

      <div className="text-sm text-muted-foreground text-center">
        This may take a few moments while we extract and structure entities...
      </div>

      <div className="flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    </div>
  );
}
