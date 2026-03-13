/**
 * Map tile utilities - Server-safe exports
 *
 * This module exports only pure utility functions with no React dependencies.
 * Safe to import from both client and server-side code.
 */

export {
  latLngToTile,
  latLngToPixel,
  latLngToPixelInTile,
  getTilesForViewport,
  getTileUrl,
  getVisibleBounds,
} from "./tile-utils";

export type { TileCoord, PixelCoord, Bounds } from "./tile-utils";
