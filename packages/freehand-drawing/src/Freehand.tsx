import { useReactFlow } from "@xyflow/react";
import type { PointerEvent } from "react";
import { useRef, useMemo, useEffect, useState } from "react";

import type { FreehandSettings } from "./FreehandContextMenu";
import { pointsToPath } from "./path";
import { Eraser } from "./tools/Eraser";
import type { ToolType } from "./tools/registry";
import type { Points } from "./types";

/**
 * Freehand drawing overlay component
 *
 * Renders on top of React Flow canvas to capture drawing gestures.
 * Shows preview path while drawing.
 */
interface FreehandProps {
  points: Points;
  isDrawing: boolean;
  settings: FreehandSettings;
  activeTool: ToolType;
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLDivElement>) => void;
  onSettingsChange: (settings: Partial<FreehandSettings>) => void;
  onToolChange: (tool: ToolType) => void;
  onEraseNodes?: (nodeIds: string[]) => void;
  onEraseEdges?: (edgeIds: string[]) => void;
}

export function Freehand({
  points,
  isDrawing,
  settings,
  activeTool,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onSettingsChange: _onSettingsChange,
  onToolChange: _onToolChange,
  onEraseNodes = () => {},
  onEraseEdges = () => {},
}: FreehandProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [primaryColor, setPrimaryColor] = useState<string>("#3b82f6");
  const { flowToScreenPosition } = useReactFlow();

  // Read primary color from CSS variable (respects whitelabel theme)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateColor = () => {
      const hslValue = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim();

      if (hslValue) {
        // Convert HSL to RGB for SVG data URI
        const rgb = hslToRgb(hslValue);
        setPrimaryColor(rgb);
      }
    };

    updateColor();

    // Watch for theme changes
    const observer = new MutationObserver(updateColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    return () => observer.disconnect();
  }, []);

  // Generate themed cursor with primary color
  const cursorDataUri = useMemo(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${primaryColor}" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`;
    return `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}') 0 24, crosshair`;
  }, [primaryColor]);

  // Convert points to container-relative coordinates for preview
  // - Freehand tool: points are in screen coords, convert to container coords
  // - Shape tools (rectangle, circle, line, text): points are in flow coords, convert to container coords
  const containerPoints = useMemo(() => {
    if (!containerRef.current) return points;
    const rect = containerRef.current.getBoundingClientRect();

    // For shape tools, convert from flow coords to screen coords, then to container coords
    if (
      activeTool === "rectangle" ||
      activeTool === "circle" ||
      activeTool === "line" ||
      activeTool === "text"
    ) {
      return points.map((point) => {
        const screenPos = flowToScreenPosition({ x: point[0], y: point[1] });
        return [
          screenPos.x - rect.left,
          screenPos.y - rect.top,
          point[2],
        ] satisfies [number, number, number];
      });
    }

    // For freehand/eraser, points are already in screen coords
    return points.map((point) => {
      return [point[0] - rect.left, point[1] - rect.top, point[2]] satisfies [
        number,
        number,
        number,
      ];
    });
  }, [points, activeTool, flowToScreenPosition]);

  // Tool-specific cursor
  const toolCursor =
    activeTool === "move"
      ? "default"
      : activeTool === "eraser"
        ? "crosshair"
        : activeTool === "rectangle"
          ? "crosshair"
          : activeTool === "circle"
            ? "crosshair"
            : activeTool === "line"
              ? "crosshair"
              : activeTool === "text"
                ? "text"
                : cursorDataUri;

  return (
    <>
      <div
        ref={containerRef}
        className="absolute inset-0 z-50"
        style={{
          pointerEvents: activeTool === "move" ? "none" : "auto",
          cursor: toolCursor,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={isDrawing ? onPointerMove : undefined}
        onPointerUp={onPointerUp}
      >
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: "none" }}
        >
          {/* Freehand preview */}
          {activeTool === "freehand" && containerPoints.length > 0 && (
            <path
              d={pointsToPath(containerPoints, settings)}
              style={{
                fill: `hsl(${settings.color})`,
                stroke: "none",
                opacity: settings.opacity,
              }}
            />
          )}

          {/* Rectangle preview */}
          {activeTool === "rectangle" && containerPoints.length === 2 && (
            <rect
              x={Math.min(containerPoints[0][0], containerPoints[1][0])}
              y={Math.min(containerPoints[0][1], containerPoints[1][1])}
              width={Math.abs(containerPoints[1][0] - containerPoints[0][0])}
              height={Math.abs(containerPoints[1][1] - containerPoints[0][1])}
              fill={`hsl(${settings.fillColor || "217 91% 60%"})`}
              fillOpacity={settings.fillOpacity ?? 0.3}
              stroke={`hsl(${settings.strokeColor || "217 91% 40%"})`}
              strokeWidth={settings.strokeWidth ?? 2}
            />
          )}

          {/* Circle preview */}
          {activeTool === "circle" && containerPoints.length === 2 && (
            <ellipse
              cx={
                Math.min(containerPoints[0][0], containerPoints[1][0]) +
                Math.abs(containerPoints[1][0] - containerPoints[0][0]) / 2
              }
              cy={
                Math.min(containerPoints[0][1], containerPoints[1][1]) +
                Math.abs(containerPoints[1][1] - containerPoints[0][1]) / 2
              }
              rx={Math.abs(containerPoints[1][0] - containerPoints[0][0]) / 2}
              ry={Math.abs(containerPoints[1][1] - containerPoints[0][1]) / 2}
              fill={`hsl(${settings.fillColor || "217 91% 60%"})`}
              fillOpacity={settings.fillOpacity ?? 0.3}
              stroke={`hsl(${settings.strokeColor || "217 91% 40%"})`}
              strokeWidth={settings.strokeWidth ?? 2}
            />
          )}

          {/* Line preview */}
          {activeTool === "line" && containerPoints.length === 2 && (
            <line
              x1={containerPoints[0][0]}
              y1={containerPoints[0][1]}
              x2={containerPoints[1][0]}
              y2={containerPoints[1][1]}
              stroke={`hsl(${settings.strokeColor || "217 91% 40%"})`}
              strokeWidth={settings.strokeWidth ?? 2}
            />
          )}

          {/* Text box preview */}
          {activeTool === "text" && containerPoints.length === 2 && (
            <g>
              <rect
                x={Math.min(containerPoints[0][0], containerPoints[1][0])}
                y={Math.min(containerPoints[0][1], containerPoints[1][1])}
                width={Math.abs(containerPoints[1][0] - containerPoints[0][0])}
                height={Math.abs(containerPoints[1][1] - containerPoints[0][1])}
                fill="transparent"
                stroke={`hsl(${settings.fontColor || settings.color || "217 91% 40%"})`}
                strokeWidth={1}
                strokeDasharray="4 2"
              />
              <text
                x={Math.min(containerPoints[0][0], containerPoints[1][0]) + 8}
                y={
                  Math.min(containerPoints[0][1], containerPoints[1][1]) +
                  (settings.fontSize ?? 16) +
                  4
                }
                fill={`hsl(${settings.fontColor || settings.color || "217 91% 40%"})`}
                fontSize={settings.fontSize ?? 16}
                fontWeight={settings.fontWeight ?? "normal"}
                opacity={0.5}
              >
                Type text...
              </text>
            </g>
          )}

          {/* Eraser trail */}
          {activeTool === "eraser" && containerPoints.length > 0 && (
            <g>
              {containerPoints.map((point, i) => (
                <circle
                  key={i}
                  cx={point[0]}
                  cy={point[1]}
                  r={(settings.eraserSize ?? 20) / 2}
                  fill="hsl(var(--destructive))"
                  opacity={0.3}
                />
              ))}
            </g>
          )}
        </svg>
      </div>

      {/* Eraser logic */}
      {activeTool === "eraser" && isDrawing && (
        <Eraser
          points={points}
          eraserSize={settings.eraserSize ?? 20}
          onEraseNodes={onEraseNodes}
          onEraseEdges={onEraseEdges}
        />
      )}
    </>
  );
}

/**
 * Convert HSL CSS variable value to RGB color for SVG
 */
function hslToRgb(hsl: string): string {
  // Parse HSL value (format: "217 91% 60%" or "217deg 91% 60%")
  const match = hsl.match(
    /(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/
  );
  if (!match) return "#3b82f6"; // Fallback

  const h = parseFloat(match[1]) / 360;
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

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
}
