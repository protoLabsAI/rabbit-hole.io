/**
 * Canvas Registry
 *
 * Registry of available canvas types and their renderers.
 */

import { MapCanvas } from "@protolabsai/charts/map";
import type {
  CanvasRenderer,
  CanvasType,
  GraphCanvasData,
  MapCanvasData,
  TimelineCanvasData,
  TableCanvasData,
  KanbanCanvasData,
  MindmapCanvasData,
} from "@protolabsai/workspace";

// Import canvas components
import { GraphCanvasIntegrated } from "./GraphCanvasIntegrated";
import { GraphSettings } from "./GraphSettings";

export const CANVAS_REGISTRY: Record<CanvasType, CanvasRenderer> = {
  graph: {
    type: "graph",
    component: GraphCanvasIntegrated,
    icon: "network",
    label: "Graph",
    supportsCollaboration: true,
    capabilities: {
      toolbarButtons: {
        zoom: true,
        pan: true,
        lock: true,
        fitView: true,
        layout: true, // Graph-specific
        layers: false,
        timeRange: false,
        gridSize: false,
        colorScheme: false,
        filters: false,
      },
      settingsPanel: GraphSettings,
      utilityTabs: () => [], // Defined in useGraphUtilityTabs
    },
    createDefaultData: (): GraphCanvasData => ({
      canvasType: "graph",
      graphData: {},
      hiddenEntityTypes: [],
      expandedNodes: [],
    }),
  },
  map: {
    type: "map",
    component: MapCanvas as any, // TODO: Fix type - needs wrapper for MapCanvas props
    icon: "map",
    label: "Map",
    supportsCollaboration: true,
    capabilities: {
      toolbarButtons: {
        zoom: true,
        pan: true,
        lock: true,
        fitView: true,
        layout: false, // No layout on maps
        layers: true, // Map-specific
        timeRange: false,
        gridSize: false,
        colorScheme: false,
        filters: false,
      },
      settingsPanel: null, // To be created
      utilityTabs: () => [], // To be created
    },
    createDefaultData: (): MapCanvasData => ({
      canvasType: "map",
      markers: [],
      center: { lat: 0, lng: 0 },
      zoom: 2,
    }),
  },
  timeline: {
    type: "timeline",
    component: GraphCanvasIntegrated, // TODO: Implement TimelineCanvas
    icon: "calendar",
    label: "Timeline",
    supportsCollaboration: false,
    capabilities: {
      toolbarButtons: {
        zoom: true,
        pan: true,
        lock: true,
        fitView: true,
        layout: false,
        layers: false,
        timeRange: true, // Timeline-specific
        gridSize: false,
        colorScheme: false,
        filters: true,
      },
      settingsPanel: null,
      utilityTabs: () => [],
    },
    createDefaultData: (): TimelineCanvasData => ({
      canvasType: "timeline",
      events: [],
    }),
  },
  table: {
    type: "table",
    component: GraphCanvasIntegrated, // TODO: Implement TableCanvas
    icon: "grid",
    label: "Table",
    supportsCollaboration: true,
    capabilities: {
      toolbarButtons: {
        zoom: false,
        pan: false,
        lock: true,
        fitView: false,
        layout: false,
        layers: false,
        timeRange: false,
        gridSize: false,
        colorScheme: false,
        filters: true,
      },
      settingsPanel: null,
      utilityTabs: () => [],
    },
    createDefaultData: (): TableCanvasData => ({
      canvasType: "table",
      columns: [],
      rows: [],
    }),
  },
  kanban: {
    type: "kanban",
    component: GraphCanvasIntegrated, // TODO: Implement KanbanCanvas
    icon: "grid",
    label: "Kanban",
    supportsCollaboration: true,
    capabilities: {
      toolbarButtons: {
        zoom: false,
        pan: false,
        lock: true,
        fitView: false,
        layout: false,
        layers: false,
        timeRange: false,
        gridSize: false,
        colorScheme: false,
        filters: true,
      },
      settingsPanel: null,
      utilityTabs: () => [],
    },
    createDefaultData: (): KanbanCanvasData => ({
      canvasType: "kanban",
      columns: [],
      cards: [],
    }),
  },
  mindmap: {
    type: "mindmap",
    component: GraphCanvasIntegrated, // TODO: Implement MindmapCanvas
    icon: "network",
    label: "Mindmap",
    supportsCollaboration: true,
    capabilities: {
      toolbarButtons: {
        zoom: true,
        pan: true,
        lock: true,
        fitView: true,
        layout: true,
        layers: false,
        timeRange: false,
        gridSize: false,
        colorScheme: false,
        filters: false,
      },
      settingsPanel: null,
      utilityTabs: () => [],
    },
    createDefaultData: (): MindmapCanvasData => ({
      canvasType: "mindmap",
      rootNode: null,
      nodes: [],
    }),
  },
};

export function getCanvasRenderer(type: CanvasType): CanvasRenderer {
  return CANVAS_REGISTRY[type];
}

export function getCanvasTypes(): CanvasType[] {
  return Object.keys(CANVAS_REGISTRY) as CanvasType[];
}
