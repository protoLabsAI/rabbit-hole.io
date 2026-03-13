import { useEffect } from "react";

interface UseWorkspaceKeyboardShortcutsOptions {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  enabled?: boolean;
}

export function useWorkspaceKeyboardShortcuts({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  enabled = true,
}: UseWorkspaceKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd + Z = Undo
      if (isMod && e.key === "z" && !e.shiftKey && canUndo) {
        e.preventDefault();
        onUndo();
        return;
      }

      // Ctrl/Cmd + Shift + Z = Redo
      if (isMod && e.key === "z" && e.shiftKey && canRedo) {
        e.preventDefault();
        onRedo();
        return;
      }

      // Ctrl/Cmd + Y = Redo (Windows convention)
      if (isMod && e.key === "y" && canRedo) {
        e.preventDefault();
        onRedo();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, canUndo, canRedo, onUndo, onRedo]);
}
