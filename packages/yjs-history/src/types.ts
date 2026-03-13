/**
 * Core types for Yjs versioning and history management
 */

import type * as Y from "yjs";

/**
 * Version snapshot metadata
 */
export interface VersionSnapshot {
  /** Unique version identifier */
  id: string;
  /** Human-readable version name */
  name: string;
  /** Optional description */
  description?: string;
  /** Timestamp of snapshot creation */
  timestamp: number;
  /** User who created this version */
  userId: string;
  /** Serialized Y.Doc state (binary) */
  state: Uint8Array;
  /** Optional tags for categorization */
  tags?: string[];
  /** Parent version ID (for branching) */
  parentId?: string;
}

/**
 * Version metadata (without state data for listing)
 */
export interface VersionMetadata {
  id: string;
  name: string;
  description?: string;
  timestamp: number;
  userId: string;
  tags?: string[];
  parentId?: string;
}

/**
 * History event types
 */
export type HistoryEventType =
  | "snapshot-created"
  | "undo"
  | "redo"
  | "version-restored"
  | "history-cleared";

/**
 * History event callback
 */
export interface HistoryEvent {
  type: HistoryEventType;
  timestamp: number;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Options for useYjsHistory hook
 */
export interface UseYjsHistoryOptions {
  /** Y.Doc instance */
  ydoc: Y.Doc | null;
  /** Current user ID for transaction origins */
  userId: string | null;
  /** Scope to track (if null, tracks entire doc) */
  scope?: Y.AbstractType<any> | null;
  /** Enable history tracking */
  enabled?: boolean;
  /** Maximum undo stack size (0 = unlimited) */
  maxUndoStackSize?: number;
  /** Capture timeout in ms (coalesce rapid changes) */
  captureTimeout?: number;
  /** Enable automatic versioning */
  enableVersioning?: boolean;
  /** Auto-create version every N operations */
  autoVersionInterval?: number;
  /** Version storage adapter */
  versionStorage?: VersionStorage;
  /** Event callback */
  onHistoryEvent?: (event: HistoryEvent) => void;
}

/**
 * Version storage interface
 */
export interface VersionStorage {
  /** Save a version snapshot */
  save(snapshot: VersionSnapshot): Promise<void>;
  /** Load a version snapshot by ID */
  load(versionId: string): Promise<VersionSnapshot | null>;
  /** List all versions (metadata only) */
  list(): Promise<VersionMetadata[]>;
  /** Delete a version */
  delete(versionId: string): Promise<void>;
  /** Clear all versions */
  clear(): Promise<void>;
}

/**
 * Return type for useYjsHistory hook
 */
export interface UseYjsHistoryReturn {
  /** Undo last action */
  undo: () => void;
  /** Redo last undone action */
  redo: () => void;
  /** Can undo */
  canUndo: boolean;
  /** Can redo */
  canRedo: boolean;
  /** Clear undo/redo stacks */
  clear: () => void;
  /** Undo stack size */
  undoStackSize: number;
  /** Redo stack size */
  redoStackSize: number;
  /** Create a named version snapshot */
  createVersion: (
    name: string,
    description?: string,
    tags?: string[]
  ) => Promise<string>;
  /** List all versions */
  listVersions: () => Promise<VersionMetadata[]>;
  /** Restore to a specific version */
  restoreVersion: (versionId: string) => Promise<void>;
  /** Delete a version */
  deleteVersion: (versionId: string) => Promise<void>;
  /** Underlying Y.UndoManager instance */
  undoManager: Y.UndoManager | null;
}

/**
 * Options for React Flow-specific history
 */
export interface UseReactFlowYjsHistoryOptions extends UseYjsHistoryOptions {
  /** Enable keyboard shortcuts (Cmd/Ctrl+Z) */
  enableShortcuts?: boolean;
}

/**
 * Return type for useReactFlowYjsHistory hook
 */
export interface UseReactFlowYjsHistoryReturn extends UseYjsHistoryReturn {
  /** Take a snapshot of current state */
  takeSnapshot: () => void;
}
