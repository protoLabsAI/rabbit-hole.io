# @proto/yjs-history - Quick Start

**Version:** 1.0.0  
**Status:** ✅ Production Ready

---

## Installation

Already installed as workspace package. Import and use:

```typescript
import { useYjsHistory, IndexedDBVersionStorage } from "@proto/yjs-history";
```

---

## 30-Second Integration

### Replace useYjsUndo

```diff
- import { useYjsUndo } from "@/hooks/useYjsUndo";
+ import { useYjsHistory } from "@proto/yjs-history";

- const { undo, redo, canUndo, canRedo } = useYjsUndo({
+ const { undo, redo, canUndo, canRedo } = useYjsHistory({
    ydoc,
    userId,
    scope: yWorkspace,
  });
```

Done! Undo/redo works exactly the same.

---

## Add Versioning (2 minutes)

### 1. Add Storage

```typescript
import { useYjsHistory, IndexedDBVersionStorage } from "@proto/yjs-history";

const {
  undo,
  redo,
  canUndo,
  canRedo,
  createVersion,
  listVersions,
  restoreVersion,
} = useYjsHistory({
  ydoc,
  userId,
  scope: yWorkspace,
  enableVersioning: true,
  versionStorage: new IndexedDBVersionStorage(workspaceId),
});
```

### 2. Add Save Button

```tsx
<button onClick={() => createVersion("Save Point")}>
  Save Version
</button>
```

### 3. Add Browser UI

```tsx
const versions = await listVersions();
versions.map(v => (
  <div key={v.id} onClick={() => restoreVersion(v.id)}>
    {v.name} - {formatVersionTime(v.timestamp)}
  </div>
));
```

---

## React Flow Integration

```typescript
import { useReactFlowYjsHistory } from "@proto/yjs-history";

const { takeSnapshot, undo, redo } = useReactFlowYjsHistory({
  ydoc,
  userId,
  scope: ydoc.getMap("canvasData"),
  enableShortcuts: true, // Cmd/Ctrl+Z
});

// Call before actions you want undoable
const onNodeDragStart = () => takeSnapshot();
const onNodesDelete = () => takeSnapshot();
```

---

## Auto-versioning

```typescript
useYjsHistory({
  ydoc,
  userId,
  autoVersionInterval: 50, // Auto-save every 50 operations
});
```

---

## Key Concepts

### Transaction Origins (Required)

```typescript
// ✅ Tracked by undo
ydoc.transact(() => {
  yMap.set("key", "value");
}, userId); // ← Transaction origin

// ❌ NOT tracked
yMap.set("key", "value");
```

### Undo vs Versions

| Feature | Undo/Redo | Versions |
|---------|-----------|----------|
| **Lifespan** | Session only | Persistent |
| **Size** | 50 ops | Unlimited |
| **Purpose** | Quick fixes | Checkpoints |

---

## Common Use Cases

### 1. Basic Undo/Redo
```typescript
const { undo, redo } = useYjsHistory({ ydoc, userId });
```

### 2. Workspace with Versioning
```typescript
const {
  undo, redo,
  createVersion,
  restoreVersion
} = useYjsHistory({
  ydoc,
  userId,
  scope: yWorkspace,
  enableVersioning: true,
  versionStorage: new IndexedDBVersionStorage(workspaceId),
});
```

### 3. Graph Editor with Auto-save
```typescript
const history = useYjsHistory({
  ydoc,
  userId,
  scope: ydoc.getMap("canvasData"),
  autoVersionInterval: 50,
  versionStorage: new IndexedDBVersionStorage(workspaceId),
});
```

---

## Utilities

```typescript
import {
  groupVersionsByDate,
  filterVersionsByTag,
  searchVersions,
  formatVersionTime,
} from "@proto/yjs-history";

const groups = groupVersionsByDate(versions);
const autoSaves = filterVersionsByTag(versions, "auto");
const results = searchVersions(versions, "milestone");
const timeAgo = formatVersionTime(timestamp); // "2 hours ago"
```

---

## Troubleshooting

### Undo Not Working?
Check transaction origins:
```typescript
ydoc.transact(() => { ... }, userId); // ← Must include userId
```

### Storage Full?
Clean old versions:
```typescript
const versions = await listVersions();
const old = versions.slice(50);
for (const v of old) await deleteVersion(v.id);
```

---

## Full Documentation

- **Package README**: `/packages/yjs-history/README.md`
- **Migration Guide**: `/packages/yjs-history/MIGRATION_GUIDE.md`
- **Implementation Details**: `/packages/yjs-history/IMPLEMENTATION_SUMMARY.md`
- **Developer Docs**: `/docs/developer/features/yjs-history-system.md`

---

## API at a Glance

```typescript
const {
  // Undo/Redo
  undo: () => void,
  redo: () => void,
  canUndo: boolean,
  canRedo: boolean,
  clear: () => void,
  undoStackSize: number,
  redoStackSize: number,
  
  // Versioning
  createVersion: (name, description?, tags?) => Promise<string>,
  listVersions: () => Promise<VersionMetadata[]>,
  restoreVersion: (versionId) => Promise<void>,
  deleteVersion: (versionId) => Promise<void>,
  
  // Advanced
  undoManager: Y.UndoManager | null,
} = useYjsHistory(options);
```

---

**Ready to use!** Start with basic undo/redo, add versioning when needed.

