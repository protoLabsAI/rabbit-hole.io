export { MapCanvas } from "./MapCanvas";
export type { MapEntity, MapRelationship, MapCanvasProps } from "./MapCanvas";

export { StaticMapImage } from "./StaticMapImage";
export type { StaticMapEntity, StaticMapImageProps } from "./StaticMapImage";

// Re-export tile utilities for convenience (also available from @protolabsai/charts/map/utils)
export {
  latLngToTile,
  latLngToPixel,
  latLngToPixelInTile,
  getTilesForViewport,
  getTileUrl,
  getVisibleBounds,
} from "./tile-utils";
export type { TileCoord, PixelCoord, Bounds } from "./tile-utils";
