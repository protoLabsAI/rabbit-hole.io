/**
 * Overlap Detection Utilities
 *
 * Algorithm for detecting and positioning overlapping features in rows
 */

import type { GanttFeature } from "../types";

export type FeatureWithPosition = GanttFeature & { subRow: number };

/**
 * Calculate sub-row positions for overlapping features
 *
 * Uses a greedy algorithm to pack features into the minimum number of rows
 * @param features - Array of features to position
 * @returns Array of features with subRow positions
 */
export const calculateFeaturePositions = (
  features: GanttFeature[]
): FeatureWithPosition[] => {
  // Sort features by start date to handle potential overlaps
  const sortedFeatures = [...features].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime()
  );

  const featureWithPositions: FeatureWithPosition[] = [];
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

  return featureWithPositions;
};

/**
 * Calculate the maximum number of sub-rows needed
 */
export const calculateMaxSubRows = (features: GanttFeature[]): number => {
  const positioned = calculateFeaturePositions(features);
  return Math.max(1, ...positioned.map((f) => f.subRow + 1));
};
