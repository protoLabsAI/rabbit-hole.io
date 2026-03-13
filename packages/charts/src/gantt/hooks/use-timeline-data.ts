/**
 * useTimelineData Hook
 *
 * Manages timeline data with infinite scroll support
 */

import { getDaysInMonth } from "date-fns";
import { useState, useCallback } from "react";

import type { TimelineData } from "../types";
import { createInitialTimelineData } from "../utils/timeline-generation";

export const useTimelineData = (initialDate: Date = new Date()) => {
  const [timelineData, setTimelineData] = useState<TimelineData>(() =>
    createInitialTimelineData(initialDate)
  );

  const extendPast = useCallback(() => {
    const firstYear = timelineData[0]?.year;
    if (!firstYear) return;

    const newTimelineData: TimelineData = [...timelineData];
    newTimelineData.unshift({
      year: firstYear - 1,
      quarters: new Array(4).fill(null).map((_, quarterIndex) => ({
        months: new Array(3).fill(null).map((_, monthIndex) => {
          const month = quarterIndex * 3 + monthIndex;
          return {
            days: getDaysInMonth(new Date(firstYear - 1, month, 1)),
          };
        }),
      })),
    });

    setTimelineData(newTimelineData);
  }, [timelineData]);

  const extendFuture = useCallback(() => {
    const lastYear = timelineData.at(-1)?.year;
    if (!lastYear) return;

    const newTimelineData: TimelineData = [...timelineData];
    newTimelineData.push({
      year: lastYear + 1,
      quarters: new Array(4).fill(null).map((_, quarterIndex) => ({
        months: new Array(3).fill(null).map((_, monthIndex) => {
          const month = quarterIndex * 3 + monthIndex;
          return {
            days: getDaysInMonth(new Date(lastYear + 1, month, 1)),
          };
        }),
      })),
    });

    setTimelineData(newTimelineData);
  }, [timelineData]);

  return {
    timelineData,
    extendPast,
    extendFuture,
  };
};
