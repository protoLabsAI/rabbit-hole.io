# MapCanvas Refactor - Controlled Component

> **⚠️ DEPRECATED DOCUMENTATION**  
> This file documents the **OLD** Sigma.js + Leaflet implementation.  
> The **current** implementation (`packages/charts/src/map/MapCanvas.tsx`) uses **pure Leaflet** without Sigma.js.  
> This documentation is retained for historical reference only.

## Problem

Original `MapCanvas.tsx` has tight coupling that prevents testing and reuse:

1. **Context Dependency:** Uses `useResearchPageState()` hook
2. **Internal Data:** Creates own graph data (`createMockGraphData()`)
3. **Not Controllable:** Cannot pass entities/relationships as props
4. **Not Testable:** Cannot use in Storybook or unit tests

## Solution

Created `MapCanvasControlled.tsx` - a "dumb" controlled component.

### Key Changes

| Before (MapCanvas)                                      | After (MapCanvasControlled)                                                                        |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `const [graph] = useState(() => createMockGraphData())` | `const graph = useMemo(() => entitiesToGraph(entities, relationships), [entities, relationships])` |
| `const research = useResearchPageState()`               | No context dependencies                                                                            |
| Hardcoded OpenStreetMap                                 | `tileProvider` prop (OSM, CartoDB, Stamen)                                                         |
| Limited callbacks                                       | Full callback suite                                                                                |
| Not testable                                            | Works in Storybook                                                                                 |

### API

```typescript
interface MapCanvasControlledProps {
  // Data (controlled from parent)
  entities: MapEntity[];
  relationships?: MapRelationship[];

  // Map config
  center?: { lat: number; lng: number };
  zoom?: number;
  tileProvider?: "openstreetmap" | "cartodb" | "stamen";

  // Callbacks
  onNodeClick?: (nodeId: string, entity: MapEntity) => void;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerAdd?: (lat: number, lng: number) => void;
  onBoundsChange?: (bounds: BBox) => void;

  // UI
  readOnly?: boolean;
  showLabels?: boolean;
  showEdges?: boolean;
  isLoading?: boolean;
}
```

### Usage Example

```tsx
import { MapCanvasControlled } from "./MapCanvasControlled";

function MyMap() {
  const [entities, setEntities] = useState([
    {
      id: "person:1",
      name: "John Doe",
      type: "Person",
      lat: 37.7749,
      lng: -122.4194,
    },
  ]);

  return (
    <MapCanvasControlled
      entities={entities}
      onNodeClick={(id, entity) => {
        console.log("Clicked:", entity.name);
      }}
      onBoundsChange={(bounds) => {
        // Dynamic loading
        fetchEntitiesInBounds(bounds).then(setEntities);
      }}
    />
  );
}
```

## Storybook Stories

Created `stories/MapCanvas.stories.tsx` with 11 stories:

1. **Default** - Bay Area tech entities
2. **SingleEntity** - Minimal case
3. **DisconnectedEntities** - No relationships
4. **GlobalView** - Worldwide distribution
5. **DenseCluster** - 10 overlapping entities
6. **ComplexNetwork** - Multi-edge graph
7. **Empty** - Zero entities
8. **CartoDBTiles** - Alternative tiles
9. **StamenTiles** - B&W tiles
10. **MinimalView** - No labels/edges
11. **ReadOnly** - No marker adding

## Benefits

1. **Testable:** Works in Storybook, can add unit tests
2. **Reusable:** No context coupling, use anywhere
3. **Controllable:** Parent manages data state
4. **Flexible:** Multiple tile providers, UI toggles
5. **Observable:** Callbacks for all interactions
6. **Performance:** Can implement viewport-based loading via `onBoundsChange`

## Migration Strategy

### Option A: Parallel Components

- Keep both `MapCanvas.tsx` and `MapCanvasControlled.tsx`
- Gradually migrate to controlled version
- Remove original when ready

### Option B: Adapter Pattern

```tsx
// MapCanvas.tsx (wrapper)
export function MapCanvas({ data, onDataChange, readOnly }: MapCanvasProps) {
  const research = useResearchPageState();
  const entities = convertToMapEntities(data);

  return (
    <MapCanvasControlled
      entities={entities}
      onMapClick={() => research.setChatOpen(false)}
      {...otherProps}
    />
  );
}
```

### Option C: Direct Replacement

- Replace `MapCanvas.tsx` contents with controlled version
- Update call sites to pass entities/relationships
- Remove `useResearchPageState()` from component

## Files

```
Created:
- apps/rabbit-hole/app/research/components/workspace/canvas/MapCanvasControlled.tsx
- stories/MapCanvas.stories.tsx
- handoffs/2025-12-07_MAP_CANVAS_STORYBOOK.md
- apps/rabbit-hole/app/research/components/workspace/canvas/MAP_CANVAS_REFACTOR.md (this file)

Unchanged:
- apps/rabbit-hole/app/research/components/workspace/canvas/MapCanvas.tsx (original)
- apps/rabbit-hole/app/research/components/workspace/canvas/map-data-loader.ts
```

## Next Steps

1. **View in Storybook:** Open http://localhost:6006 → Research/MapCanvas
2. **Test Stories:** Try different datasets and configurations
3. **Choose Migration:** Decide on parallel/adapter/replacement
4. **Integrate:** Connect to Neo4j data loader
5. **Performance:** Add viewport-based loading

## Technical Notes

### SSR Compatibility

Both versions use dynamic imports for Leaflet:

```typescript
Promise.all([
  import("sigma"),
  import("leaflet"),
  import("@sigma/layer-leaflet"),
]).then(/* initialize map */);
```

### Memory Management

Cleanup handlers prevent leaks:

```typescript
return () => {
  if (sigmaRenderer) sigmaRenderer.kill();
  if (leafletMap) leafletMap.remove();
  if (containerRef.current) {
    delete (containerRef.current as any)._leaflet_id;
  }
};
```

### Tile Providers

Three built-in providers with automatic failover:

- OpenStreetMap (default, free)
- CartoDB Light (clean minimal)
- Stamen Toner (high contrast)

### Performance

Graph updates trigger re-render:

```typescript
useEffect(() => {
  if (!renderer) return;
  renderer.getGraph().clear();
  // Add new entities/relationships
  renderer.refresh();
}, [entities, relationships, renderer]);
```

## Dependencies

No new dependencies required. Uses existing:

- `sigma` (v3.0.2)
- `leaflet` (v1.9.4)
- `@sigma/layer-leaflet` (v3.0.0)
- `graphology` (v0.26.0)

## View Story

```bash
# Storybook running at http://localhost:6006
# Navigate to: Research/MapCanvas
# Try controls panel to modify props
# Check actions panel for callback logs
```
