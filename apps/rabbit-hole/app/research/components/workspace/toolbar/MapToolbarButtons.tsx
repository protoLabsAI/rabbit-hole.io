"use client";

/**
 * Map Toolbar Buttons
 *
 * Map-specific controls:
 * - Layer toggle
 * - Map style selector
 */

import { Icon } from "@proto/icon-system";

interface MapToolbarButtonsProps {
  onToggleLayers?: () => void;
  onToggleStyles?: () => void;
}

export function MapToolbarButtons({
  onToggleLayers,
  onToggleStyles,
}: MapToolbarButtonsProps) {
  return (
    <>
      <button
        onClick={onToggleLayers}
        className="p-2 rounded-md hover:bg-muted transition-colors"
        title="Toggle Layers"
      >
        <Icon name="layers" size={16} />
      </button>
      <button
        onClick={onToggleStyles}
        className="p-2 rounded-md hover:bg-muted transition-colors"
        title="Map Style"
      >
        <Icon name="tag" size={16} />
      </button>
    </>
  );
}
