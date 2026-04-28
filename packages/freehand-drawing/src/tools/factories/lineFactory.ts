/**
 * Line Node Factory
 *
 * Handles creation, synchronization, and reconstruction of line nodes.
 */

import type { Node } from "@xyflow/react";

import type { ToolNodeFactory, YjsData } from "../registry";

export const lineNodeFactory: ToolNodeFactory = {
  createNode: ({ points, settings, userId, nodeId }): Node | null => {
    if (points.length < 2) return null;

    const [start, end] = points;

    // Calculate bounding box
    const minX = Math.min(start[0], end[0]);
    const minY = Math.min(start[1], end[1]);
    const maxX = Math.max(start[0], end[0]);
    const maxY = Math.max(start[1], end[1]);
    const width = maxX - minX;
    const height = maxY - minY;

    return {
      id: nodeId,
      type: "line",
      position: { x: minX, y: minY },
      data: {
        x1: start[0] - minX,
        y1: start[1] - minY,
        x2: end[0] - minX,
        y2: end[1] - minY,
        width: width || 2,
        height: height || 2,
        strokeColor: settings.strokeColor || "217 91% 40%",
        strokeWidth: settings.strokeWidth ?? 2,
        userId,
        createdAt: Date.now(),
      },
      measured: {
        width: width || 2,
        height: height || 2,
      },
      width: width || 2,
      height: height || 2,
      zIndex: 2000,
      selectable: true,
      draggable: false, // Only draggable when selected (managed by parent)
    };
  },

  createYjsData: (node): YjsData => ({
    type: "line",
    x1: node.data.x1,
    y1: node.data.y1,
    x2: node.data.x2,
    y2: node.data.y2,
    width: node.width!,
    height: node.height!,
    position: node.position,
    strokeColor: node.data.strokeColor,
    strokeWidth: node.data.strokeWidth,
    userId: String(node.data.userId),
    createdAt: Number(node.data.createdAt),
  }),

  fromYjsData: (key, data): Node => ({
    id: key,
    type: "line",
    position: data.position,
    data: {
      x1: data.x1,
      y1: data.y1,
      x2: data.x2,
      y2: data.y2,
      width: data.width,
      height: data.height,
      strokeColor: data.strokeColor,
      strokeWidth: data.strokeWidth,
      userId: data.userId,
      createdAt: data.createdAt,
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
    if (points.length < 2) return false;
    const [start, end] = points;
    const length = Math.sqrt(
      Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2)
    );
    return length >= 10;
  },
};
