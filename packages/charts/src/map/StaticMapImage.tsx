"use client";

/**
 * StaticMapImage - Server-rendered static map image
 *
 * Lightweight alternative to MapCanvas for scenarios where:
 * - Performance is critical (multiple maps on page)
 * - Interactivity not needed
 * - Export/embed required
 *
 * Performance (validated):
 * - Single image: ~30-50KB PNG
 * - 20 images: ~600KB-1MB total transfer
 * - Memory: ~0.5-1MB per instance (vs 15-25MB for MapCanvas)
 * - No JS runtime overhead (vs ~200KB Leaflet bundle)
 *
 * Renders via server-side API route that composites tiles and markers.
 * See: packages/charts/src/map/PERFORMANCE_TESTING.md for testing methodology
 */

import { useMemo } from "react";

import type { EntityType } from "@proto/types";

export interface StaticMapEntity {
  id: string;
  name: string;
  type: EntityType;
  lat: number;
  lng: number;
}

export interface StaticMapImageProps {
  /** Entities to display as markers */
  entities: StaticMapEntity[];

  /** Map center coordinates */
  center: { lat: number; lng: number };

  /** Zoom level (1-18) */
  zoom: number;

  /** Image width in pixels (default: 800) */
  width?: number;

  /** Image height in pixels (default: 600) */
  height?: number;

  /** Tile provider (default: openstreetmap) */
  tileProvider?: "openstreetmap" | "cartodb" | "stamen";

  /** Base URL for API (default: "" for same origin, use "http://localhost:3000" for Storybook) */
  apiBaseUrl?: string;

  /** Alt text for accessibility */
  alt?: string;

  /** Loading state */
  isLoading?: boolean;

  /** Error state */
  error?: string;

  /** Click handler */
  onClick?: () => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Static map image component
 *
 * Uses server-side rendering API to generate static PNG images
 * Much more performant than MapCanvas when multiple maps on page
 */
export function StaticMapImage({
  entities,
  center,
  zoom,
  width = 800,
  height = 600,
  tileProvider = "openstreetmap",
  apiBaseUrl = "",
  alt = "Map visualization",
  isLoading = false,
  error,
  onClick,
  className = "",
}: StaticMapImageProps) {
  const imageUrl = useMemo(() => {
    const params = new URLSearchParams({
      entities: JSON.stringify(entities),
      center: `${center.lat},${center.lng}`,
      zoom: String(zoom),
      width: String(width),
      height: String(height),
      provider: tileProvider,
    });
    return `${apiBaseUrl}/api/map-image?${params}`;
  }, [
    entities,
    center.lat,
    center.lng,
    zoom,
    width,
    height,
    tileProvider,
    apiBaseUrl,
  ]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        style={{ width, height }}
      >
        <p className="text-sm text-destructive">Error: {error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        style={{ width, height }}
      >
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  // Wrap in button for keyboard accessibility if clickable
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`p-0 border-0 bg-transparent ${className}`}
        style={{ width, height }}
        aria-label={alt}
      >
        <img
          src={imageUrl}
          alt={alt}
          width={width}
          height={height}
          className="object-cover cursor-pointer"
          loading="lazy"
        />
      </button>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Server-rendered image, not Next.js Image optimization
    <img
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      className={`object-cover ${className}`}
      loading="lazy"
    />
  );
}
