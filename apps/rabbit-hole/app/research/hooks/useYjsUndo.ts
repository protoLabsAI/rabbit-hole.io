import { useEffect, useState, useCallback } from "react";
import * as Y from "yjs";

import { vlog } from "@/lib/verbose-logger";

interface UseYjsUndoOptions {
  ydoc: Y.Doc | null;
  userId: string | null;
  scope: Y.AbstractType<any> | null;
  enabled?: boolean;
  maxStackSize?: number;
  captureTimeout?: number;
}

export function useYjsUndo({
  ydoc,
  userId,
  scope,
  enabled = true,
  maxStackSize = 50,
  captureTimeout = 500,
}: UseYjsUndoOptions) {
  const [undoManager, setUndoManager] = useState<Y.UndoManager | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [stackSize, setStackSize] = useState(0);
  const [redoStackSize, setRedoStackSize] = useState(0);

  useEffect(() => {
    if (!ydoc || !userId || !enabled || !scope) {
      setUndoManager(null);
      setCanUndo(false);
      setCanRedo(false);
      return;
    }

    vlog.log("📜 UndoManager initialized for:", {
      userId,
      maxStackSize,
      captureTimeout,
    });

    const manager = new Y.UndoManager(scope, {
      trackedOrigins: new Set([userId]),
      captureTimeout,
    });

    const updateState = () => {
      setCanUndo(manager.canUndo());
      setCanRedo(manager.canRedo());
      setStackSize(manager.undoStack.length);
      setRedoStackSize(manager.redoStack.length);
    };

    const handleStackItemAdded = () => {
      updateState();

      // Enforce stack size limit
      if (maxStackSize > 0 && manager.undoStack.length > maxStackSize) {
        const excess = manager.undoStack.length - maxStackSize;
        manager.undoStack.splice(0, excess);
        console.warn(
          `⚠️ Undo stack limit reached (${maxStackSize}), pruned ${excess} old items`
        );
        updateState();
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
  }, [ydoc, userId, scope, enabled]);

  const undo = useCallback(() => {
    if (undoManager?.canUndo()) {
      vlog.log("⬅️ Undo");
      undoManager.undo();
    }
  }, [undoManager]);

  const redo = useCallback(() => {
    if (undoManager?.canRedo()) {
      vlog.log("➡️ Redo");
      undoManager.redo();
    }
  }, [undoManager]);

  const clear = useCallback(() => {
    if (undoManager) {
      vlog.log("🗑️ Clearing undo stack");
      undoManager.clear();
    }
  }, [undoManager]);

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
    undoManager,
    stackSize,
    redoStackSize,
  };
}
