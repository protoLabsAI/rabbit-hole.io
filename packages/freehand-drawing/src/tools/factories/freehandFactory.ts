/**
 * Freehand Node Factory
 *
 * Handles creation, synchronization, and reconstruction of freehand drawing nodes.
 */

import type { Node } from "@xyflow/react";

import type { FreehandNodeType } from "../../types";
import type { ToolNodeFactory, YjsData } from "../registry";

/**
 * Process raw points into flow coordinates and bounding box
 */
function processPoints(
  points: [number, number, number][],
  screenToFlowPosition: (pos: { x: number; y: number }) => {
    x: number;
    y: number;
  },
  brushSize: number
) {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;

  const flowPoints: [number, number, number][] = [];

  for (const point of points) {
    const { x, y } = screenToFlowPosition({ x: point[0], y: point[1] });
    x1 = Math.min(x1, x);
    y1 = Math.min(y1, y);
    x2 = Math.max(x2, x);
    y2 = Math.max(y2, y);
    flowPoints.push([x, y, point[2]]);
  }

  // Adjust for line thickness
  const thickness = brushSize * 0.5;
  x1 -= thickness;
  y1 -= thickness;
  x2 += thickness;
  y2 += thickness;

  // Normalize points relative to bounding box
  for (const flowPoint of flowPoints) {
    flowPoint[0] -= x1;
    flowPoint[1] -= y1;
  }

  const width = x2 - x1;
  const height = y2 - y1;

  return {
    position: { x: x1, y: y1 },
    width,
    height,
    data: { points: flowPoints, initialSize: { width, height } },
  };
}

export const freehandNodeFactory: ToolNodeFactory = {
  createNode: ({
    points,
    settings,
    userId,
    nodeId,
    screenToFlowPosition,
  }): Node | null => {
    if (!screenToFlowPosition) return null;

    const processed = processPoints(
      points,
      screenToFlowPosition,
      settings.size
    );

    const newNode: FreehandNodeType = {
      id: nodeId,
      type: "freehand",
      position: processed.position,
      data: {
        ...processed.data,
        color: settings.color,
        opacity: settings.opacity,
        size: settings.size,
        smoothing: settings.smoothing,
        thinning: settings.thinning,
        userId,
        createdAt: Date.now(),
        drawingSource: "local",
      },
      measured: {
        width: processed.width,
        height: processed.height,
      },
      width: processed.width,
      height: processed.height,
      zIndex: 2000,
      selectable: true,
      draggable: false, // Only draggable when selected (managed by parent)
    };

    return newNode;
  },

  createYjsData: (node): YjsData => ({
    type: "freehand",
    points: node.data.points,
    width: node.width!,
    height: node.height!,
    position: node.position,
    color: node.data.color,
    opacity: node.data.opacity,
    size: node.data.size,
    smoothing: node.data.smoothing,
    thinning: node.data.thinning,
    userId: node.data.userId as string,
    createdAt: node.data.createdAt as number,
  }),

  fromYjsData: (key, data): Node => ({
    id: key,
    type: "freehand",
    position: data.position,
    data: {
      points: data.points,
      initialSize: {
        width: data.width,
        height: data.height,
      },
      color: data.color,
      opacity: data.opacity,
      size: data.size,
      smoothing: data.smoothing,
      thinning: data.thinning,
      userId: data.userId,
      createdAt: data.createdAt,
      drawingSource: "remote",
    },
    measured: {
      width: data.width,
      height: data.height,
    },
    width: data.width,
    height: data.height,
    zIndex: 2000,
    selectable: true,
    draggable: false, // Only draggable when selected (managed by parent)
  }),

  validate: (points): boolean => {
    return points.length >= 2;
  },
};
