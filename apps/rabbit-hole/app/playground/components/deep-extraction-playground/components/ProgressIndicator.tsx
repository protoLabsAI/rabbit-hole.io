/**
 * Progress Indicator
 *
 * Shows extraction phase progress in chat.
 */

import React from "react";

import { Icon } from "@proto/icon-system";

interface ProgressIndicatorProps {
  currentPhase: string;
  completedPhases: string[];
  totalPhases: number;
}

const PHASE_LABELS: Record<string, string> = {
  discover: "Discovering",
  "discover-phase": "Discovering",
  structure: "Structuring",
  "structure-phase": "Structuring",
  enrich: "Enriching",
  "enrich-phase": "Enriching",
  relate: "Finding Relationships",
  "relate-phase": "Finding Relationships",
};

const PHASE_ICONS: Record<string, string> = {
  discover: "search",
  "discover-phase": "search",
  structure: "layout",
  "structure-phase": "layout",
  enrich: "sparkles",
  "enrich-phase": "sparkles",
  relate: "network",
  "relate-phase": "network",
};

export function ProgressIndicator({
  currentPhase,
  completedPhases,
  totalPhases,
}: ProgressIndicatorProps) {
  const phases = ["discover", "structure", "enrich", "relate"];
  const normalizedCompleted = completedPhases.map((p) =>
    p.replace("-phase", "")
  );
  const normalizedCurrent = currentPhase.replace("-phase", "");

  return (
    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 mt-2">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="loader" size={16} className="text-blue-600 animate-spin" />
        <span className="text-sm font-medium">
          {PHASE_LABELS[currentPhase] || "Processing"}...
        </span>
      </div>

      {/* Phase progress */}
      <div className="space-y-2">
        {phases.slice(0, totalPhases).map((phase) => {
          const isCompleted = normalizedCompleted.includes(phase);
          const isCurrent = normalizedCurrent === phase;

          return (
            <div key={phase} className="flex items-center gap-2">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? "bg-green-500"
                    : isCurrent
                      ? "bg-blue-500 animate-pulse"
                      : "bg-muted"
                }`}
              >
                {isCompleted ? (
                  <Icon name="check" size={12} className="text-white" />
                ) : isCurrent ? (
                  <Icon
                    name={PHASE_ICONS[phase] || "circle"}
                    size={12}
                    className="text-white"
                  />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                )}
              </div>
              <span
                className={`text-sm ${
                  isCompleted
                    ? "text-green-700 font-medium"
                    : isCurrent
                      ? "text-blue-700 font-medium"
                      : "text-muted-foreground"
                }`}
              >
                {PHASE_LABELS[phase] || phase}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{
            width: `${(normalizedCompleted.length / totalPhases) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
