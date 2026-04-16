# Integration Checklist: @protolabsai/yjs-history

**Quick reference for implementing version management in GraphCanvasIntegrated**

---

## Pre-flight Check

- [ ] Package is built: `cd packages/yjs-history && pnpm run build`
- [ ] Tests pass: `pnpm run test` (77/80 passing)
- [ ] Workspace root has latest dependencies: `pnpm install`

---

## Implementation Checklist

### 1️⃣ Update useWorkspace Hook

**File:** `apps/rabbit-hole/app/research/hooks/useWorkspace.ts`

- [ ] Import `useYjsHistory` and `IndexedDBVersionStorage` from `@protolabsai/yjs-history`
- [ ] Import `VersionMetadata` type
- [ ] Replace `useYjsUndo` call with `useYjsHistory` (lines 119-132)
- [ ] Add `enableVersioning: true` option
- [ ] Add `versionStorage: new IndexedDBVersionStorage(workspaceId)` option
- [ ] Add `autoVersionInterval: 50` option (optional)
- [ ] Destructure new methods: `createVersion`, `listVersions`, `restoreVersion`
- [ ] Add new methods to `UseWorkspaceReturn` interface (lines 50-72)
- [ ] Add new methods to return statement (lines 491-519)

### 2️⃣ Update GraphCanvasIntegrated Props

**File:** `apps/rabbit-hole/app/research/components/workspace/canvas/GraphCanvasIntegrated.tsx`

- [ ] Import `VersionMetadata` type from `@protolabsai/yjs-history`
- [ ] Add props to interface (lines 59-99):
  - `saveVersion?: (name: string, description?: string, tags?: string[]) => Promise<string>`
  - `loadVersion?: (versionId: string) => Promise<void>`
  - `listVersions?: () => Promise<VersionMetadata[]>`
- [ ] Add props to component signature (lines 101-127)
- [ ] Add state: `showVersionBrowser` (after line 174)

### 3️⃣ Add Version Handlers

**File:** `apps/rabbit-hole/app/research/components/workspace/canvas/GraphCanvasIntegrated.tsx`

- [ ] Add `handleSaveVersion` callback (after line 235)
- [ ] Add `handleOpenVersionBrowser` callback
- [ ] Add `handleRestoreVersion` callback

### 4️⃣ Update GraphToolbarButtons

**File:** `apps/rabbit-hole/app/research/components/workspace/toolbar/GraphToolbarButtons.tsx`

- [ ] Add props: `onSaveVersion?`, `onVersionBrowserOpen?`
- [ ] Add bookmark button (save version)
- [ ] Add history button (browse versions)
- [ ] Pass handlers in GraphCanvasIntegrated (line 1039)

### 5️⃣ Create Version Browser Dialog

**File:** `apps/rabbit-hole/app/research/components/VersionBrowserDialog.tsx`

- [ ] Create new file with dialog component
- [ ] Import utilities from `@protolabsai/yjs-history`
- [ ] Use `groupVersionsByDate` and `formatVersionTime`
- [ ] Add restore confirmation dialog
- [ ] Import in GraphCanvasIntegrated
- [ ] Render conditionally (before line 1156)

### 6️⃣ Update ResearchPage

**File:** `apps/rabbit-hole/app/research/ResearchPage.tsx`

- [ ] Pass `saveVersion` prop to GraphCanvasIntegrated
- [ ] Pass `loadVersion` prop
- [ ] Pass `listVersions` prop

---

## Testing Checklist

### Undo/Redo (No Regression)

- [ ] Undo button works
- [ ] Redo button works
- [ ] Keyboard shortcuts work (Cmd/Ctrl+Z)
- [ ] Only own changes are undoable
- [ ] Stack limit enforced (50 operations)

### Version Management

- [ ] Save version creates checkpoint
- [ ] Version browser lists versions
- [ ] Versions sorted newest first
- [ ] Restore version works
- [ ] Auto-versions appear
- [ ] Tags display correctly

### Persistence

- [ ] Versions persist across page reload
- [ ] Works in local mode (Free tier)
- [ ] Works in HocusPocus mode (Pro tier)
- [ ] IndexedDB stores versions correctly

---

## Code Snippets

### Import Statement

```typescript
import {
  useYjsHistory,
  IndexedDBVersionStorage,
  type VersionMetadata,
} from "@protolabsai/yjs-history";
```

### Hook Usage

```typescript
const {
  undo,
  redo,
  canUndo,
  canRedo,
  clear: clearUndoHistory,
  createVersion,
  listVersions,
  restoreVersion,
} = useYjsHistory({
  ydoc,
  userId: userId || null,
  scope: yWorkspace,
  enabled: options?.mode === "editing",
  maxUndoStackSize: 50,
  captureTimeout: 500,
  enableVersioning: true,
  versionStorage: new IndexedDBVersionStorage(workspaceId),
  autoVersionInterval: 50,
});
```

### Version Save Handler

```typescript
const handleSaveVersion = useCallback(async () => {
  if (!saveVersion) return;

  try {
    const timestamp = new Date().toLocaleTimeString();
    await saveVersion(`Manual Save ${timestamp}`, "User checkpoint", [
      "manual",
    ]);
    toast({ title: "Version Saved" });
  } catch (error) {
    toast({ title: "Save Failed", variant: "destructive" });
  }
}, [saveVersion, toast]);
```

---

## Quick Validation

After each step, verify:

```bash
# 1. Type check passes
pnpm run type-check

# 2. No build errors
pnpm run build

# 3. Dev server runs
pnpm run dev

# 4. No console errors when opening /research
# 5. Undo/redo buttons appear and work
```

---

## Time Estimates

- **Phase 1** (useWorkspace): 30 min
- **Phase 2** (Props): 15 min
- **Phase 3** (Handlers): 30 min
- **Phase 4** (Toolbar): 20 min
- **Phase 5** (Dialog): 45 min
- **Phase 6** (ResearchPage): 10 min
- **Testing**: 30 min

**Total:** ~3 hours

---

## Done Criteria

✅ Ready to ship when:

- All checkboxes above are checked
- Tests pass: `cd packages/yjs-history && pnpm run test`
- Manual testing complete
- No console errors
- Undo/redo works as before
- Version save/restore works

---

**See full handoff:** `/HANDOFF_YJS_HISTORY_INTEGRATION.md`



