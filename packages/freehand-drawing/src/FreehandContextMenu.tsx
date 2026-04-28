import { useEffect, useState } from "react";

import { Icon } from "@protolabsai/icon-system";
import {
  Slider,
  Label,
  Separator,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@protolabsai/ui";

import type { ToolType } from "./tools/registry";
import { ToolSelector } from "./tools/ToolSelector";

/**
 * Context menu for freehand drawing tool settings
 *
 * Appears on right-click when drawing mode is active.
 * Provides controls for brush size, opacity, and other drawing parameters.
 */

export interface FreehandSettings {
  size: number;
  opacity: number;
  smoothing: number;
  thinning: number;
  color: string; // HSL format: "217 91% 60%"
  eraserSize?: number;
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontColor?: string;
  fontWeight?: "normal" | "bold";
  textAlign?: "left" | "center" | "right";
  backgroundColor?: string;
  backgroundOpacity?: number;
  padding?: number;
}

export interface DrawingToolState {
  activeTool: ToolType;
  settings: FreehandSettings;
}

interface FreehandContextMenuProps {
  position: { x: number; y: number } | null;
  activeTool: ToolType;
  settings: FreehandSettings;
  onToolChange: (tool: ToolType) => void;
  onSettingsChange: (settings: Partial<FreehandSettings>) => void;
  onClose: () => void;
}

export function FreehandContextMenu({
  position,
  activeTool,
  settings,
  onToolChange,
  onSettingsChange,
  onClose,
}: FreehandContextMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);

  useEffect(() => {
    if (position) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [position]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isVisible) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isVisible, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-freehand-menu]")) {
        onClose();
      }
    };

    if (isVisible) {
      // Delay to avoid immediate close from the right-click that opened it
      const timeoutId = window.setTimeout(() => {
        window.addEventListener("click", handleClickOutside);
      }, 100);

      return () => {
        window.clearTimeout(timeoutId);
        window.removeEventListener("click", handleClickOutside);
      };
    }
  }, [isVisible, onClose]);

  if (!position) return null;

  // Convert HSL to hex for color input
  const hslToHex = (hsl: string): string => {
    const match = hsl.match(
      /(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/
    );
    if (!match) return "#3b82f6";

    const h = parseFloat(match[1]) / 360;
    const s = parseFloat(match[2]) / 100;
    const l = parseFloat(match[3]) / 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let r: number, g: number, b: number;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Convert hex to HSL
  const hexToHsl = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0,
      s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  if (!position) return null;

  // Adjust position to prevent menu from going off-screen
  const menuWidth = 240;
  const menuHeight = 400; // Approximate

  const adjustedPosition = {
    x:
      position.x + menuWidth > window.innerWidth
        ? window.innerWidth - menuWidth - 10
        : position.x,
    y:
      position.y + menuHeight > window.innerHeight
        ? window.innerHeight - menuHeight - 10
        : position.y,
  };

  return (
    <div
      data-freehand-menu
      className="fixed bg-card/95 backdrop-blur rounded-lg shadow-lg border border-border p-4 min-w-[220px]"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        zIndex: 100,
      }}
    >
      <div className="text-sm font-semibold text-foreground mb-4">
        Drawing Tools
      </div>

      {/* Tool Selector */}
      <ToolSelector activeTool={activeTool} onToolChange={onToolChange} />

      <Separator className="my-4" />

      {/* Settings Section - Collapsible */}
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground mb-3">
          <span>Settings</span>
          <Icon
            name={settingsOpen ? "chevron-up" : "chevron-down"}
            size={14}
            className="transition-transform"
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4">
          {/* Tool-specific settings */}
          {activeTool === "freehand" && (
            <>
              {/* Color Picker */}
              <div>
                <Label className="flex items-center justify-between text-xs mb-2">
                  <span>Color</span>
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={hslToHex(settings.color)}
                    onChange={(e) =>
                      onSettingsChange({ color: hexToHsl(e.target.value) })
                    }
                    className="w-12 h-9 rounded-md border border-border cursor-pointer bg-transparent"
                  />
                  <div
                    className="flex-1 h-9 rounded-md border border-border"
                    style={{ backgroundColor: `hsl(${settings.color})` }}
                  />
                </div>
              </div>

              {/* Brush Size */}
              <div>
                <Label className="flex items-center justify-between text-xs mb-2">
                  <span>Brush Size</span>
                  <span className="text-foreground font-mono">
                    {settings.size}px
                  </span>
                </Label>
                <Slider
                  min={2}
                  max={32}
                  step={1}
                  value={[settings.size]}
                  onValueChange={([value]: number[]) =>
                    onSettingsChange({ size: value })
                  }
                />
              </div>

              {/* Opacity */}
              <div>
                <Label className="flex items-center justify-between text-xs mb-2">
                  <span>Opacity</span>
                  <span className="text-foreground font-mono">
                    {Math.round(settings.opacity * 100)}%
                  </span>
                </Label>
                <Slider
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={[settings.opacity]}
                  onValueChange={([value]: number[]) =>
                    onSettingsChange({ opacity: value })
                  }
                />
              </div>

              {/* Smoothing */}
              <div>
                <Label className="flex items-center justify-between text-xs mb-2">
                  <span>Smoothing</span>
                  <span className="text-foreground font-mono">
                    {Math.round(settings.smoothing * 100)}%
                  </span>
                </Label>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={[settings.smoothing]}
                  onValueChange={([value]: number[]) =>
                    onSettingsChange({ smoothing: value })
                  }
                />
              </div>

              {/* Thinning */}
              <div>
                <Label className="flex items-center justify-between text-xs mb-2">
                  <span>Thinning</span>
                  <span className="text-foreground font-mono">
                    {Math.round(settings.thinning * 100)}%
                  </span>
                </Label>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={[settings.thinning]}
                  onValueChange={([value]: number[]) =>
                    onSettingsChange({ thinning: value })
                  }
                />
              </div>
            </>
          )}

          {/* Eraser Settings */}
          {activeTool === "eraser" && (
            <div>
              <Label className="flex items-center justify-between text-xs mb-2">
                <span>Eraser Size</span>
                <span className="text-foreground font-mono">
                  {settings.eraserSize ?? 20}px
                </span>
              </Label>
              <Slider
                min={10}
                max={50}
                step={5}
                value={[settings.eraserSize ?? 20]}
                onValueChange={([value]: number[]) =>
                  onSettingsChange({ eraserSize: value })
                }
              />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Separator className="my-3" />

      {/* Hint */}
      <div className="text-[10px] text-muted-foreground text-center">
        Right-click to open • ESC to close
      </div>
    </div>
  );
}
