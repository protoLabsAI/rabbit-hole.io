# State Management Architecture

**Last Updated:** October 9, 2025  
**Status:** Y.Map Structure for Tabs (Migrated from Y.Array)

## Single Source of Truth: Yjs Document

All workspace state lives in the Yjs CRDT. This provides:

- Real-time synchronization across browser tabs
- Offline support with automatic sync when online
- Persistent storage in PostgreSQL via Hocuspocus
- Local caching via IndexedDB

### Yjs Document Structure

```typescript
ydoc.getMap("workspace")
  ├─ id: string
  ├─ name: string
  ├─ roomId: string
  ├─ activeTabId: string | null
  ├─ _usesYMap: boolean (migration flag)
  └─ _yMapMigrationDate: number (timestamp)

ydoc.getMap("tabs")  // ← Y.Map of Y.Maps (not Y.Array!)
  └─ { [tabId: string]: Y.Map<WorkspaceTab> }
      ├─ id: string (unique)
      ├─ name: string
      ├─ canvasType: "graph"|"map"|"timeline"|etc
      ├─ canvasData: any (canvas-specific state)
      └─ metadata: { createdAt, updatedAt, createdBy }

ydoc.getArray("tabOrder")  // ← Maintains display order
  └─ string[]  // Array of tab IDs

ydoc.getMap("users")
  └─ userId → UserPresence { activeTabId, lastSeen, ... }
```

### Why Y.Map vs Y.Array?

**Previous (Y.Array):**

- Tabs stored in array: `[{tab1}, {tab2}]`
- Updates required delete+insert pattern
- Observer timing issues with CRDT operations
- O(n) access time to find tab by ID

**Current (Y.Map):**

- Tabs stored in map: `{ "tab-1": Y.Map, "tab-2": Y.Map }`
- Direct property updates via `.set()`
- Reliable Y.Map deep observation
- O(1) access by tab ID
- Separate `tabOrder` array maintains display order

## Data Flow

### Read Path

1. Yjs document updates (local or remote change)
2. useEffect observers detect changes
3. React state updates (setWorkspace, setActiveTabId)
4. UI re-renders with new data

### Write Path

1. User action (click, type, drag node, etc.)
2. Component calls action (addTab, updateTabData, etc.)
3. Action wraps change in `ydoc.transact()`
4. Yjs propagates change to all observers
5. Read path triggers automatically

### Example

```typescript
// ❌ WRONG: Direct React state mutation
setWorkspace({ ...workspace, activeTabId: newId });

// ✅ CORRECT: Update Yjs, let it propagate
ydoc.transact(() => {
  yWorkspace.set("activeTabId", newId);
}, userId);
// React state updates automatically via observer
```

## Room ID Format (User-Scoped)

**Current:** `user:{userId}:workspace:{workspaceId}:latest`  
**Draft:** `user:{userId}:workspace:{workspaceId}:draft-{draftId}`

Previously used org-based format (`org:{orgId}:...`) but simplified per 2025-01-05 handoff.

## Canvas State Management

Each canvas type stores its state in `tab.data`:

### Graph Canvas

```typescript
{
  graphData: {
    nodes: Array<{ id, ...attributes }>,
    edges: Array<{ id, source, target, ...attributes }>
  },
  hiddenEntityTypes: string[],
  expandedNodes: string[],
  layoutMode: "force"|"circular"|etc
}
```

### Map Canvas

```typescript
{
  markers: Array<{
    name: string,
    coordinates: [lng, lat]
  }>,
  center: { lat, lng },
  zoom: number
}
```

## Preventing Tab Duplication

**Problem:** Non-memoized dependencies cause utility tabs to duplicate on canvas switch.

**Solution:** Apply memoization pattern consistently:

```typescript
// 1. Memoize derived data
const processedData = useMemo(() => {
  return transform(data);
}, [data]);

// 2. Memoize callbacks
const handleChange = useCallback((newData) => {
  onDataChange(newData);
}, [onDataChange]);

// 3. Memoize utility tabs
const utilityTabs = useMyUtilityTabs({
  data: processedData,  // Stable
  onChange: handleChange // Stable
});

// 4. Utility hook returns memoized array
export function useMyUtilityTabs({ data, onChange }) {
  return useMemo(() => [
    { id: "tab1", ... },
    { id: "tab2", ... }
  ], [data, onChange]); // Only depend on stable props
}
```

## Validation Layer

Data validation prevents corruption before persisting to Yjs:

```typescript
import { validateTabData } from "../lib/workspace-validation";

const updateTabData = (tabId: string, data: any) => {
  if (!validateTabData(tab.canvasType, data)) {
    console.error("Invalid tab data:", data);
    return; // Reject invalid data
  }

  // Persist to Yjs...
};
```

See `app/research/lib/workspace-validation.ts` for validation rules.

## Never Do This

- ❌ Mutate React state directly for workspace data
- ❌ Update both Yjs and React state (double write)
- ❌ Store canvas state outside `tab.data`
- ❌ Create utility tabs without useMemo
- ❌ Pass non-memoized callbacks to utility hooks
- ❌ Use complex objects as dependencies without memoization

## Debugging

### Inspect Yjs State (Browser Console)

```javascript
window.debugYjs = (ydoc) => {
  console.log("Workspace:", ydoc.getMap("workspace").toJSON());
  console.log("Tabs:", ydoc.getArray("tabs").toArray());
  console.log("Users:", ydoc.getMap("users").toJSON());
};
```

### Check IndexedDB Cache

1. Open DevTools → Application → IndexedDB
2. Find database starting with `yjs-`
3. Inspect cached Yjs documents

### Common Issues

**Tab duplication:** Check utility hook dependencies - likely non-memoized callback.  
**State not persisting:** Check if `ydoc.transact()` is being used.  
**Undo/redo broken:** Check if `userId` is passed to `transact()`.

## Related Documentation

**Architecture:**

- `REACT_FLOW_DATA_FLOW.md` - Complete sequence diagram of React Flow data persistence
- `WORKSPACE_MIGRATION.md` - Migration from IndexedDB to Yjs

**Technical Guides:**

- `components/workspace/canvas/TAB_DUPLICATION_FIX.md` - Preventing tab duplication with memoization
- `components/workspace/canvas/TAB_SWITCHING_FIX.md` - Leaflet cleanup patterns

## Related Files

- `app/research/hooks/useWorkspace.ts` - Main workspace state hook
- `app/research/hooks/useHocuspocusYjs.ts` - Yjs provider integration
- `app/research/hooks/useYjsUndo.ts` - Undo/redo manager
- `app/research/lib/workspace-validation.ts` - Data validation
- `packages/utils/src/validation/room-id.ts` - Room ID builder
- `app/graph-visualizer/model/adapters/reactflow.ts` - Graphology ↔ React Flow conversion

## Future Enhancements

- Re-enable collaboration features (follow mode, presence)
- Add org-level workspace sharing
- Implement draft/publish workflow
- Performance monitoring and optimization
