# Map Canvas - Geographic Knowledge Graph Visualization

Geographic visualization of knowledge graph entities using **Sigma.js** + **Leaflet** integration.

## Overview

MapCanvas renders entities with geographic coordinates (latitude/longitude) on an interactive map. It uses:

- **Sigma.js** - High-performance graph rendering
- **Leaflet** - Interactive maps with OpenStreetMap tiles
- **Graphology** - Graph data structure
- **@sigma/layer-leaflet** - Integration layer between Sigma and Leaflet

**SSR-Safe:** Uses dynamic imports to load Leaflet only on the client side, ensuring compatibility with Next.js 15 server-side rendering.

## Current Implementation

### Mock Data

Currently uses mock data with sample entities (Elon Musk, Tesla, SpaceX, etc.) centered on San Francisco Bay Area.

```typescript
// Located in MapCanvas.tsx
function createMockGraphData(): Graph {
  // Creates sample entities with lat/lng coordinates
  // Elon Musk (SF), Tesla (Palo Alto), SpaceX (Hawthorne), etc.
}
```

### Features

1. **Interactive Map** - Pan, zoom, and explore geographic entities
2. **Entity Nodes** - Colored by entity type (Person, Organization, etc.)
3. **Relationships** - Graph edges show connections between entities
4. **Click Handlers**:
   - Click node → Show entity details
   - Click map → Create marker at coordinates
5. **Entity Styling** - Uses `getEntityColor()` from `@protolabsai/utils/atlas`

## Connecting to Neo4j

To use real geographic data from Neo4j knowledge graph:

### 1. Update MapCanvas Component

Replace mock data with Neo4j loader:

```typescript
import { loadGeographicGraph } from "./map-data-loader";

export function MapCanvas({ data, onDataChange, readOnly }: MapCanvasProps) {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const geographicGraph = await loadGeographicGraph({
          bounds: {
            north: 50,
            south: 25,
            east: -65,
            west: -125,
          },
          limit: 200,
        });
        setGraph(geographicGraph);
      } catch (error) {
        console.error("Failed to load geographic data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Rest of component...
}
```

### 2. Neo4j Data Requirements

Entities must have geospatial properties:

```cypher
// Example entity with geographic data
CREATE (p:Person {
  uid: 'person:elon_musk',
  name: 'Elon Musk',
  type: 'Person',
  latitude: 37.7749,    // Required
  longitude: -122.4194, // Required
  altitude: 15.5,       // Optional
  address: 'San Francisco, CA', // Optional
  tags: ['entrepreneur', 'ceo']
})
```

### 3. Adding Geographic Data to Existing Entities

Use the universal geospatial schema (already supported):

```cypher
// Update existing entity with coordinates
MATCH (e {uid: 'person:elon_musk'})
SET
  e.latitude = 37.7749,
  e.longitude = -122.4194,
  e.address = 'San Francisco, CA',
  e.coordinate_accuracy = 100,  // meters
  e.coordinates_verified = true
```

### 4. Query Geographic Entities

The `map-data-loader.ts` utility provides:

```typescript
// Fetch entities with geographic data
const { entities, relationships } = await fetchGeographicEntities({
  bounds: { north: 50, south: 25, east: -65, west: -125 },
  limit: 100,
});

// Convert to Graphology graph
const graph = entitiesToGraph(entities, relationships);
```

## API Integration

### Create API Route

For client-side loading, create an API route:

```typescript
// app/api/geographic-entities/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchGeographicEntities } from "@/app/research/components/workspace/canvas/map-data-loader";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const bounds = {
    north: parseFloat(searchParams.get("north") || "90"),
    south: parseFloat(searchParams.get("south") || "-90"),
    east: parseFloat(searchParams.get("east") || "180"),
    west: parseFloat(searchParams.get("west") || "-180"),
  };

  const limit = parseInt(searchParams.get("limit") || "100");

  try {
    const data = await fetchGeographicEntities({ bounds, limit });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch geographic entities" },
      { status: 500 }
    );
  }
}
```

### Client-Side Fetching

```typescript
async function fetchEntities() {
  const response = await fetch(
    "/api/geographic-entities?north=50&south=25&east=-65&west=-125&limit=200"
  );
  const { entities, relationships } = await response.json();
  const graph = entitiesToGraph(entities, relationships);
  setGraph(graph);
}
```

## Geographic Data Schema

All entities support universal geospatial properties (defined in `@protolabsai/types`):

```typescript
interface GeographicEntity {
  uid: string;
  name: string;
  type: EntityType;

  // Core geographic properties
  latitude: number; // WGS84 latitude (-90 to 90)
  longitude: number; // WGS84 longitude (-180 to 180)
  altitude?: number; // meters above sea level

  // Optional metadata
  address?: string; // Formatted address
  coordinate_accuracy?: number; // horizontal accuracy (meters)
  altitude_accuracy?: number; // vertical accuracy (meters)
  geometry_type?: "point" | "linestring" | "polygon" | "multipoint";
  coordinates_verified?: boolean;
  timezone?: string;

  // Standard entity properties
  tags?: string[];
  properties?: Record<string, any>;
}
```

## Supported Entity Types

All entity types from `@protolabsai/types` can have geographic coordinates:

- **Person** - Home location, birth place, current residence
- **Organization** - Headquarters, offices, facilities
- **Event** - Event location, venue coordinates
- **Location** - Geographic places, landmarks, regions
- **Platform** - Server locations, data centers
- **Content** - Publication location, filming location
- **Movement** - Origin location, headquarters

## Advanced Features

### Dynamic Viewport Loading

Load entities based on current map viewport:

```typescript
map.on("moveend", () => {
  const bounds = map.getBounds();
  loadGeographicGraph({
    bounds: {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    },
    limit: 500,
  }).then(setGraph);
});
```

### Custom Map Tiles

Replace OpenStreetMap with custom tiles:

```typescript
// Satellite imagery
L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
).addTo(map);

// Dark theme
L.tileLayer(
  "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
).addTo(map);
```

### Entity Clustering

For dense geographic areas, add clustering:

```typescript
import "leaflet.markercluster";

const markers = L.markerClusterGroup();
entities.forEach((entity) => {
  const marker = L.marker([entity.latitude, entity.longitude]).bindPopup(
    entity.name
  );
  markers.addLayer(marker);
});
map.addLayer(markers);
```

## Testing

Test with geographic entities in Neo4j:

```bash
# 1. Add geographic data to entities
curl -X POST http://localhost:3000/api/atlas-crud \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update-entity",
    "data": {
      "uid": "person:elon_musk",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "address": "San Francisco, CA"
    }
  }'

# 2. Fetch geographic entities
curl http://localhost:3000/api/geographic-entities?limit=10

# 3. View in MapCanvas
open http://localhost:3000/research?canvas=map
```

## Performance Optimization

For large datasets:

1. **Viewport Culling** - Only render entities in current view
2. **Level of Detail** - Hide labels when zoomed out
3. **Entity Limits** - Paginate with viewport-based queries
4. **Clustering** - Group nearby entities
5. **Lazy Loading** - Load relationships on demand

## Troubleshooting

### Sigma.js "type" Attribute Conflict

**Error:** `Sigma: could not find a suitable program for node type "Person"!`

**Cause:** Sigma.js uses the `type` node attribute to determine which renderer to use. Setting `type: "Person"` conflicts with Sigma's internal type system.

**Solution:** Use `entityType` instead of `type` for entity classification:

```typescript
// ❌ Causes error
graph.addNode(id, { type: "Person", label: "John Doe" });

// ✅ Works correctly
graph.addNode(id, { entityType: "Person", label: "John Doe" });
```

**Note:** Both `MapCanvas.tsx` and `map-data-loader.ts` use `entityType` to avoid this conflict.

### SSR Errors with Leaflet

**Error:** `window is not defined`

**Solution:** Leaflet is dynamically imported on the client side only. No additional configuration needed.

### Tab Switching Errors

**Error:** `Map container is being reused by another instance`

**Cause:** Rapid unmount/remount during tab switching causes Leaflet cleanup race conditions.

**Solution:** Implemented automatic lifecycle tracking and proper container cleanup:

- Mount tracking prevents re-initialization
- Container ID cleanup allows reuse
- Event listener cleanup prevents memory leaks
- Error handling prevents crashes

**No user action required** - automatically handled by the component.

See `SSR_FIX.md` for complete technical details.

## File Structure

```
app/research/components/workspace/canvas/
├── MapCanvas.tsx              # Main component (Sigma + Leaflet)
├── map-data-loader.ts         # Neo4j data fetching utilities
├── MAP_CANVAS_README.md       # This documentation
├── MapSettings.tsx            # Map configuration panel
└── MapUtilityPanel.tsx        # Entity list, filters, controls
```

## Dependencies

```json
{
  "sigma": "^3.0.2",
  "@react-sigma/core": "^5.0.4",
  "@sigma/layer-leaflet": "^3.0.0",
  "leaflet": "^1.9.4",
  "graphology": "^0.26.0"
}
```

## Next Steps

1. ✅ Sigma.js + Leaflet integration complete
2. ✅ Mock data with geographic entities
3. ✅ Neo4j data loader utility created
4. ⏳ Create `/api/geographic-entities` route
5. ⏳ Replace mock data with real Neo4j queries
6. ⏳ Add viewport-based dynamic loading
7. ⏳ Implement entity clustering for dense areas
8. ⏳ Add custom map styles (satellite, dark theme)
9. ⏳ Entity filtering by type/domain
10. ⏳ Relationship strength visualization on map

## References

- [Sigma.js Documentation](https://www.sigmajs.org/)
- [Leaflet Documentation](https://leafletjs.com/)
- [Graphology Documentation](https://graphology.github.io/)
- [Neo4j Spatial Functions](https://neo4j.com/docs/cypher-manual/current/functions/spatial/)
- [Knowledge Graph Schema](../../../../../docs/developer/README_KNOWLEDGE_GRAPH.md)
