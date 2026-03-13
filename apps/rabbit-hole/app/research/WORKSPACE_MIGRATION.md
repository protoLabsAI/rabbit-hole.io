# Research Page Migration to Workspace Mode

**Date:** October 4, 2025  
**Status:** ✅ Migrated - IndexedDB Deprecated

## What Changed

### Before: Single Graph + IndexedDB

```
ResearchClient
  └── ResearchEditor (single graph)
      └── IndexedDB sessions
```

### After: Multi-Tab Workspace + Yjs

```
ResearchClientWorkspace
  └── WorkspaceContainer
      ├── TabBar (VSCode-style)
      └── Multiple canvas types
          └── Yjs persistence (PostgreSQL)
```

## Migration Summary

### ✅ Replaced

- `ResearchClient` → `ResearchClientWorkspace` (main research page)
- IndexedDB session storage → Yjs workspace persistence
- Single graph → Multi-tab workspace
- Manual session save/load → Automatic Yjs sync

### ✅ Retained

- ResearchEditor component (now wrapped in GraphCanvasIntegrated)
- Entity palette, filtering, expansion
- Context menus and interactions
- CopilotKit AI chat integration
- ResizableChatLayout

### ❌ Deprecated (No Longer Used)

- `app/research/lib/IndexedDBPersistence.ts` - Replaced by Yjs
- `app/research/lib/sessionStorage.ts` - Replaced by Yjs
- `app/research/components/SessionSelector.tsx` - Replaced by tabs
- Session save/load UI in ResearchControlPanel - Removed

## Features Gained

1. **Real-time collaboration** - Multiple users in same workspace
2. **Multi-canvas** - Graph, Map, Timeline views (extensible)
3. **Follow mode** - Follow other users' navigation
4. **Offline-first** - Yjs queues changes, syncs when online
5. **PostgreSQL persistence** - Automatic via Yjs server
6. **Tab management** - VSCode-style interface

## Breaking Changes

### Session Migration

**Old workflow:**

```typescript
// Save session
await researchGraph.saveToIndexedDB();

// Load session
await researchGraph.loadFromIndexedDB(sessionId);
```

**New workflow:**

```typescript
// Everything auto-saves via Yjs
// Just create tabs and they persist automatically

workspace.addTab("My Graph", "graph", graphData);
workspace.switchTab(tabId);
// ✅ Synced to PostgreSQL automatically
```

### URL Parameters

**Old:**

- `?sessionId=...` (IndexedDB)

**New:**

- `?workspaceId=...` (Yjs room)
- Workspace ID stored in localStorage

## File Changes

### Modified

- `app/research/page.tsx` - Points to ResearchClientWorkspace
- `app/research/components/workspace/canvas/CanvasRegistry.ts` - Uses GraphCanvasIntegrated

### Created

- `app/research/ResearchClientWorkspace.tsx` - New main client
- `app/research/components/workspace/canvas/GraphCanvasIntegrated.tsx` - ResearchEditor wrapper

### Deprecated (Keep for Reference)

- `app/research/ResearchClient.tsx` - Original implementation
- `app/research/lib/IndexedDBPersistence.ts` - Old persistence
- `app/research/lib/sessionStorage.ts` - Old session management
- `app/research/components/SessionSelector.tsx` - Old session UI

## Testing Checklist

- [ ] Open `/research` - Should load workspace mode
- [ ] Create Graph tab - Should show ResearchEditor
- [ ] Add nodes - Should work like original
- [ ] Refresh page - Workspace should restore
- [ ] Open in 2 browsers - Should sync tabs
- [ ] Test follow mode - User navigation sync

## Rollback Plan

If issues arise:

```typescript
// app/research/page.tsx
- import ResearchClientWorkspace from "./ResearchClientWorkspace";
+ import ResearchClient from "./ResearchClient";

export default async function ResearchPage() {
  return (
    <Suspense fallback={<ResearchPageSkeleton />}>
-     <ResearchClientWorkspace />
+     <ResearchClient />
    </Suspense>
  );
}
```

## Future Cleanup

After confirming workspace mode is stable:

1. Delete deprecated IndexedDB files
2. Remove session-related UI from ResearchControlPanel
3. Remove localStorage session tracking
4. Update documentation

## Data Migration

**IndexedDB sessions are NOT automatically migrated.**

Users will need to:

1. Load old session in original mode
2. Export as bundle
3. Import into new workspace tab

Alternatively, keep original `ResearchClient` as `/research/legacy` for manual migration.

---

**Status:** Research page now uses multi-tab workspace with Yjs persistence. IndexedDB deprecated but files retained for reference.
