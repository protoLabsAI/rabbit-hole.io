/**
 * @protolabsai/freehand-drawing
 *
 * Freehand drawing overlay for React Flow with Yjs collaboration support
 */

export { Freehand } from "./Freehand";
export { FreehandNode } from "./FreehandNode";
export { RectangleNode } from "./RectangleNode";
export { CircleNode } from "./CircleNode";
export { LineNode } from "./LineNode";
export { TextNode } from "./TextNode";
export { useFreehandDrawing } from "./useFreehandDrawing";
export { InspectorPanel } from "./InspectorPanel";
export { FreehandContextMenu } from "./FreehandContextMenu";
export { FreehandNodeContextMenu } from "./FreehandNodeContextMenu";
export { pointsToPath, pathOptions } from "./path";
export {
  TOOL_REGISTRY,
  getToolsByCategory,
  getToolConfig,
  getAllTools,
  getDrawableNodeTypes,
  isDrawingNodeType,
  type ToolType,
  type ToolConfig,
  type ToolNodeFactory,
  type NodeFactoryContext,
  type YjsData,
} from "./tools/registry";
export { ToolSelector } from "./tools/ToolSelector";
export type {
  Point,
  Points,
  FreehandNodeData,
  FreehandNodeType,
  FreehandDrawingData,
} from "./types";
export type { FreehandSettings, DrawingToolState } from "./FreehandContextMenu";
