import getStroke from "perfect-freehand";

import type { FreehandSettings } from "./FreehandContextMenu";
import type { Points } from "./types";

/**
 * Default options for perfect-freehand stroke generation
 */
export const pathOptions = {
  size: 8,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  easing: (t: number) => t,
  start: {
    taper: 0,
    cap: true,
  },
  end: {
    taper: 0,
    cap: true,
  },
};

/**
 * Convert points array to SVG path string using perfect-freehand
 */
export function pointsToPath(
  points: Points,
  settings?: Partial<FreehandSettings>,
  zoom = 1
): string {
  if (points.length === 0) return "";

  const stroke = getStroke(points, {
    size: (settings?.size ?? pathOptions.size) / zoom,
    thinning: settings?.thinning ?? pathOptions.thinning,
    smoothing: settings?.smoothing ?? pathOptions.smoothing,
    streamline: pathOptions.streamline,
    easing: pathOptions.easing,
    start: pathOptions.start,
    end: pathOptions.end,
  });

  if (stroke.length === 0) return "";

  const path = stroke.reduce((acc, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length];
    if (i === 0) return `M ${x0},${y0}`;
    return `${acc} L ${x0},${y0}`;
  }, "");

  return `${path} Z`;
}
