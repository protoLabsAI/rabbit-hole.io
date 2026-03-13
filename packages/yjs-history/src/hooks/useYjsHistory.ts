/**
 * Advanced Yjs history hook with versioning support
 * Extends basic Y.UndoManager with named snapshots and rollback
 */

import { useEffect, useState, useCallback, useRef } from "react";
import * as Y from "yjs";

import { VersionManager } from "../core/version-manager";
import { MemoryVersionStorage } from "../storage/memory-storage";
import type {
  UseYjsHistoryOptions,
  UseYjsHistoryReturn,
  VersionMetadata,
  HistoryEvent,
} from "../types";

const DEFAULT_OPTIONS = {
  enabled: true,
  maxUndoStackSize: 50,
  captureTimeout: 500,
  enableVersioning: true,
  autoVersionInterval: 0, // 0 = disabled
};

/**
 * Advanced Yjs history management hook
 *
 * Provides undo/redo functionality with optional versioning.
 * Works with both HocusPocus and local Yjs providers.
 *
 * @example
 * ```tsx
 * const {
 *   undo,
 *   redo,
 *   canUndo,
 *   canRedo,
 *   createVersion,
 *   restoreVersion
 * } = useYjsHistory({
 *   ydoc,
 *   userId: "user-123",
 *   scope: ydoc.getMap("workspace"),
 *   enableVersioning: true
 * });
 * ```
 */
export function useYjsHistory(
  options: UseYjsHistoryOptions
): UseYjsHistoryReturn {
  const {
    ydoc,
    userId,
    scope = null,
    enabled = DEFAULT_OPTIONS.enabled,
    maxUndoStackSize = DEFAULT_OPTIONS.maxUndoStackSize,
    captureTimeout = DEFAULT_OPTIONS.captureTimeout,
    enableVersioning = DEFAULT_OPTIONS.enableVersioning,
    autoVersionInterval = DEFAULT_OPTIONS.autoVersionInterval,
    versionStorage,
    onHistoryEvent,
  } = options;

  const [undoManager, setUndoManager] = useState<Y.UndoManager | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [undoStackSize, setUndoStackSize] = useState(0);
  const [redoStackSize, setRedoStackSize] = useState(0);

  const versionManagerRef = useRef<VersionManager | null>(null);
  const operationCountRef = useRef(0);
  const createVersionRef = useRef<
    | ((name: string, description?: string, tags?: string[]) => Promise<string>)
    | null
  >(null);

  // Initialize undo manager
  useEffect(() => {
    if (!ydoc || !userId || !enabled) {
      setUndoManager(null);
      setCanUndo(false);
      setCanRedo(false);
      return;
    }

    // Determine scope (entire doc or specific type)
    const trackedScope = scope || ydoc.getMap("__root__");

    const manager = new Y.UndoManager(trackedScope, {
      trackedOrigins: new Set([userId]),
      captureTimeout,
    });

    const updateState = () => {
      setCanUndo(manager.canUndo());
      setCanRedo(manager.canRedo());
      setUndoStackSize(manager.undoStack.length);
      setRedoStackSize(manager.redoStack.length);
    };

    const handleStackItemAdded = () => {
      updateState();
      operationCountRef.current += 1;

      // Enforce stack size limit
      if (maxUndoStackSize > 0 && manager.undoStack.length > maxUndoStackSize) {
        const excess = manager.undoStack.length - maxUndoStackSize;
        manager.undoStack.splice(0, excess);
        updateState();
      }

      // Auto-version if enabled and interval reached
      if (
        enableVersioning &&
        autoVersionInterval > 0 &&
        operationCountRef.current >= autoVersionInterval
      ) {
        operationCountRef.current = 0;
        createVersionRef
          .current?.(
            `Auto-save ${new Date().toLocaleTimeString()}`,
            "Automatic version snapshot",
            ["auto"]
          )
          .catch((err) => console.error("Auto-version failed:", err));
      }
    };

    manager.on("stack-item-added", handleStackItemAdded);
    manager.on("stack-item-popped", updateState);
    manager.on("stack-cleared", updateState);

    setUndoManager(manager);
    updateState();

    return () => {
      manager.destroy();
    };
  }, [
    ydoc,
    userId,
    scope,
    enabled,
    maxUndoStackSize,
    captureTimeout,
    enableVersioning,
    autoVersionInterval,
  ]);

  // Initialize version manager
  useEffect(() => {
    if (!ydoc || !enableVersioning) {
      versionManagerRef.current = null;
      return;
    }

    // Use provided storage or default to memory storage
    const storage = versionStorage || new MemoryVersionStorage();
    versionManagerRef.current = new VersionManager(ydoc, storage);
  }, [ydoc, enableVersioning, versionStorage]);

  // Emit history event
  const emitEvent = useCallback(
    (event: HistoryEvent) => {
      onHistoryEvent?.(event);
    },
    [onHistoryEvent]
  );

  const undo = useCallback(() => {
    if (undoManager?.canUndo()) {
      undoManager.undo();
      emitEvent({
        type: "undo",
        timestamp: Date.now(),
        userId: userId || undefined,
      });
    }
  }, [undoManager, userId, emitEvent]);

  const redo = useCallback(() => {
    if (undoManager?.canRedo()) {
      undoManager.redo();
      emitEvent({
        type: "redo",
        timestamp: Date.now(),
        userId: userId || undefined,
      });
    }
  }, [undoManager, userId, emitEvent]);

  const clear = useCallback(() => {
    if (undoManager) {
      undoManager.clear();
      operationCountRef.current = 0;
      emitEvent({
        type: "history-cleared",
        timestamp: Date.now(),
        userId: userId || undefined,
      });
    }
  }, [undoManager, userId, emitEvent]);

  const createVersion = useCallback(
    async (
      name: string,
      description?: string,
      tags?: string[]
    ): Promise<string> => {
      if (!versionManagerRef.current) {
        throw new Error("Version manager not initialized");
      }
      if (!userId) {
        throw new Error("User ID required for versioning");
      }

      const versionId = await versionManagerRef.current.createVersion({
        name,
        description,
        tags,
        userId,
      });

      emitEvent({
        type: "snapshot-created",
        timestamp: Date.now(),
        userId,
        metadata: { versionId, name },
      });

      return versionId;
    },
    [userId, emitEvent]
  );

  // Sync createVersion ref for use in effect without circular dependency
  useEffect(() => {
    createVersionRef.current = createVersion;
  }, [createVersion]);

  const listVersions = useCallback(async (): Promise<VersionMetadata[]> => {
    if (!versionManagerRef.current) {
      return [];
    }
    return versionManagerRef.current.listVersions();
  }, []);

  const restoreVersion = useCallback(
    async (versionId: string): Promise<void> => {
      if (!versionManagerRef.current) {
        throw new Error("Version manager not initialized");
      }
      if (!userId) {
        throw new Error("User ID required for version restoration");
      }

      await versionManagerRef.current.restoreVersion(versionId, userId);

      // Clear undo/redo stacks after restoration
      undoManager?.clear();

      // Reset operation counter to prevent premature auto-save
      operationCountRef.current = 0;

      emitEvent({
        type: "version-restored",
        timestamp: Date.now(),
        userId,
        metadata: { versionId },
      });
    },
    [userId, undoManager, emitEvent]
  );

  const deleteVersion = useCallback(
    async (versionId: string): Promise<void> => {
      if (!versionManagerRef.current) {
        throw new Error("Version manager not initialized");
      }
      await versionManagerRef.current.deleteVersion(versionId);
    },
    []
  );

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
    undoStackSize,
    redoStackSize,
    createVersion,
    listVersions,
    restoreVersion,
    deleteVersion,
    undoManager,
  };
}
