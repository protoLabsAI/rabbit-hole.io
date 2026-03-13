/**
 * useDateCalculations Hook
 *
 * Memoized date calculation functions
 */

import { useMemo } from "react";

import type { GanttContextProps } from "../types";
import {
  getOffset,
  getWidth,
  calculateInnerOffset,
} from "../utils/date-calculations";

export const useDateCalculations = (context: GanttContextProps) => {
  return useMemo(
    () => ({
      getOffset: (date: Date, timelineStartDate: Date) =>
        getOffset(date, timelineStartDate, context),
      getWidth: (startAt: Date, endAt: Date | null) =>
        getWidth(startAt, endAt, context),
      calculateInnerOffset: (date: Date) =>
        calculateInnerOffset(
          date,
          context.range,
          (context.columnWidth * context.zoom) / 100
        ),
    }),
    [context]
  );
};
