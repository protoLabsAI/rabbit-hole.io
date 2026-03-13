/**
 * Position Calculation Utilities
 *
 * Functions for calculating mouse positions and date mapping
 */

import { addDays } from "date-fns";

import type { GanttContextProps } from "../types";

import { getsDaysIn, getAddRange } from "./date-calculations";

export const getDateByMousePosition = (
  context: GanttContextProps,
  mouseX: number
): Date => {
  const timelineStartDate = new Date(context.timelineData[0].year, 0, 1);
  const columnWidth = (context.columnWidth * context.zoom) / 100;
  const offset = Math.floor(mouseX / columnWidth);
  const daysIn = getsDaysIn(context.range);
  const addRange = getAddRange(context.range);
  const month = addRange(timelineStartDate, offset);
  const daysInMonth = daysIn(month);
  const pixelsPerDay = Math.round(columnWidth / daysInMonth);
  const dayOffset = Math.floor((mouseX % columnWidth) / pixelsPerDay);
  const actualDate = addDays(month, dayOffset);

  return actualDate;
};
