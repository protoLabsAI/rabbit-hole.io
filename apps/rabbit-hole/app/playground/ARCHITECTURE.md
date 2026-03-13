# Playground Architecture

## Overview

The Playground system provides a hub for testing and interacting with various AI services and tools. It features dynamic component loading with URL-based state management.

## Component Hierarchy

```
page.tsx (Server)
│
├─ Suspense
│  └─ PlaygroundClient (Client)
│     ├─ Auth Check (Clerk)
│     ├─ Tier Check (Basic tier minimum)
│     └─ PlaygroundHub
│        ├─ Navigation Sidebar
│        ├─ usePlaygroundPageState (URL state)
│        ├─ usePlaygroundLoader (component loading)
│        └─ Content Area
│           └─ Active Playground Component
│              (dynamically loaded from registry)
```

## Data Flow

### User Selects Playground

1. User clicks playground in sidebar
2. `handlePlaygroundClick(entry)` called
3. `setPlaygroundId(entry.id)` updates URL state
4. nuqs updates browser URL to `?playground=xxx`
5. Browser history stack updated
6. URL change detected by `useEffect`
7. `getPlaygroundById(id)` retrieves registry entry
8. `loadPlayground(entry)` triggers dynamic import
9. Component renders in content area

### Browser Navigation

1. User clicks back button
2. Browser URL changes (nuqs reads this)
3. `usePlaygroundPageState` hook re-runs
4. `playgroundId` state updates
5. `useEffect` in PlaygroundHub fires
6. Previous playground unloaded
7. New playground loaded and rendered

## Key Files

### State Management
- `hooks/usePlaygroundPageState.ts` - nuqs URL state for playground ID
- `hooks/usePlaygroundLoader.ts` - Dynamic loading and memory management
- `hooks/useDeepAgentThreadHistory.ts` - Deep agent specific state
- `hooks/useExtractionState.ts` - Extraction component state

### Components
- `PlaygroundClient.tsx` - Auth/tier checks, top-level client component
- `PlaygroundHub.tsx` - Main UI (sidebar + content area)
- `components/playground-hub/PlaygroundHub.tsx` - Hub implementation
- `components/playground-hub/registry/` - Playground registry and types

### Registry
- `components/playground-hub/registry/playground-registry.ts` - All playgrounds
- `components/playground-hub/registry/types.ts` - Type definitions
- `components/playground-hub/registry/index.ts` - Helper functions

## URL State Management

### Current Implementation

Uses **nuqs** (Next.js URL Query String manager) for client-side state:

```typescript
const { playgroundId, setPlaygroundId } = usePlaygroundPageState();
```

### URL Format

```
/playground                          → No playground selected (hub overview)
/playground?playground=youtube       → YouTube Processor
/playground?playground=transcription → Transcription
```

### Why nuqs?

✅ **Automatic history management** - Back/forward work out of box  
✅ **Type-safe** - Validated parsers for each URL param  
✅ **Shareable** - Copy URL to share specific playground state  
✅ **Persistent** - State survives page refresh  
✅ **Simple** - One hook for all URL state  

### Not Using nuqs For

❌ Server-side param access (not needed)  
❌ SSR rendering (page is minimal, PlaygroundHub handles all state)  
❌ SEO (playgrounds are interactive tools, not content pages)  

## Adding New Playgrounds

### 1. Create Component

```typescript
// components/MyPlayground.tsx
"use client";

export function MyPlayground() {
  return <div>My Playground</div>;
}
```

### 2. Register in Registry

```typescript
// components/playground-hub/registry/playground-registry.ts
{
  id: "my-playground",
  name: "My Playground",
  description: "Description...",
  category: "ai-services",
  icon: "bot",
  importFn: async () => {
    const { MyPlayground } = await import("../../MyPlayground");
    return { default: MyPlayground };
  },
  status: "active",
  tags: ["tag1", "tag2"],
  estimatedSize: 100,
}
```

### 3. No Changes Needed

- URL state automatically works
- Browser navigation automatic
- Sidebar navigation automatic

## Performance Considerations

### Memory Management
- Only one playground loaded at a time
- Previous playground unloaded before new one loads
- 100ms pause for React cleanup
- usePlaygroundLoader prevents race conditions

### Bundle Impact
- Each playground is dynamically imported
- Not included in initial bundle
- Loaded on-demand when selected
- Estimated sizes in registry for reference

### Query Client
- Isolated per playground hub instance
- Default settings: retry: false, staleTime: 60s
- Safe for nested QueryClientProviders

## Extension Points

### URL State Extensions
Add more query state parameters:

```typescript
// In usePlaygroundPageState.ts
const [quality, setQuality] = useQueryState("quality", parseAsString);
const [mode, setMode] = useQueryState("mode", parseAsString);
```

Then use in any component:
```typescript
const { playgroundId, quality } = usePlaygroundPageState();
```

### Category Filtering
Already supported by sidebar - just update registry categories.

### Search Persistence
Could add `?search=query` to persist sidebar search.

### Settings In URL
Could extend registry entries with default settings parameter.

## Testing

### Manual Testing
1. Navigate to `/playground`
2. Click different playgrounds
3. Verify URL updates
4. Test back/forward buttons
5. Copy URL and open in new tab
6. Verify same playground loads

### Automated Testing
- Test registry for duplicate IDs
- Test playground loader for memory leaks
- Test URL parsing with invalid inputs
- Test component loading timing

## Related Documentation

- [nuqs Integration Handoff](handoffs/2025-11-09_PLAYGROUND_NUQS_INTEGRATION.md)
- [nuqs Server/Client Pattern](.cursor/rules/nuqs-server-client-pattern.mdc)
- [Playground Registry Types](components/playground-hub/registry/types.ts)


