"use client";

import { Icon } from "@proto/icon-system";
import { Progress } from "@proto/ui/atoms";

interface EntityResearchProgressStepProps {
  status: string;
  progress: number;
  phase?: string;
  phaseDetails?: string[];
}

export function EntityResearchProgressStep({
  status,
  progress,
  phase,
  phaseDetails = [],
}: EntityResearchProgressStepProps) {
  const getPhaseStatus = (phaseKey: string) => {
    if (!phase) return "pending";

    const phaseOrder = [
      "init",
      "fetch",
      "evidence",
      "discover",
      "dedupe",
      "limit",
      "structure",
      "relate",
      "enrich",
      "merge",
      "complete",
      "done",
    ];
    const currentIndex = phaseOrder.indexOf(phase);
    const targetIndex = phaseOrder.indexOf(phaseKey);

    if (currentIndex > targetIndex) return "complete";
    if (currentIndex === targetIndex) return "active";
    return "pending";
  };

  const renderPhaseIcon = (phaseKey: string) => {
    const status = getPhaseStatus(phaseKey);
    if (status === "complete") return "✓";
    if (status === "active") return "→";
    return "○";
  };

  const renderPhaseClass = (phaseKey: string) => {
    const status = getPhaseStatus(phaseKey);
    if (status === "complete") return "text-success font-medium";
    if (status === "active") return "text-primary font-medium";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6 py-8">
      <div className="flex flex-col items-center justify-center gap-4">
        <Icon name="loader-2" className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">{status}</p>
          <Progress value={progress} className="w-64" />
          <p className="text-sm text-muted-foreground">
            {Math.round(progress)}%
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 p-4 space-y-3">
        <h4 className="text-sm font-medium">Research Phases</h4>
        <ul className="text-sm space-y-2">
          <li className={renderPhaseClass("fetch")}>
            {renderPhaseIcon("fetch")} Fetching from sources
          </li>
          <li className={renderPhaseClass("evidence")}>
            {renderPhaseIcon("evidence")} Creating evidence nodes
          </li>
          <li className={renderPhaseClass("discover")}>
            {renderPhaseIcon("discover")} Discovering entities
          </li>
          <li className={renderPhaseClass("dedupe")}>
            {renderPhaseIcon("dedupe")} Deduplicating similar names
          </li>
          <li className={renderPhaseClass("structure")}>
            {renderPhaseIcon("structure")} Extracting required fields
          </li>
          <li className={renderPhaseClass("relate")}>
            {renderPhaseIcon("relate")} Finding relationships
          </li>
          <li className={renderPhaseClass("enrich")}>
            {renderPhaseIcon("enrich")} Enriching primary entities
          </li>
        </ul>

        {/* Phase details */}
        {phaseDetails.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Recent Activity:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 max-h-24 overflow-y-auto">
              {phaseDetails.slice(-5).map((detail, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
