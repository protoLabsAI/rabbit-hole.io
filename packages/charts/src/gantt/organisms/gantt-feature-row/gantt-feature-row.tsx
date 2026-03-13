"use client";

import type { FC, ReactNode } from "react";

import { cn } from "../../lib/utils";
import type { GanttFeature } from "../../types";
import { GanttFeatureItem } from "../gantt-feature-item";

export type GanttFeatureRowProps = {
  features: GanttFeature[];
  onMove?: (id: string, startAt: Date, endAt: Date | null) => void;
  children?: (feature: GanttFeature) => ReactNode;
  className?: string;
};

export const GanttFeatureRow: FC<GanttFeatureRowProps> = ({
  features,
  onMove,
  children,
  className,
}) => {
  // Sort features by start date to handle potential overlaps
  const sortedFeatures = [...features].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime()
  );

  // Calculate sub-row positions for overlapping features using a proper algorithm
  const featureWithPositions: Array<GanttFeature & { subRow: number }> = [];
  const subRowEndTimes: Date[] = []; // Track when each sub-row becomes free

  for (const feature of sortedFeatures) {
    let subRow = 0;

    // Find the first sub-row that's free (doesn't overlap)
    while (
      subRow < subRowEndTimes.length &&
      subRowEndTimes[subRow] > feature.startAt
    ) {
      subRow++;
    }

    // Update the end time for this sub-row
    if (subRow === subRowEndTimes.length) {
      subRowEndTimes.push(feature.endAt);
    } else {
      subRowEndTimes[subRow] = feature.endAt;
    }

    featureWithPositions.push({ ...feature, subRow });
  }

  const maxSubRows = Math.max(1, subRowEndTimes.length);
  const subRowHeight = 36; // Base row height

  return (
    <div
      className={cn("relative", className)}
      style={{
        height: `${maxSubRows * subRowHeight}px`,
        minHeight: "var(--gantt-row-height)",
      }}
    >
      {featureWithPositions.map((feature) => (
        <div
          key={feature.id}
          className="absolute w-full"
          style={{
            top: `${feature.subRow * subRowHeight}px`,
            height: `${subRowHeight}px`,
          }}
        >
          <GanttFeatureItem {...feature} onMove={onMove}>
            {children ? (
              children(feature)
            ) : (
              <p className="flex-1 truncate text-xs">{feature.name}</p>
            )}
          </GanttFeatureItem>
        </div>
      ))}
    </div>
  );
};
