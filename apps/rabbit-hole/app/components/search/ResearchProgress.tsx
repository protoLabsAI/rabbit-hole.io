"use client";

import { Icon } from "@proto/icon-system";

import type { ResearchStep, SearchPhase } from "../../hooks/useSearch";

interface ResearchProgressProps {
  steps: ResearchStep[];
  phase: SearchPhase;
}

export function ResearchProgress({ steps, phase }: ResearchProgressProps) {
  const isActive = phase === "researching";

  if (steps.length === 0 && !isActive) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {isActive && (
          <Icon
            name="Loader2"
            className="h-3.5 w-3.5 text-primary animate-spin"
          />
        )}
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {isActive ? "Researching..." : "Research Complete"}
        </h3>
      </div>
      <div className="space-y-1">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <Icon
              name={step.step === "searching_web" ? "Globe" : "CheckCircle2"}
              className="h-3 w-3 flex-shrink-0"
            />
            <span>{step.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
