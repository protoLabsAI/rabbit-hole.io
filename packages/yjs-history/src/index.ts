/**
 * @proto/yjs-history
 *
 * Advanced undo/redo and versioning system for Yjs with React Flow integration
 *
 * Features:
 * - Undo/redo with Y.UndoManager
 * - Named version snapshots
 * - Version browsing and rollback
 * - React Flow integration with takeSnapshot() pattern
 * - IndexedDB and memory storage adapters
 * - Works with HocusPocus and local Yjs providers
 *
 * @packageDocumentation
 */

// Core types
export type {
  VersionSnapshot,
  VersionMetadata,
  HistoryEventType,
  HistoryEvent,
  UseYjsHistoryOptions,
  UseYjsHistoryReturn,
  UseReactFlowYjsHistoryOptions,
  UseReactFlowYjsHistoryReturn,
  VersionStorage,
} from "./types";

// Hooks
export { useYjsHistory } from "./hooks/useYjsHistory";
export { useReactFlowYjsHistory } from "./hooks/useReactFlowYjsHistory";

// Core utilities
export { VersionManager } from "./core/version-manager";
export type { CreateVersionOptions } from "./core/version-manager";

// Storage adapters
export { IndexedDBVersionStorage } from "./storage/indexeddb-storage";
export { MemoryVersionStorage } from "./storage/memory-storage";

// Utilities
export {
  groupVersionsByDate,
  filterVersionsByTag,
  filterVersionsByUser,
  searchVersions,
  formatVersionTime,
  getUniqueTags,
  buildVersionTree,
} from "./utils/version-browser";
export type { VersionGroup, VersionNode } from "./utils/version-browser";
