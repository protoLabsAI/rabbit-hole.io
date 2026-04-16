# Map Components

Geographic visualization components for displaying entities with location data.

## Components

### MapCanvas

Interactive map component using Leaflet for full interactivity.

**Use when:**

- User needs to pan, zoom, click
- Single map on page
- Interactive exploration required

**Features:**

- Full Leaflet interactivity
- Real-time updates
- Custom tile providers
- Entity markers with popups
- Click handlers
- Bounds change tracking

```tsx
import { MapCanvas } from "@protolabsai/charts/map";

<MapCanvas
  entities={entities}
  center={{ lat: 37.7749, lng: -122.4194 }}
  zoom={12}
  onEntityClick={(entity) => console.log(entity)}
  readOnly={false}
/>;
```

### StaticMapImage

Server-rendered static map image for performance-critical scenarios.

**Use when:**

- Multiple maps on page (cards, grids)
- Performance critical
- Export/print/email needed
- Interactivity not required

**Features:**

- Server-side rendering
- Optimized PNG output
- No JS overhead
- Cacheable
- Lightweight

```tsx
import { StaticMapImage } from "@protolabsai/charts/map";

<StaticMapImage
  entities={entities}
  center={{ lat: 37.7749, lng: -122.4194 }}
  zoom={12}
  width={800}
  height={600}
/>;
```

## Performance Comparison

| Scenario     | MapCanvas                  | StaticMapImage                      |
| ------------ | -------------------------- | ----------------------------------- |
| Single map   | ~200KB JS + runtime        | ~30-50KB PNG                        |
| 20 maps grid | ~4MB+ JS, heavy CPU/memory | ~600KB-1MB images, minimal overhead |
| Page load    | Slower (Leaflet init)      | Faster (static images)              |
| Memory       | High (~15-25MB per map)    | Low (~0.5-1MB per map)              |
| Export       | Screenshot required        | Native image                        |

**Note:** See [PERFORMANCE_TESTING.md](./PERFORMANCE_TESTING.md) for detailed testing methodology and validation of these claims.

## Decision Guide

```
Need interactivity? ──YES──> MapCanvas
       │
       NO
       │
       ▼
Multiple maps? ──YES──> StaticMapImage
       │
       NO
       │
       ▼
    Either works
```

## API Route

StaticMapImage uses `/api/map-image` for server-side rendering:

```
GET /api/map-image?entities=[...]&center=lat,lng&zoom=12&width=800&height=600
```

**Query Parameters:**

- `entities`: JSON array of entity objects
- `center`: "lat,lng" string
- `zoom`: 1-18
- `width`: 100-2000px (default: 800)
- `height`: 100-2000px (default: 600)
- `provider`: openstreetmap | cartodb | stamen

**Response:**

- `Content-Type: image/png`
- `Cache-Control: public, max-age=3600`
- Optimized PNG buffer

## Architecture

### MapCanvas (Client-Side)

```
Browser
  ↓
Dynamic import Leaflet
  ↓
Fetch tiles from provider
  ↓
Render interactive map
  ↓
User interactions
```

### StaticMapImage (Server-Side)

```
Browser requests image
  ↓
Next.js API route
  ↓
node-canvas + sharp
  ↓
Fetch tiles
  ↓
Composite markers
  ↓
Return PNG
  ↓
Browser caches
```

## Tile Providers

All components support multiple tile providers:

- **OpenStreetMap** (default): Free, community-maintained
- **CartoDB**: Light theme, clean design
- **Stamen**: Toner lite, minimalist

### Rate Limits

- OSM: ~2 requests/second per IP
- CartoDB: Similar to OSM
- Stamen: Generous, hosted on Fastly CDN

For production with high volume, consider:

- Self-hosted tile server
- Paid provider (Mapbox, Google Maps)
- Server-side caching layer

## Examples

### Card Grid with Locations

```tsx
import { StaticMapImage } from "@protolabsai/charts/map";

<div className="grid grid-cols-3 gap-4">
  {entities.map((entity) => (
    <div key={entity.id} className="border rounded-lg">
      <StaticMapImage
        entities={[entity]}
        center={{ lat: entity.lat, lng: entity.lng }}
        zoom={12}
        width={400}
        height={200}
      />
      <div className="p-4">
        <h3>{entity.name}</h3>
      </div>
    </div>
  ))}
</div>;
```

### Interactive Exploration

```tsx
import { MapCanvas } from "@protolabsai/charts/map";

<MapCanvas
  entities={allEntities}
  center={userLocation}
  zoom={10}
  onEntityClick={(entity) => setSelected(entity)}
  onBoundsChange={(bounds) => loadEntitiesInBounds(bounds)}
/>;
```

## TypeScript Types

```typescript
interface MapEntity {
  id: string;
  name: string;
  type: EntityType;
  lat: number;
  lng: number;
  properties?: Record<string, unknown>;
}

interface MapCanvasProps {
  entities: MapEntity[];
  center?: { lat: number; lng: number };
  zoom?: number;
  tileProvider?: "openstreetmap" | "cartodb" | "stamen";
  onEntityClick?: (entity: MapEntity) => void;
  onMapClick?: (lat: number, lng: number) => void;
  onBoundsChange?: (bounds: Bounds) => void;
  readOnly?: boolean;
  showScale?: boolean;
  isLoading?: boolean;
}

interface StaticMapImageProps {
  entities: StaticMapEntity[];
  center: { lat: number; lng: number };
  zoom: number;
  width?: number;
  height?: number;
  tileProvider?: "openstreetmap" | "cartodb" | "stamen";
  alt?: string;
  isLoading?: boolean;
  error?: string;
  onClick?: () => void;
  className?: string;
}
```

## Caching

StaticMapImage responses are cached:

- Browser: 1 hour (Cache-Control header)
- CDN: Cacheable (if deployed behind CDN)
- API: No server-side cache (tiles cached by provider)

For production, consider adding:

- Redis cache for generated images
- CDN caching layer
- Tile proxy/cache server

## Testing

See Storybook:

- `MapCanvas.stories.tsx` - Interactive examples and read-only thumbnails
- `StaticMapImage.stories.tsx` - Static image examples and grids
- `MapPerformance.stories.tsx` - Performance testing and comparison

Run Storybook:

```bash
npm run sb
```

### Performance Testing

For detailed performance validation, see:

- **[PERFORMANCE_TESTING.md](./PERFORMANCE_TESTING.md)** - Complete testing guide
- **Storybook → Performance Tests** - Interactive performance monitoring
- Chrome DevTools → Performance Monitor for real-time metrics

The performance stories include:

- Automatic metrics collection (transfer size, memory, render time)
- Side-by-side comparisons
- Instructions for manual validation

## Troubleshooting

### MapCanvas not loading

- Check browser console for Leaflet errors
- Verify entities have valid lat/lng
- Check network tab for tile fetch errors

### StaticMapImage blank/error

- Check API route logs
- Verify canvas package installed
- Check tile provider rate limits
- Verify entity JSON format

### Performance issues with multiple maps

- Use StaticMapImage instead of MapCanvas
- Reduce image dimensions
- Implement lazy loading
- Add CDN caching

## Dependencies

**MapCanvas:**

- `leaflet` - Map library
- Dynamic imports (no SSR issues)

**StaticMapImage:**

- `canvas` - Node.js canvas API (server-side)
- `sharp` - Image optimization
- `/api/map-image` route

## License

Same as parent project
