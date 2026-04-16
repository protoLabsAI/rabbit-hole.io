import { Icon } from "@protolabsai/icon-system";

import { useIsEditing } from "@/context/store/useWorkspaceStore";
import { cn } from "@/lib/utils";

interface UndoRedoButtonsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function UndoRedoButtons({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: UndoRedoButtonsProps) {
  const isEditing = useIsEditing();

  if (!isEditing) return null;

  return (
    <div className="flex items-center gap-1 border-r pr-2 mr-2">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={cn(
          "p-2 rounded transition-colors",
          canUndo
            ? "hover:bg-muted text-foreground"
            : "opacity-30 cursor-not-allowed text-muted-foreground"
        )}
        title="Undo (Ctrl+Z)"
      >
        <Icon name="arrow-left" size={16} />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={cn(
          "p-2 rounded transition-colors",
          canRedo
            ? "hover:bg-muted text-foreground"
            : "opacity-30 cursor-not-allowed text-muted-foreground"
        )}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Icon name="arrow-right" size={16} />
      </button>
    </div>
  );
}
