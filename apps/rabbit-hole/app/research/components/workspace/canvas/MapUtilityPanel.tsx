"use client";

/**
 * Map Utility Panel
 *
 * Map-specific utility tabs (stub):
 * - Markers: List of map markers
 * - Settings: Map display configuration
 */

import { useMemo } from "react";

import { Icon } from "@protolabsai/icon-system";
import type { UtilityTab } from "@protolabsai/ui/templates";

interface MapUtilityPanelProps {
  markers?: Array<{ name: string; coordinates: [number, number] }>;
}

export function useMapUtilityTabs({
  markers = [],
}: MapUtilityPanelProps): UtilityTab[] {
  return useMemo(
    () => [
      {
        id: "markers",
        label: "Markers",
        icon: <Icon name="map" size={16} />,
        content: (
          <div className="p-4">
            <div className="space-y-2">
              {markers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No markers on map
                </div>
              ) : (
                markers.map((marker, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-md bg-muted hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="font-medium">{marker.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {marker.coordinates[0]}, {marker.coordinates[1]}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ),
        headerContent: (
          <span className="text-xs">{markers.length} markers</span>
        ),
      },
      {
        id: "settings",
        label: "Settings",
        icon: <Icon name="settings" size={16} />,
        content: (
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Marker Display</h4>
              <div className="space-y-2">
                <label className="flex items-center justify-between">
                  <span className="text-sm">Show Labels</span>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded accent-primary"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm">Cluster Nearby Markers</span>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded accent-primary"
                  />
                </label>
              </div>
            </div>
          </div>
        ),
      },
    ],
    [markers]
  );
}
