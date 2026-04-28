import type { Node } from "@xyflow/react";

import { Icon } from "@protolabsai/icon-system";
import { Slider, Label, Separator, ScrollArea, cn } from "@protolabsai/ui";

import type { FreehandSettings } from "./FreehandContextMenu";
import type { ToolType } from "./tools/registry";
import { TOOL_REGISTRY } from "./tools/registry";

/**
 * Inspector Panel Component
 *
 * Figma/Unity-style collapsible inspector panel for drawing tools.
 * Shows tool selector and tool-specific settings.
 * When a drawing node is selected, shows that node's properties instead.
 */

interface InspectorPanelProps {
  activeTool: ToolType;
  settings: FreehandSettings;
  selectedNode?: Node | null;
  onToolChange: (tool: ToolType) => void;
  onSettingsChange: (settings: Partial<FreehandSettings>) => void;
  onSelectedNodeUpdate?: (updates: Partial<FreehandSettings>) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function InspectorPanel({
  activeTool,
  settings,
  selectedNode,
  onToolChange,
  onSettingsChange,
  onSelectedNodeUpdate,
  isOpen,
  onToggle,
}: InspectorPanelProps) {
  const tools = Object.values(TOOL_REGISTRY);
  const activeToolConfig = TOOL_REGISTRY[activeTool];

  // If a drawing node is selected, use that node's data for settings
  const isNodeSelected = !!(
    selectedNode &&
    selectedNode.type &&
    (selectedNode.type === "freehand" ||
      selectedNode.type === "rectangle" ||
      selectedNode.type === "circle" ||
      selectedNode.type === "line")
  );

  const effectiveSettings: FreehandSettings =
    isNodeSelected && selectedNode
      ? {
          // Freehand properties
          size: (selectedNode.data.size as number | undefined) ?? settings.size,
          opacity:
            (selectedNode.data.opacity as number | undefined) ??
            settings.opacity,
          smoothing:
            (selectedNode.data.smoothing as number | undefined) ??
            settings.smoothing,
          thinning:
            (selectedNode.data.thinning as number | undefined) ??
            settings.thinning,
          color:
            (selectedNode.data.color as string | undefined) ?? settings.color,
          // Shape properties
          fillColor:
            (selectedNode.data.fillColor as string | undefined) ??
            settings.fillColor,
          fillOpacity:
            (selectedNode.data.fillOpacity as number | undefined) ??
            settings.fillOpacity,
          strokeColor:
            (selectedNode.data.strokeColor as string | undefined) ??
            settings.strokeColor,
          strokeWidth:
            (selectedNode.data.strokeWidth as number | undefined) ??
            settings.strokeWidth,
          eraserSize: settings.eraserSize,
        }
      : settings;

  const effectiveTool: ToolType =
    isNodeSelected && selectedNode?.type
      ? (selectedNode.type as ToolType)
      : activeTool;

  const effectiveOnChange =
    isNodeSelected && onSelectedNodeUpdate
      ? onSelectedNodeUpdate
      : onSettingsChange;

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

  return (
    <div
      className={cn(
        "h-full bg-card border-l border-border shadow-lg transition-all duration-300 ease-in-out flex-shrink-0",
        isOpen ? "w-[280px]" : "w-0"
      )}
      style={{
        minWidth: isOpen ? "280px" : "0px",
        maxWidth: isOpen ? "280px" : "0px",
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={cn(
          "absolute -left-10 top-4 bg-card border border-border rounded-l-md p-2 hover:bg-muted transition-colors z-10",
          !isOpen && "left-0"
        )}
        title={isOpen ? "Close Inspector" : "Open Inspector"}
      >
        <Icon
          name={isOpen ? "chevron-right" : "chevron-left"}
          size={20}
          className="text-muted-foreground"
        />
      </button>

      {/* Panel Content */}
      <div
        className={cn("flex flex-col h-full w-[280px]", !isOpen && "hidden")}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <h3 className="text-sm font-semibold text-foreground">Inspector</h3>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6 w-[280px]">
            {/* Selected Node Indicator */}
            {isNodeSelected && selectedNode && selectedNode.type && (
              <div className="bg-primary/10 border border-primary/30 rounded-md p-3">
                <div className="flex items-center gap-2 text-xs">
                  <Icon
                    name="check-circle"
                    size={14}
                    className="text-primary"
                  />
                  <span className="font-medium text-primary">
                    Editing Selected{" "}
                    {selectedNode.type === "freehand"
                      ? "Drawing"
                      : selectedNode.type.charAt(0).toUpperCase() +
                        selectedNode.type.slice(1)}
                  </span>
                </div>
              </div>
            )}

            {/* Tool Selector - Hide when node selected */}
            {!isNodeSelected && (
              <>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-3 block">
                    Tools
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {tools.map((tool) => (
                      <button
                        key={tool.type}
                        type="button"
                        onClick={() => onToolChange(tool.type)}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-md transition-all",
                          activeTool === tool.type
                            ? "bg-primary/20 text-primary ring-2 ring-primary/50"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                        title={tool.description}
                      >
                        <Icon name={tool.icon as any} size={20} />
                        <span className="text-[10px] mt-1 font-medium">
                          {tool.name.replace(" Tool", "")}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* Tool Settings */}
            {(activeToolConfig || isNodeSelected) && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-3 block">
                  {isNodeSelected && selectedNode?.type
                    ? `${selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)} Properties`
                    : activeToolConfig?.name}
                </Label>

                {/* Move Tool Settings */}
                {effectiveTool === "move" && !isNodeSelected && (
                  <div className="text-xs text-muted-foreground">
                    <p>Select and move drawings on the canvas.</p>
                    <p className="mt-2">
                      Click on a drawing to select it, then drag to move.
                    </p>
                  </div>
                )}

                {/* Pen Tool Settings */}
                {effectiveTool === "freehand" && (
                  <div className="space-y-4">
                    {/* Color Picker */}
                    <div>
                      <Label className="text-xs mb-2 flex items-center justify-between">
                        <span>Color</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={hslToHex(effectiveSettings.color)}
                          onChange={(e) =>
                            effectiveOnChange({
                              color: hexToHsl(e.target.value),
                            })
                          }
                          className="w-12 h-9 rounded-md border border-border cursor-pointer bg-transparent"
                        />
                        <div
                          className="flex-1 h-9 rounded-md border border-border"
                          style={{
                            backgroundColor: `hsl(${effectiveSettings.color})`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Brush Size */}
                    <div>
                      <Label className="text-xs mb-2 flex items-center justify-between">
                        <span>Size</span>
                        <span className="text-foreground font-mono">
                          {effectiveSettings.size}px
                        </span>
                      </Label>
                      <Slider
                        min={2}
                        max={32}
                        step={1}
                        value={[effectiveSettings.size]}
                        onValueChange={([value]: number[]) =>
                          effectiveOnChange({ size: value })
                        }
                      />
                    </div>

                    {/* Opacity */}
                    <div>
                      <Label className="text-xs mb-2 flex items-center justify-between">
                        <span>Opacity</span>
                        <span className="text-foreground font-mono">
                          {Math.round(effectiveSettings.opacity * 100)}%
                        </span>
                      </Label>
                      <Slider
                        min={0.1}
                        max={1}
                        step={0.1}
                        value={[effectiveSettings.opacity]}
                        onValueChange={([value]: number[]) =>
                          effectiveOnChange({ opacity: value })
                        }
                      />
                    </div>

                    {/* Smoothing */}
                    <div>
                      <Label className="text-xs mb-2 flex items-center justify-between">
                        <span>Smoothing</span>
                        <span className="text-foreground font-mono">
                          {Math.round(effectiveSettings.smoothing * 100)}%
                        </span>
                      </Label>
                      <Slider
                        min={0}
                        max={1}
                        step={0.1}
                        value={[effectiveSettings.smoothing]}
                        onValueChange={([value]: number[]) =>
                          effectiveOnChange({ smoothing: value })
                        }
                      />
                    </div>

                    {/* Thinning */}
                    <div>
                      <Label className="text-xs mb-2 flex items-center justify-between">
                        <span>Thinning</span>
                        <span className="text-foreground font-mono">
                          {Math.round(effectiveSettings.thinning * 100)}%
                        </span>
                      </Label>
                      <Slider
                        min={0}
                        max={1}
                        step={0.1}
                        value={[effectiveSettings.thinning]}
                        onValueChange={([value]: number[]) =>
                          effectiveOnChange({ thinning: value })
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Rectangle & Circle Tool Settings */}
                {(effectiveTool === "rectangle" ||
                  effectiveTool === "circle") && (
                  <div className="space-y-4">
                    {/* Fill Color */}
                    <div>
                      <Label className="text-xs mb-2 flex items-center justify-between">
                        <span>Fill Color</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={hslToHex(
                            effectiveSettings.fillColor || "217 91% 60%"
                          )}
                          onChange={(e) =>
                            effectiveOnChange({
                              fillColor: hexToHsl(e.target.value),
                            })
                          }
                          className="w-12 h-9 rounded-md border border-border cursor-pointer"
                        />
                        <div
                          className="flex-1 h-9 rounded-md border border-border"
                          style={{
                            backgroundColor: `hsl(${effectiveSettings.fillColor || "217 91% 60%"})`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Fill Opacity */}
                    <div>
                      <Label className="text-xs mb-2 flex items-center justify-between">
                        <span>Fill Opacity</span>
                        <span className="text-foreground font-mono">
                          {Math.round(
                            (effectiveSettings.fillOpacity ?? 0.3) * 100
                          )}
                          %
                        </span>
                      </Label>
                      <Slider
                        min={0}
                        max={1}
                        step={0.1}
                        value={[effectiveSettings.fillOpacity ?? 0.3]}
                        onValueChange={([value]: number[]) =>
                          effectiveOnChange({ fillOpacity: value })
                        }
                      />
                    </div>

                    {/* Stroke Color */}
                    <div>
                      <Label className="text-xs mb-2">Stroke Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={hslToHex(
                            settings.strokeColor || "217 91% 40%"
                          )}
                          onChange={(e) =>
                            onSettingsChange({
                              strokeColor: hexToHsl(e.target.value),
                            })
                          }
                          className="w-12 h-9 rounded-md border border-border cursor-pointer"
                        />
                        <div
                          className="flex-1 h-9 rounded-md border border-border"
                          style={{
                            backgroundColor: `hsl(${settings.strokeColor || "217 91% 40%"})`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Stroke Width */}
                    <div>
                      <Label className="text-xs mb-2 flex items-center justify-between">
                        <span>Stroke Width</span>
                        <span className="text-foreground font-mono">
                          {effectiveSettings.strokeWidth ?? 2}px
                        </span>
                      </Label>
                      <Slider
                        min={0}
                        max={10}
                        step={1}
                        value={[effectiveSettings.strokeWidth ?? 2]}
                        onValueChange={([value]: number[]) =>
                          effectiveOnChange({ strokeWidth: value })
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Line Tool Settings */}
                {effectiveTool === "line" && (
                  <div className="space-y-4">
                    {/* Stroke Color */}
                    <div>
                      <Label className="text-xs mb-2">Stroke Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={hslToHex(
                            settings.strokeColor || "217 91% 40%"
                          )}
                          onChange={(e) =>
                            onSettingsChange({
                              strokeColor: hexToHsl(e.target.value),
                            })
                          }
                          className="w-12 h-9 rounded-md border border-border cursor-pointer"
                        />
                        <div
                          className="flex-1 h-9 rounded-md border border-border"
                          style={{
                            backgroundColor: `hsl(${settings.strokeColor || "217 91% 40%"})`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Stroke Width */}
                    <div>
                      <Label className="text-xs mb-2 flex items-center justify-between">
                        <span>Stroke Width</span>
                        <span className="text-foreground font-mono">
                          {effectiveSettings.strokeWidth ?? 2}px
                        </span>
                      </Label>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[effectiveSettings.strokeWidth ?? 2]}
                        onValueChange={([value]: number[]) =>
                          effectiveOnChange({ strokeWidth: value })
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Text Tool Settings */}
                {effectiveTool === "text" && (
                  <div className="space-y-4">
                    {/* Font Color */}
                    <div>
                      <Label className="text-xs mb-2">Text Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={hslToHex(
                            effectiveSettings.fontColor ||
                              effectiveSettings.color ||
                              "217 91% 40%"
                          )}
                          onChange={(e) =>
                            effectiveOnChange({
                              fontColor: hexToHsl(e.target.value),
                            })
                          }
                          className="w-12 h-9 rounded-md border border-border cursor-pointer"
                        />
                        <div
                          className="flex-1 h-9 rounded-md border border-border"
                          style={{
                            backgroundColor: `hsl(${effectiveSettings.fontColor || effectiveSettings.color || "217 91% 40%"})`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Font Size */}
                    <div>
                      <Label className="text-xs mb-2 flex items-center justify-between">
                        <span>Font Size</span>
                        <span className="text-foreground font-mono">
                          {effectiveSettings.fontSize ?? 16}px
                        </span>
                      </Label>
                      <Slider
                        min={10}
                        max={48}
                        step={2}
                        value={[effectiveSettings.fontSize ?? 16]}
                        onValueChange={([value]: number[]) =>
                          effectiveOnChange({ fontSize: value })
                        }
                      />
                    </div>

                    {/* Font Weight */}
                    <div>
                      <Label className="text-xs mb-2">Font Weight</Label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            effectiveOnChange({ fontWeight: "normal" })
                          }
                          className={cn(
                            "flex-1 px-3 py-2 rounded-md text-xs transition-all",
                            (effectiveSettings.fontWeight ?? "normal") ===
                              "normal"
                              ? "bg-primary/20 text-primary ring-2 ring-primary/50"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                        >
                          Normal
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            effectiveOnChange({ fontWeight: "bold" })
                          }
                          className={cn(
                            "flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all",
                            effectiveSettings.fontWeight === "bold"
                              ? "bg-primary/20 text-primary ring-2 ring-primary/50"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                        >
                          Bold
                        </button>
                      </div>
                    </div>

                    {/* Text Align */}
                    <div>
                      <Label className="text-xs mb-2">Text Alignment</Label>
                      <div className="flex gap-2">
                        {(["left", "center", "right"] as const).map((align) => (
                          <button
                            key={align}
                            type="button"
                            onClick={() =>
                              effectiveOnChange({ textAlign: align })
                            }
                            className={cn(
                              "flex-1 px-3 py-2 rounded-md text-xs transition-all",
                              (effectiveSettings.textAlign ?? "left") === align
                                ? "bg-primary/20 text-primary ring-2 ring-primary/50"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                          >
                            {align.charAt(0).toUpperCase() + align.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Eraser Tool Settings */}
                {effectiveTool === "eraser" && !isNodeSelected && (
                  <div>
                    <Label className="text-xs mb-2 flex items-center justify-between">
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
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Hint */}
        <div className="px-4 py-3 border-t border-border flex-shrink-0">
          <p className="text-[10px] text-muted-foreground text-center">
            {isNodeSelected
              ? "Editing selected drawing"
              : "Select a tool to view its settings"}
          </p>
        </div>
      </div>
    </div>
  );
}
