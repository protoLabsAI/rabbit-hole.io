/**
 * Text Node Factory
 *
 * Handles creation, synchronization, and reconstruction of text nodes.
 */

import type { Node } from "@xyflow/react";

import type { ToolNodeFactory, YjsData } from "../registry";

export const textNodeFactory: ToolNodeFactory = {
  createNode: ({ points, settings, userId, nodeId, onDelete }): Node | null => {
    if (points.length < 2) return null;

    const [start, end] = points;
    const width = Math.abs(end[0] - start[0]);
    const height = Math.abs(end[1] - start[1]);

    return {
      id: nodeId,
      type: "text",
      position: {
        x: Math.min(start[0], end[0]),
        y: Math.min(start[1], end[1]),
      },
      data: {
        text: "", // Empty text - user will type
        fontSize: settings.fontSize ?? 16,
        fontColor: settings.fontColor || settings.color || "217 91% 40%",
        fontWeight: settings.fontWeight ?? "normal",
        textAlign: settings.textAlign ?? "left",
        backgroundColor: settings.backgroundColor,
        backgroundOpacity: settings.backgroundOpacity ?? 0,
        padding: settings.padding ?? 8,
        userId,
        createdAt: Date.now(),
        isEditing: true, // Start in edit mode
        onDelete,
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
    type: "text",
    position: node.position,
    width: node.width!,
    height: node.height!,
    text: node.data.text,
    fontSize: node.data.fontSize,
    fontColor: node.data.fontColor,
    fontWeight: node.data.fontWeight,
    textAlign: node.data.textAlign,
    backgroundColor: node.data.backgroundColor,
    backgroundOpacity: node.data.backgroundOpacity,
    padding: node.data.padding,
    userId: String(node.data.userId),
    createdAt: Number(node.data.createdAt),
  }),

  fromYjsData: (key, data, extras): Node => ({
    id: key,
    type: "text",
    position: data.position,
    data: {
      text: data.text,
      fontSize: data.fontSize,
      fontColor: data.fontColor,
      fontWeight: data.fontWeight,
      textAlign: data.textAlign,
      backgroundColor: data.backgroundColor,
      backgroundOpacity: data.backgroundOpacity,
      padding: data.padding,
      userId: data.userId,
      createdAt: data.createdAt,
      isEditing: false, // Not editing when loading from Yjs
      onTextUpdate: extras?.onTextUpdate,
      onDelete: extras?.onDelete,
    },
    measured: {
      width: data.width,
      height: data.height,
    },
    width: data.width,
    height: data.height,
    zIndex: 2000,
    selectable: true,
    draggable: false,
  }),

  validate: (points): boolean => {
    if (points.length < 2) return false;
    const [start, end] = points;
    const width = Math.abs(end[0] - start[0]);
    const height = Math.abs(end[1] - start[1]);
    return width >= 30 && height >= 20; // Minimum text box size
  },
};
