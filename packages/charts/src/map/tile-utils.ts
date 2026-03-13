/**
 * Map tile coordinate utilities for server-side image generation
 *
 * Handles conversion between lat/lng coordinates and tile/pixel coordinates
 * for Web Mercator projection (EPSG:3857)
 */

export interface TileCoord {
  x: number;
  y: number;
  z: number;
}

export interface PixelCoord {
  x: number;
  y: number;
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Convert latitude/longitude to tile coordinates at given zoom level
 */
export function latLngToTile(
  lat: number,
  lng: number,
  zoom: number
): TileCoord {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y, z: zoom };
}

/**
 * Convert latitude/longitude to pixel coordinates within a tile
 * Returns pixel position relative to tile's top-left corner
 */
export function latLngToPixelInTile(
  lat: number,
  lng: number,
  zoom: number,
  tileSize: number = 256
): { tileX: number; tileY: number; pixelX: number; pixelY: number } {
  const n = 2 ** zoom;

  // World coordinates (0-1 range)
  const worldX = (lng + 180) / 360;
  const latRad = (lat * Math.PI) / 180;
  const worldY =
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;

  // Tile coordinates
  const tileX = Math.floor(worldX * n);
  const tileY = Math.floor(worldY * n);

  // Pixel coordinates within tile
  const pixelX = Math.floor((worldX * n - tileX) * tileSize);
  const pixelY = Math.floor((worldY * n - tileY) * tileSize);

  return { tileX, tileY, pixelX, pixelY };
}

/**
 * Convert latitude/longitude to absolute pixel coordinates at given zoom level
 * Used for positioning markers on the composite image
 */
export function latLngToPixel(
  lat: number,
  lng: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
  centerLat: number,
  centerLng: number,
  tileSize: number = 256
): PixelCoord {
  const n = 2 ** zoom;

  // Convert to world coordinates (0-256*n range at this zoom)
  const worldX = ((lng + 180) / 360) * n * tileSize;
  const latRad = (lat * Math.PI) / 180;
  const worldY =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    n *
    tileSize;

  // Center world coordinates
  const centerWorldX = ((centerLng + 180) / 360) * n * tileSize;
  const centerLatRad = (centerLat * Math.PI) / 180;
  const centerWorldY =
    ((1 -
      Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / Math.PI) /
      2) *
    n *
    tileSize;

  // Convert to viewport pixel coordinates
  const x = worldX - centerWorldX + viewportWidth / 2;
  const y = worldY - centerWorldY + viewportHeight / 2;

  return { x, y };
}

/**
 * Get array of tiles needed to cover a viewport
 * Returns tiles with their screen positions
 */
export function getTilesForViewport(
  centerLat: number,
  centerLng: number,
  zoom: number,
  width: number,
  height: number,
  tileSize: number = 256
): Array<TileCoord & { screenX: number; screenY: number }> {
  const n = 2 ** zoom;

  // Get center tile
  const centerTile = latLngToTile(centerLat, centerLng, zoom);

  // Calculate how many tiles we need in each direction
  const tilesX = Math.ceil(width / tileSize) + 2; // +2 for padding
  const tilesY = Math.ceil(height / tileSize) + 2;

  const halfTilesX = Math.floor(tilesX / 2);
  const halfTilesY = Math.floor(tilesY / 2);

  // Get pixel offset within center tile
  const { pixelX, pixelY } = latLngToPixelInTile(
    centerLat,
    centerLng,
    zoom,
    tileSize
  );

  // Calculate screen position of center tile's top-left corner
  const centerTileScreenX = width / 2 - pixelX;
  const centerTileScreenY = height / 2 - pixelY;

  const tiles: Array<TileCoord & { screenX: number; screenY: number }> = [];

  for (let dy = -halfTilesY; dy < tilesY - halfTilesY; dy++) {
    for (let dx = -halfTilesX; dx < tilesX - halfTilesX; dx++) {
      const tileX = centerTile.x + dx;
      const tileY = centerTile.y + dy;

      // Wrap x coordinate (longitude wraps around)
      const wrappedX = ((tileX % n) + n) % n;

      // Skip tiles outside valid y range
      if (tileY < 0 || tileY >= n) continue;

      tiles.push({
        x: wrappedX,
        y: tileY,
        z: zoom,
        screenX: centerTileScreenX + dx * tileSize,
        screenY: centerTileScreenY + dy * tileSize,
      });
    }
  }

  return tiles;
}

/**
 * Get tile URL for various providers
 */
export function getTileUrl(
  x: number,
  y: number,
  z: number,
  provider: "openstreetmap" | "cartodb" | "stamen" = "openstreetmap"
): string {
  // Deterministic subdomain selection based on tile coordinates for consistent caching
  // This ensures the same tile always gets the same URL, enabling browser/CDN caching
  const subdomains = ["a", "b", "c"];
  const subdomain = subdomains[(x + y + z) % subdomains.length];

  switch (provider) {
    case "cartodb":
      return `https://${subdomain}.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`;
    case "stamen":
      return `https://stamen-tiles-${subdomain}.a.ssl.fastly.net/toner-lite/${z}/${x}/${y}.png`;
    default:
      return `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  }
}

/**
 * Calculate bounds that would be visible for a given center, zoom, and viewport size
 */
export function getVisibleBounds(
  centerLat: number,
  centerLng: number,
  zoom: number,
  width: number,
  height: number,
  tileSize: number = 256
): Bounds {
  const n = 2 ** zoom;
  const scale = n * tileSize;

  // Convert center to world coordinates
  const centerWorldX = ((centerLng + 180) / 360) * scale;
  const centerLatRad = (centerLat * Math.PI) / 180;
  const centerWorldY =
    ((1 -
      Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / Math.PI) /
      2) *
    scale;

  // Calculate bounds in world coordinates
  const westWorldX = centerWorldX - width / 2;
  const eastWorldX = centerWorldX + width / 2;
  const northWorldY = centerWorldY - height / 2;
  const southWorldY = centerWorldY + height / 2;

  // Convert back to lat/lng
  const west = (westWorldX / scale) * 360 - 180;
  const east = (eastWorldX / scale) * 360 - 180;

  const northY = northWorldY / scale;
  const north =
    (Math.atan(Math.sinh(Math.PI * (1 - 2 * northY))) * 180) / Math.PI;

  const southY = southWorldY / scale;
  const south =
    (Math.atan(Math.sinh(Math.PI * (1 - 2 * southY))) * 180) / Math.PI;

  return { north, south, east, west };
}
