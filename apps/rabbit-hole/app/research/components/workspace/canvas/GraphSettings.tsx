"use client";

/**
 * Graph Settings Panel
 *
 * Canvas-specific settings for graph visualization.
 */

import { useState, useEffect } from "react";

import { useResearchPageState } from "../../../hooks/useResearchPageState";

interface LayoutSettings {
  elk: {
    layerSpacing: number;
    nodeSpacing: number;
  };
  force: {
    repulsion: number;
    linkDistance: number;
    collisionRadius: number;
  };
}

const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = {
  elk: {
    layerSpacing: 150,
    nodeSpacing: 120,
  },
  force: {
    repulsion: 800,
    linkDistance: 250,
    collisionRadius: 120,
  },
};

export function GraphSettings() {
  const research = useResearchPageState();

  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_LAYOUT_SETTINGS;
    const saved = localStorage.getItem("graph-layout-settings");
    return saved ? JSON.parse(saved) : DEFAULT_LAYOUT_SETTINGS;
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(
      "graph-layout-settings",
      JSON.stringify(layoutSettings)
    );
    // Dispatch custom event so GraphCanvasIntegrated can listen
    window.dispatchEvent(
      new CustomEvent("layout-settings-changed", {
        detail: layoutSettings,
      })
    );
  }, [layoutSettings]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h4 className="font-medium text-sm">Graph Configuration</h4>
        <p className="text-xs text-muted-foreground">
          Control network depth, node limits, and display options
        </p>
      </div>

      <div className="space-y-4">
        {/* Network Depth */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Network Depth (Hops)</label>
            <span className="text-sm text-muted-foreground tabular-nums">
              {research.settings.hops}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="3"
            step="1"
            value={research.settings.hops}
            onChange={(e) =>
              research.updateSettings({
                hops: parseInt(e.target.value),
              })
            }
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <p className="text-xs text-muted-foreground">
            How many relationship hops to traverse from selected entities
          </p>
        </div>

        {/* Max Nodes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Max Nodes</label>
            <span className="text-sm text-muted-foreground tabular-nums">
              {research.settings.nodeLimit}
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="10"
            value={research.settings.nodeLimit}
            onChange={(e) =>
              research.updateSettings({
                nodeLimit: parseInt(e.target.value),
              })
            }
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <p className="text-xs text-muted-foreground">
            Maximum number of nodes to display in graph
          </p>
        </div>

        {/* Display Options */}
        <div className="space-y-3 pt-4 border-t">
          {/* TODO: Add showLabels/showEdgeLabels to ResearchSettings type if needed */}
          {/*<div className="flex items-center justify-between">
            <label className="text-sm font-medium">Show Node Labels</label>
            <input
              type="checkbox"
              checked={true}
              onChange={(e) => {}}
              className="rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Show Edge Labels</label>
            <input
              type="checkbox"
              checked={true}
              onChange={(e) => {}}
              className="rounded"
            />
          </div>*/}

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Animate Edges</label>
            <input type="checkbox" defaultChecked={false} className="rounded" />
          </div>
        </div>

        {/* Layout Settings */}
        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <h5 className="font-medium text-sm">Layout Settings</h5>
            <p className="text-xs text-muted-foreground">
              Adjust spacing for computed layouts
            </p>
          </div>

          {/* ELK Layout Settings */}
          <div className="space-y-3">
            <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              ELK Tree Layout
            </h6>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm">Layer Spacing</label>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {layoutSettings.elk.layerSpacing}
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="300"
                step="10"
                value={layoutSettings.elk.layerSpacing}
                onChange={(e) =>
                  setLayoutSettings((prev) => ({
                    ...prev,
                    elk: {
                      ...prev.elk,
                      layerSpacing: parseInt(e.target.value),
                    },
                  }))
                }
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                Space between hierarchical layers
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm">Node Spacing</label>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {layoutSettings.elk.nodeSpacing}
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="200"
                step="10"
                value={layoutSettings.elk.nodeSpacing}
                onChange={(e) =>
                  setLayoutSettings((prev) => ({
                    ...prev,
                    elk: { ...prev.elk, nodeSpacing: parseInt(e.target.value) },
                  }))
                }
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                Space between nodes in same layer
              </p>
            </div>
          </div>

          {/* Force Layout Settings */}
          <div className="space-y-3 pt-3">
            <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Force Layout
            </h6>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm">Repulsion Strength</label>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {layoutSettings.force.repulsion}
                </span>
              </div>
              <input
                type="range"
                min="200"
                max="1500"
                step="50"
                value={layoutSettings.force.repulsion}
                onChange={(e) =>
                  setLayoutSettings((prev) => ({
                    ...prev,
                    force: {
                      ...prev.force,
                      repulsion: parseInt(e.target.value),
                    },
                  }))
                }
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                How strongly nodes push apart
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm">Link Distance</label>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {layoutSettings.force.linkDistance}
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="400"
                step="25"
                value={layoutSettings.force.linkDistance}
                onChange={(e) =>
                  setLayoutSettings((prev) => ({
                    ...prev,
                    force: {
                      ...prev.force,
                      linkDistance: parseInt(e.target.value),
                    },
                  }))
                }
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                Ideal distance between connected nodes
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm">Collision Radius</label>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {layoutSettings.force.collisionRadius}
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="200"
                step="10"
                value={layoutSettings.force.collisionRadius}
                onChange={(e) =>
                  setLayoutSettings((prev) => ({
                    ...prev,
                    force: {
                      ...prev.force,
                      collisionRadius: parseInt(e.target.value),
                    },
                  }))
                }
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                Prevents node overlap
              </p>
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={() => setLayoutSettings(DEFAULT_LAYOUT_SETTINGS)}
            className="w-full mt-3 px-3 py-1.5 text-xs rounded-md bg-muted hover:bg-muted/80 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
