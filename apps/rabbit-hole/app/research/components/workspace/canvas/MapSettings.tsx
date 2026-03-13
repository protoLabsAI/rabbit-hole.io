"use client";

/**
 * Map Settings Panel
 *
 * Canvas-specific settings for map visualization (stub).
 */

export function MapSettings() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="font-medium text-sm">Map Configuration</h4>
        <p className="text-xs text-muted-foreground">
          Control map style, clustering, and overlay options
        </p>
      </div>

      <div className="space-y-4">
        {/* Map Style */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Map Style</label>
          <select className="w-full px-3 py-2 rounded-md bg-muted text-sm">
            <option value="standard">Standard</option>
            <option value="satellite">Satellite</option>
            <option value="terrain">Terrain</option>
            <option value="dark">Dark</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Visual style for the base map
          </p>
        </div>

        {/* Clustering */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Enable Clustering</label>
          <input
            type="checkbox"
            defaultChecked
            className="rounded accent-primary"
          />
        </div>

        {/* Heat Map */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Show Heat Map</label>
          <input type="checkbox" className="rounded accent-primary" />
        </div>

        {/* Labels */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Show Marker Labels</label>
          <input
            type="checkbox"
            defaultChecked
            className="rounded accent-primary"
          />
        </div>
      </div>
    </div>
  );
}
