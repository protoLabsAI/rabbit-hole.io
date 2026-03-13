"use client";

/**
 * Universal Toolbar Buttons
 *
 * Note: Navigation controls (zoom, fit, lock) have been moved to CanvasNavigationToolbar.
 * This component is kept for potential future universal controls that belong in the top toolbar.
 */

import type { ToolbarButtonCapabilities } from "../../../types/workspace";

interface UniversalToolbarButtonsProps {
  capabilities: ToolbarButtonCapabilities;
}

export function UniversalToolbarButtons({
  capabilities,
}: UniversalToolbarButtonsProps) {
  // Navigation controls moved to CanvasNavigationToolbar (bottom-left)
  // Reserved for future universal controls that belong in horizontal toolbar
  return null;
}
