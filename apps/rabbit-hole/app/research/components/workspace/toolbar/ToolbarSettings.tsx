"use client";

import { useState, useEffect } from "react";

export function ToolbarSettings() {
  const [layout, setLayout] = useState<"horizontal" | "vertical">("horizontal");
  const [iconSize, setIconSize] = useState<"small" | "medium" | "large">(
    "medium"
  );
  const [showLabels, setShowLabels] = useState(false);
  const [autoHide, setAutoHide] = useState(false);

  // Load from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedLayout = localStorage.getItem("toolbar-layout");
    const savedIconSize = localStorage.getItem("toolbar-icon-size");
    const savedShowLabels = localStorage.getItem("toolbar-show-labels");
    const savedAutoHide = localStorage.getItem("toolbar-auto-hide");

    if (savedLayout) setLayout(savedLayout as any);
    if (savedIconSize) setIconSize(savedIconSize as any);
    if (savedShowLabels) setShowLabels(savedShowLabels === "true");
    if (savedAutoHide) setAutoHide(savedAutoHide === "true");
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    localStorage.setItem("toolbar-layout", layout);
    localStorage.setItem("toolbar-icon-size", iconSize);
    localStorage.setItem("toolbar-show-labels", String(showLabels));
    localStorage.setItem("toolbar-auto-hide", String(autoHide));
  }, [layout, iconSize, showLabels, autoHide]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="font-medium text-sm">Toolbar Configuration</h4>
        <p className="text-xs text-muted-foreground">
          Customize toolbar appearance and behavior
        </p>
      </div>

      <div className="space-y-3">
        {/* Layout */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Layout</label>
          <div className="flex gap-2">
            <button
              onClick={() => setLayout("horizontal")}
              className={`flex-1 px-3 py-2 rounded-md text-sm transition-colors ${
                layout === "horizontal"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              Horizontal
            </button>
            <button
              onClick={() => setLayout("vertical")}
              className={`flex-1 px-3 py-2 rounded-md text-sm transition-colors ${
                layout === "vertical"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              Vertical
            </button>
          </div>
        </div>

        {/* Icon Size */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Icon Size</label>
          <select
            value={iconSize}
            onChange={(e) => setIconSize(e.target.value as any)}
            className="w-full px-3 py-2 rounded-md bg-muted text-sm"
          >
            <option value="small">Small</option>
            <option value="medium">Medium (Default)</option>
            <option value="large">Large</option>
          </select>
        </div>

        {/* Show Labels */}
        <label className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer">
          <span className="text-sm font-medium">Show Button Labels</span>
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
            className="rounded"
          />
        </label>

        {/* Auto-hide */}
        <label className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer">
          <span className="text-sm font-medium">Auto-hide Toolbar</span>
          <input
            type="checkbox"
            checked={autoHide}
            onChange={(e) => setAutoHide(e.target.checked)}
            className="rounded"
          />
        </label>
      </div>
    </div>
  );
}
