/**
 * React Flow-specific history hook
 * Implements takeSnapshot() pattern for strategic undo points
 */

import { useEffect, useCallback } from "react";

import type {
  UseReactFlowYjsHistoryOptions,
  UseReactFlowYjsHistoryReturn,
} from "../types";

import { useYjsHistory } from "./useYjsHistory";

const DEFAULT_OPTIONS = {
  enableShortcuts: true,
};

/**
 * React Flow-specific history hook
 *
 * Provides takeSnapshot() function for manual undo point creation.
 * This matches React Flow's recommended pattern: you control which
 * actions should be undoable by calling takeSnapshot() before them.
 *
 * @example
 * ```tsx
 * const { takeSnapshot, undo, redo, canUndo, canRedo } = useReactFlowYjsHistory({
 *   ydoc,
 *   userId: "user-123",
 *   scope: ydoc.getMap("workspace"),
 *   enableShortcuts: true
 * });
 *
 * // In your event handlers:
 * const onNodeDragStart = () => {
 *   takeSnapshot(); // Capture state before drag
 * };
 *
 * const onNodesDelete = () => {
 *   takeSnapshot(); // Capture state before delete
 * };
 * ```
 */
export function useReactFlowYjsHistory(
  options: UseReactFlowYjsHistoryOptions
): UseReactFlowYjsHistoryReturn {
  const {
    enableShortcuts = DEFAULT_OPTIONS.enableShortcuts,
    ...historyOptions
  } = options;

  // Use base history hook
  const history = useYjsHistory(historyOptions);

  /**
   * Take a snapshot of current state
   * Call this BEFORE making changes you want to be undoable
   *
   * Note: Unlike React Flow's in-memory approach, this uses Yjs
   * transactions which automatically capture state changes when
   * you modify the document with a transaction origin.
   *
   * The snapshot here serves as a manual checkpoint marker.
   */
  const takeSnapshot = useCallback(() => {
    // Yjs UndoManager automatically tracks changes via transaction origins
    // This is a no-op but kept for API compatibility with React Flow pattern
    // The real undo tracking happens when you do:
    // ydoc.transact(() => { ... }, userId)
    // If you need explicit snapshots, you can create a version:
    // history.createVersion(`Snapshot ${Date.now()}`).catch(console.error);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableShortcuts) {
      return;
    }

    const keyDownHandler = (event: KeyboardEvent) => {
      if (
        event.key?.toLowerCase() === "z" &&
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey
      ) {
        event.preventDefault();
        history.redo();
      } else if (
        event.key?.toLowerCase() === "z" &&
        (event.ctrlKey || event.metaKey)
      ) {
        event.preventDefault();
        history.undo();
      }
    };

    document.addEventListener("keydown", keyDownHandler);
    return () => {
      document.removeEventListener("keydown", keyDownHandler);
    };
  }, [history.undo, history.redo, enableShortcuts]);

  return {
    ...history,
    takeSnapshot,
  };
}
