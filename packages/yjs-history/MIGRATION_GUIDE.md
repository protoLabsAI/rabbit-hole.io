# Migration Guide: Integrating @proto/yjs-history

**Target:** Replace existing `useYjsUndo` with advanced versioning system  
**Impact:** Minimal breaking changes, enhanced features  
**Effort:** ~1-2 hours

---

## Step 1: Update useWorkspace Hook

**File:** `apps/rabbit-hole/app/research/hooks/useWorkspace.ts`

### Change Import

```diff
- import { useYjsUndo } from "./useYjsUndo";
+ import { useYjsHistory, IndexedDBVersionStorage } from "@proto/yjs-history";
```

### Replace Hook Usage

```diff
- const {
-   undo,
-   redo,
-   canUndo,
-   canRedo,
-   clear: clearUndoHistory,
- } = useYjsUndo({
-   ydoc,
-   userId: userId || null,
-   scope: yWorkspace,
-   enabled: options?.mode === "editing",
- });

+ const {
+   undo,
+   redo,
+   canUndo,
+   canRedo,
+   clear: clearUndoHistory,
+   createVersion,
+   listVersions,
+   restoreVersion,
+ } = useYjsHistory({
+   ydoc,
+   userId: userId || null,
+   scope: yWorkspace,
+   enabled: options?.mode === "editing",
+   maxUndoStackSize: 50,
+   captureTimeout: 500,
+   enableVersioning: true,
+   versionStorage: new IndexedDBVersionStorage(workspaceId),
+   autoVersionInterval: 50, // Auto-save every 50 operations
+ });
```

### Update Return Type

```diff
export interface UseWorkspaceReturn {
  // ... existing properties
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearUndoHistory: () => void;
+ 
+ // New versioning methods
+ saveVersion: (name: string, description?: string, tags?: string[]) => Promise<string>;
+ loadVersion: (versionId: string) => Promise<void>;
+ listVersions: () => Promise<VersionMetadata[]>;
}
```

### Update Return Statement

```diff
return {
  ydoc,
  workspace,
  activeTab: workspace?.tabs.find((t) => t.id === workspace.activeTabId) || null,
  users,
  userId: userId ?? null,
  ready,
  error,
  others,
  followMode,

  // Actions
  updateCanvasData,
  switchTab,
  addTab,
  closeTab,
  reorderTabs,
  toggleFollowMode,
  updateCursor,

  // Undo/Redo (editing mode only)
  undo,
  redo,
  canUndo,
  canRedo,
  clearUndoHistory,
+ 
+ // Versioning
+ saveVersion: createVersion,
+ loadVersion: restoreVersion,
+ listVersions,
};
```

---

## Step 2: Update GraphCanvasIntegrated

**File:** `apps/rabbit-hole/app/research/components/workspace/canvas/GraphCanvasIntegrated.tsx`

### Add Version Button to Toolbar

```typescript
// Add to HorizontalToolbar canvasButtonsSlot
<GraphToolbarButtons
  currentLayout={currentLayout}
  onLayoutChange={handleLayoutChange}
  onImport={handleImport}
  onExport={handleExport}
  filterPopover={filterPopover}
  freehandEnabled={freehandEnabled}
  onToggleFreehand={handleToggleFreehand}
  canUseFreehand={canUseFreehand}
  activeDrawingTool={activeDrawingTool}
  // NEW: Version management
  onSaveVersion={handleSaveVersion}
  onVersionBrowserOpen={handleVersionBrowserOpen}
/>
```

### Add Version Handlers

```typescript
const handleSaveVersion = useCallback(async () => {
  if (!saveVersion) return;
  
  try {
    const versionId = await saveVersion(
      "Manual Save",
      "User-created checkpoint",
      ["manual"]
    );
    
    toast({
      title: "Version Saved",
      description: "Checkpoint created successfully",
    });
    
    vlog.log("📸 Version saved:", versionId);
  } catch (error) {
    toast({
      title: "Save Failed",
      description: error instanceof Error ? error.message : "Unknown error",
      variant: "destructive",
    });
  }
}, [saveVersion, toast]);

const handleVersionBrowserOpen = useCallback(async () => {
  if (!listVersions) return;
  
  const versions = await listVersions();
  // Show version browser dialog (implement UI component)
  console.log("Available versions:", versions);
}, [listVersions]);
```

### Add Props

```diff
interface GraphCanvasIntegratedProps {
  // ... existing props
  onUndo?: () => void;
  onRedo?: () => void;
+ 
+ // Versioning
+ saveVersion?: (name: string, description?: string, tags?: string[]) => Promise<string>;
+ loadVersion?: (versionId: string) => Promise<void>;
+ listVersions?: () => Promise<VersionMetadata[]>;
}
```

---

## Step 3: Update GraphToolbarButtons

**File:** `apps/rabbit-hole/app/research/components/workspace/toolbar/GraphToolbarButtons.tsx`

### Add Version Buttons

```tsx
import { Icon } from "@proto/icon-system";

interface GraphToolbarButtonsProps {
  // ... existing props
  onSaveVersion?: () => void;
  onVersionBrowserOpen?: () => void;
}

export function GraphToolbarButtons({
  currentLayout,
  onLayoutChange,
  onImport,
  onExport,
  filterPopover,
  freehandEnabled,
  onToggleFreehand,
  canUseFreehand,
  activeDrawingTool,
  onSaveVersion,
  onVersionBrowserOpen,
}: GraphToolbarButtonsProps) {
  return (
    <div className="flex items-center gap-1">
      {/* Existing buttons... */}
      
      {/* Version buttons */}
      {onSaveVersion && (
        <button
          onClick={onSaveVersion}
          className="p-2 rounded-md hover:bg-muted"
          title="Save Version"
        >
          <Icon name="bookmark" size={16} />
        </button>
      )}
      
      {onVersionBrowserOpen && (
        <button
          onClick={onVersionBrowserOpen}
          className="p-2 rounded-md hover:bg-muted"
          title="Browse Versions"
        >
          <Icon name="history" size={16} />
        </button>
      )}
    </div>
  );
}
```

---

## Step 4: Create Version Browser Component (Optional)

**File:** `apps/rabbit-hole/app/research/components/VersionBrowserDialog.tsx`

```tsx
import { useState, useEffect } from "react";
import type { VersionMetadata } from "@proto/yjs-history";
import { groupVersionsByDate, formatVersionTime } from "@proto/yjs-history";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@proto/ui/atoms";
import { Button } from "@proto/ui/atoms";

interface VersionBrowserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadVersion: (versionId: string) => Promise<void>;
  listVersions: () => Promise<VersionMetadata[]>;
}

export function VersionBrowserDialog({
  isOpen,
  onClose,
  onLoadVersion,
  listVersions,
}: VersionBrowserDialogProps) {
  const [versions, setVersions] = useState<VersionMetadata[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadVersions = async () => {
      setLoading(true);
      const list = await listVersions();
      setVersions(list);
      setLoading(false);
    };

    loadVersions();
  }, [isOpen, listVersions]);

  const groups = groupVersionsByDate(versions);

  const handleRestore = async (versionId: string) => {
    if (confirm("Restore this version? Current changes will be lost.")) {
      await onLoadVersion(versionId);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div>Loading versions...</div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.date}>
                <h3 className="font-semibold mb-2">{group.label}</h3>
                <div className="space-y-2">
                  {group.versions.map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div>
                        <div className="font-medium">{version.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatVersionTime(version.timestamp)}
                        </div>
                        {version.description && (
                          <div className="text-sm text-muted-foreground">
                            {version.description}
                          </div>
                        )}
                        {version.tags && (
                          <div className="flex gap-1 mt-1">
                            {version.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-muted px-2 py-1 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => handleRestore(version.id)}
                        variant="outline"
                        size="sm"
                      >
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {versions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No versions saved yet
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## Step 5: Update ResearchPage

**File:** `apps/rabbit-hole/app/research/ResearchPage.tsx`

### Pass Version Props to Canvas

```tsx
<GraphCanvasIntegrated
  data={activeTab?.canvasData || { graphData: null }}
  onDataChange={updateCanvasData}
  canUndo={canUndo}
  canRedo={canRedo}
  onUndo={undo}
  onRedo={redo}
  ydoc={ydoc}
  userId={userId || undefined}
  userTier={userTier}
  canUseAIChat={canUseAIChat}
  // NEW: Version management
  saveVersion={saveVersion}
  loadVersion={loadVersion}
  listVersions={listVersions}
  // ... other props
/>
```

---

## Step 6: Add TypeScript Types

**File:** Add to imports in files that use versions

```typescript
import type { VersionMetadata } from "@proto/yjs-history";
```

---

## Step 7: Optional - Deprecate Old Hook

**File:** `apps/rabbit-hole/app/research/hooks/useYjsUndo.ts`

Add deprecation notice:

```typescript
/**
 * @deprecated Use @proto/yjs-history instead
 * 
 * @example
 * import { useYjsHistory } from "@proto/yjs-history";
 * 
 * const { undo, redo, canUndo, canRedo } = useYjsHistory({
 *   ydoc,
 *   userId,
 *   scope: yWorkspace,
 * });
 */
export function useYjsUndo(options: UseYjsUndoOptions) {
  // ... existing implementation
}
```

---

## Testing Checklist

### Basic Undo/Redo
- [ ] Undo button disabled when no history
- [ ] Undo reverts last action
- [ ] Redo button enabled after undo
- [ ] Redo re-applies undone action
- [ ] Keyboard shortcuts work (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z)

### Versioning
- [ ] Save version button creates checkpoint
- [ ] Version browser shows saved versions
- [ ] Versions grouped by date correctly
- [ ] Restore version loads previous state
- [ ] Auto-versioning creates snapshots every 50 ops
- [ ] Versions persist across page reload

### Edge Cases
- [ ] Works in local mode (Free tier)
- [ ] Works in HocusPocus mode (Pro+ tier)
- [ ] Multiple users don't interfere with each other's undo
- [ ] Version storage doesn't exceed quota
- [ ] Undo stack respects size limit (50 ops)

---

## Rollback Plan

If issues arise, you can quickly rollback:

1. Revert changes to `useWorkspace.ts`
2. Remove version buttons from toolbar
3. Keep `useYjsUndo` as the active hook
4. Package can remain installed (no side effects)

---

## Performance Impact

- **Undo/Redo**: No change (uses same Y.UndoManager)
- **Versioning**: ~10KB-1MB per snapshot (depends on graph size)
- **Storage**: IndexedDB (browser quota, typically 10MB+)
- **Memory**: Minimal increase (~50KB for hook logic)

---

## Support

For issues or questions:
- See `/packages/yjs-history/README.md`
- See `/docs/developer/features/yjs-history-system.md`
- Check implementation: `/packages/yjs-history/IMPLEMENTATION_SUMMARY.md`

