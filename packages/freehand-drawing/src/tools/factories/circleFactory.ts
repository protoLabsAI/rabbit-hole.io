/**
 * Circle Node Factory
 *
 * Handles creation, synchronization, and reconstruction of circle nodes.
 */

import type { Node } from "@xyflow/react";

import type { ToolNodeFactory, YjsData } from "../registry";

export const circleNodeFactory: ToolNodeFactory = {
  createNode: ({ points, settings, userId, nodeId }): Node | null => {
    if (points.length < 2) return null;

    const [start, end] = points;
    const width = Math.abs(end[0] - start[0]);
    const height = Math.abs(end[1] - start[1]);

    return {
      id: nodeId,
      type: "circle",
      position: {
        x: Math.min(start[0], end[0]),
        y: Math.min(start[1], end[1]),
      },
      data: {
        width,
        height,
        fillColor: settings.fillColor || "217 91% 60%",
        fillOpacity: settings.fillOpacity ?? 0.3,
        strokeColor: settings.strokeColor || "217 91% 40%",
        strokeWidth: settings.strokeWidth ?? 2,
        userId,
        createdAt: Date.now(),
      },
      measured: {
        width,
        height,
      },
      width,
      height,
      zIndex: 2000,
      selectable: true,
      draggable: false, // Only draggable when selected (managed by parent)
    };
  },

  createYjsData: (node): YjsData => ({
    type: "circle",
    position: node.position,
    width: node.width!,
    height: node.height!,
    fillColor: node.data.fillColor,
    fillOpacity: node.data.fillOpacity,
    strokeColor: node.data.strokeColor,
    strokeWidth: node.data.strokeWidth,
    userId: node.data.userId as string,
    createdAt: node.data.createdAt as number,
  }),

  fromYjsData: (key, data, extras): Node => ({
    id: key,
    type: "circle",
    position: data.position,
    data: {
      width: data.width,
      height: data.height,
      fillColor: data.fillColor,
      fillOpacity: data.fillOpacity,
      strokeColor: data.strokeColor,
      strokeWidth: data.strokeWidth,
      userId: data.userId,
      createdAt: data.createdAt,
      onResizeEnd: extras?.onResizeEnd,
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
    const width = Math.abs(end[0] - start[0]);
    const height = Math.abs(end[1] - start[1]);
    return width >= 10 && height >= 10;
  },
};
