"use client";

import { Progress } from "@protolabsai/ui/atoms";

interface EnrichmentProgressStepProps {
  status: string;
  progress: number;
}

export function EnrichmentProgressStep({
  status,
  progress,
}: EnrichmentProgressStepProps) {
  return (
    <div className="space-y-6 py-8">
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="font-medium">{status}</span>
          <span className="text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="text-sm text-muted-foreground text-center">
        This may take a few moments while we fetch and analyze Wikipedia data...
      </div>

      <div className="flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    </div>
  );
}
