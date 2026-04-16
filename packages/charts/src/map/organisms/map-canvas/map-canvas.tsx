"use client";

/**
 * MapCanvas - Geographic Visualization with Leaflet
 *
 * Controlled map component for displaying entities with geographic coordinates.
 * Uses pure Leaflet for reliable rendering.
 *
 * Features:
 * - Interactive map with drag, zoom, and scroll
 * - Entity markers colored by type
 * - Multiple tile providers (OSM, CartoDB, Stamen)
 * - Click callbacks for entity interaction
 * - Bounds change tracking with debouncing
 */

import type * as L from "leaflet";
import { useEffect, useRef, useState } from "react";

import type { EntityType } from "@protolabsai/types";
import { getEntityColor } from "@protolabsai/utils/atlas";

export interface MapEntity {
  id: string;
  name: string;
  type: EntityType;
  lat: number;
  lng: number;
  properties?: Record<string, unknown>;
}

export interface MapRelationship {
  source: string;
  target: string;
  label?: string;
  type?: string;
}

export interface MapCanvasProps {
  // Data
  entities: MapEntity[];
  relationships?: MapRelationship[]; // Not rendered (no graph overlay), accepted for API compatibility

  // Map configuration
  center?: { lat: number; lng: number };
  zoom?: number;
  tileProvider?: "openstreetmap" | "cartodb" | "stamen";

  // Callbacks
  onEntityClick?: (entity: MapEntity) => void;
  onMapClick?: (lat: number, lng: number) => void;
  onBoundsChange?: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
  boundsChangeDebounce?: number; // Debounce delay in ms (default: 500)

  // UI state
  readOnly?: boolean;
  showScale?: boolean;
  showZoomControl?: boolean;
  showAttribution?: boolean;
  isLoading?: boolean;
}

function getTileLayerUrl(provider: string = "openstreetmap") {
  switch (provider) {
    case "cartodb":
      return {
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      };
    case "stamen":
      return {
        url: "https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.png",
        attribution:
          'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 20,
      };
    default:
      return {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      };
  }
}

export function MapCanvas({
  entities,
  center = { lat: 0, lng: 0 },
  zoom = 2,
  tileProvider = "openstreetmap",
  onEntityClick,
  onMapClick,
  onBoundsChange,
  boundsChangeDebounce = 500,
  readOnly = false,
  showScale,
  showZoomControl,
  showAttribution,
  isLoading: externalLoading = false,
}: MapCanvasProps) {
  // Default UI controls based on readOnly - hide all when read-only for clean thumbnails
  const displayScale = showScale ?? !readOnly;
  const displayZoomControl = showZoomControl ?? !readOnly;
  const displayAttribution = showAttribution ?? true; // Always show by default (TOS compliance)
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [internalLoading, setInternalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const boundsChangeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isLoading = externalLoading || internalLoading;

  // Initialize Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (map) return; // Already initialized

    console.log("[MapCanvas] Initializing Leaflet...");

    // Add Leaflet CSS
    if (typeof document !== "undefined") {
      const existingLink = document.querySelector('link[href*="leaflet.css"]');
      if (!existingLink) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
        link.crossOrigin = "";
        document.head.appendChild(link);
        console.log("[MapCanvas] Added Leaflet CSS");
      }
    }

    // Import Leaflet
    import("leaflet")
      .then((LeafletModule) => {
        const L = LeafletModule.default;
        console.log("[MapCanvas] Leaflet loaded");

        if (!mapContainerRef.current) {
          console.error("[MapCanvas] Container disappeared");
          return;
        }

        // Clear any existing Leaflet initialization on this container
        const container = mapContainerRef.current;
        const containerWithLeaflet = container as HTMLDivElement & {
          _leaflet_id?: number;
        };
        if (containerWithLeaflet._leaflet_id) {
          console.log("[MapCanvas] Clearing existing Leaflet instance");
          delete containerWithLeaflet._leaflet_id;
        }

        // Create map with controls
        const leafletMap = L.map(container, {
          center: [center.lat, center.lng],
          zoom: zoom,
          zoomControl: displayZoomControl,
          attributionControl: displayAttribution,
          dragging: !readOnly, // Enable drag to pan (unless read-only)
          touchZoom: !readOnly, // Enable pinch zoom on touch devices
          scrollWheelZoom: !readOnly, // Enable scroll wheel zoom
          doubleClickZoom: !readOnly, // Enable double-click zoom
          boxZoom: !readOnly, // Enable shift+drag zoom
        });

        console.log("[MapCanvas] Map created");

        // Add tiles
        const tileConfig = getTileLayerUrl(tileProvider);
        const tileLayer = L.tileLayer(tileConfig.url, {
          attribution: tileConfig.attribution,
          maxZoom: tileConfig.maxZoom,
        });

        tileLayer.addTo(leafletMap);
        console.log("[MapCanvas] Tiles added");

        // Add scale control (shows km/miles scale)
        if (displayScale) {
          L.control
            .scale({
              position: "bottomleft",
              imperial: true,
              metric: true,
            })
            .addTo(leafletMap);
        }

        // Update cursor on drag
        if (!readOnly) {
          leafletMap.on("mousedown", () => {
            if (container) container.style.cursor = "grabbing";
          });
          leafletMap.on("mouseup", () => {
            if (container) container.style.cursor = "grab";
          });
        }

        // Map click handler
        if (onMapClick && !readOnly) {
          leafletMap.on("click", (e: L.LeafletMouseEvent) => {
            onMapClick(e.latlng.lat, e.latlng.lng);
          });
        }

        // Bounds change handler (debounced)
        if (onBoundsChange) {
          leafletMap.on("moveend", () => {
            if (boundsChangeTimerRef.current) {
              clearTimeout(boundsChangeTimerRef.current);
            }

            boundsChangeTimerRef.current = setTimeout(() => {
              const bounds = leafletMap.getBounds();
              onBoundsChange({
                north: bounds.getNorth(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                west: bounds.getWest(),
              });
            }, boundsChangeDebounce);
          });
        }

        // Force size recalculation
        setTimeout(() => {
          leafletMap.invalidateSize();
          console.log("[MapCanvas] Size invalidated");
        }, 100);

        setMap(leafletMap);
        setInternalLoading(false);
        console.log("[MapCanvas] Initialization complete");
      })
      .catch((err) => {
        console.error("[MapCanvas] Failed to load Leaflet:", err);
        setError(err.message);
        setInternalLoading(false);
      });

    return () => {
      // Clear debounce timer
      if (boundsChangeTimerRef.current) {
        clearTimeout(boundsChangeTimerRef.current);
        boundsChangeTimerRef.current = null;
      }
    };
  }, []); // Only run once

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (map) {
        console.log("[MapCanvas] Cleaning up map");
        try {
          map.remove();
          // Clear Leaflet container ID
          if (mapContainerRef.current) {
            const containerWithLeaflet =
              mapContainerRef.current as HTMLDivElement & {
                _leaflet_id?: number;
              };
            delete containerWithLeaflet._leaflet_id;
          }
        } catch (err) {
          console.error("[MapCanvas] Cleanup error:", err);
        }
      }
    };
  }, [map]);

  // Add markers for entities
  useEffect(() => {
    if (!map) return;

    console.log(`[MapCanvas] Adding ${entities.length} markers`);

    // Import Leaflet for marker creation
    import("leaflet").then((LeafletModule) => {
      const L = LeafletModule.default;

      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Add new markers
      entities.forEach((entity) => {
        const color = getEntityColor(entity.type);

        // Create custom icon with color
        const icon = L.divIcon({
          html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>`,
          className: "custom-marker",
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const marker = L.marker([entity.lat, entity.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<strong>${entity.name}</strong><br/>${entity.type}<br/>${entity.lat.toFixed(4)}, ${entity.lng.toFixed(4)}`
          );

        if (onEntityClick) {
          marker.on("click", () => onEntityClick(entity));
        }

        markersRef.current.push(marker);
      });

      console.log(`[MapCanvas] Added ${markersRef.current.length} markers`);
    });
  }, [map, entities, onEntityClick]);

  // Update view when center/zoom changes
  useEffect(() => {
    if (!map) return;
    map.setView([center.lat, center.lng], zoom);
  }, [map, center.lat, center.lng, zoom]);

  return (
    <div className="relative h-full w-full">
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0"
        style={{
          zIndex: 1,
          cursor: map ? "grab" : "default",
        }}
      />

      {/* Loading Overlay - only show when loading */}
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-background/80"
          style={{ zIndex: 1000 }}
        >
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
            <p className="mt-4 text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-background/80"
          style={{ zIndex: 1000 }}
        >
          <div className="text-center p-6">
            <p className="text-destructive">Error: {error}</p>
          </div>
        </div>
      )}

      {/* Empty State - pointer-events-none so it doesn't block map */}
      {!isLoading && !error && entities.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 500 }}
        >
          <p className="text-muted-foreground">No entities to display</p>
        </div>
      )}
    </div>
  );
}
