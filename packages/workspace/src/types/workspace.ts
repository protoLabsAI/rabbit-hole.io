/**
 * Workspace Types
 *
 * Multi-tab collaborative workspace with session support.
 * Supports local/offline work with Yjs sync when online.
 */

import type { RegisteredIconName } from "@proto/icon-system";

import type { CanvasData, CanvasDataForType } from "./canvas-data";

export type CanvasType =
  | "graph" // React Flow graph editor
  | "map" // ECharts map visualization
  | "timeline" // Timeline view
  | "table" // Data grid
  | "kanban" // Kanban board
  | "mindmap"; // Mind map layout

export type TabType = "main" | "session";
export type TabVisibility = "edit" | "view" | "hidden";

export interface WorkspaceTab {
  id: string; // UUID or "main"
  name: string;
  type: TabType; // main or session
  canvasType: CanvasType;
  canvasData: CanvasData; // Type-safe discriminated union
  roomId: string; // Yjs room ID (user:X:workspace:Y:main or session:UUID)
  visibility?: TabVisibility; // For session tabs
  sessionId?: string; // If type === "session"
  metadata: {
    createdAt: number;
    updatedAt: number;
    createdBy: string;
  };
}

export interface Workspace {
  id: string;
  name: string;
  tabs: WorkspaceTab[]; // Multiple tabs
  activeTabId: string | null; // Currently active tab
  metadata: {
    createdAt: number;
    updatedAt: number;
    owner: string;
    isPublic: boolean;
  };
}

export interface UserPresence {
  userId: string;
  userName: string;
  userColor: string;
  cursor?: { x: number; y: number };
  viewport?: { zoom: number; pan: { x: number; y: number } };
  isFollowing?: string | null; // userId they're following
  lastSeen: number;
}

export interface WorkspaceState {
  workspace: Workspace;
  users: Map<string, UserPresence>;
  followMode: {
    enabled: boolean;
    followingUserId: string | null;
  };
}

// Toolbar button capabilities - defines which buttons a canvas supports
export interface ToolbarButtonCapabilities {
  // Universal controls (should be true for most canvases)
  zoom: boolean; // Zoom in/out
  pan: boolean; // Pan canvas
  lock: boolean; // Lock interactions
  fitView: boolean; // Fit to viewport

  // Canvas-specific controls
  layout: boolean; // Layout algorithms (graph only)
  layers: boolean; // Map layers (map only)
  timeRange: boolean; // Time range picker (timeline only)
  gridSize: boolean; // Grid/snap controls (design canvases)
  colorScheme: boolean; // Color scheme picker (charts)
  filters: boolean; // Data filtering UI
}

// Utility tab definition for bottom panel tabs
export interface UtilityTab {
  id: string;
  label: string;
  icon?: RegisteredIconName;
  component: React.ComponentType;
}

// Canvas capabilities - defines all UI capabilities for a canvas type
export interface CanvasCapabilities {
  toolbarButtons: ToolbarButtonCapabilities;
  settingsPanel: React.ComponentType | null;
  utilityTabs: () => UtilityTab[];
}

// Canvas renderer interface
export interface CanvasRenderer<T extends CanvasType = CanvasType> {
  type: T;
  component: React.ComponentType<any>; // Keep any - each canvas has different props
  icon: RegisteredIconName;
  label: string;
  supportsCollaboration: boolean;
  capabilities: CanvasCapabilities;
  createDefaultData: () => CanvasDataForType<T>; // Type-safe data creation
}
