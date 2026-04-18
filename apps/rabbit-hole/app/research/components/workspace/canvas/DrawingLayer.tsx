"use client";

/**
 * Drawing Layer — minimal pencil + eraser on the React Flow canvas.
 *
 * Strokes live inside ViewportPortal so they pan and zoom with the graph.
 * Coordinates are stored in React Flow "flow" space (world units) so they
 * stay anchored to whatever nodes they annotate regardless of viewport.
 */

import { ViewportPortal, useReactFlow } from "@xyflow/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useRef, useState } from "react";

import { generateSecureId } from "@protolabsai/utils";

export type DrawingTool = "pencil" | "eraser" | null;

export interface DrawingStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

interface DrawingLayerProps {
  activeTool: DrawingTool;
  strokes: DrawingStroke[];
  onStrokeAdd: (stroke: DrawingStroke) => void;
  onStrokeRemove: (strokeId: string) => void;
}

const STROKE_COLOR = "hsl(217 91% 60%)";
const STROKE_WIDTH = 3;
const ERASER_HIT_RADIUS = 8;

export function DrawingLayer({
  activeTool,
  strokes,
  onStrokeAdd,
  onStrokeRemove,
}: DrawingLayerProps) {
  const { screenToFlowPosition } = useReactFlow();
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(
    null
  );
  const drawingActive = activeTool !== null;
  const lastErasedRef = useRef<string | null>(null);

  const toFlow = useCallback(
    (e: { clientX: number; clientY: number }) =>
      screenToFlowPosition({ x: e.clientX, y: e.clientY }),
    [screenToFlowPosition]
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<SVGRectElement>) => {
      if (activeTool === "pencil") {
        e.stopPropagation();
        const pos = toFlow(e);
        setCurrentStroke({
          id: makeStrokeId(),
          points: [pos],
          color: STROKE_COLOR,
          width: STROKE_WIDTH,
        });
        e.currentTarget.setPointerCapture(e.pointerId);
      } else if (activeTool === "eraser") {
        e.stopPropagation();
        lastErasedRef.current = null;
        const pos = toFlow(e);
        const hit = findStrokeAt(strokes, pos, ERASER_HIT_RADIUS);
        if (hit) {
          lastErasedRef.current = hit;
          onStrokeRemove(hit);
        }
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    },
    [activeTool, strokes, onStrokeRemove, toFlow]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<SVGRectElement>) => {
      if (activeTool === "pencil" && currentStroke) {
        const pos = toFlow(e);
        setCurrentStroke({
          ...currentStroke,
          points: [...currentStroke.points, pos],
        });
      } else if (activeTool === "eraser" && e.buttons > 0) {
        const pos = toFlow(e);
        const hit = findStrokeAt(strokes, pos, ERASER_HIT_RADIUS);
        if (hit && hit !== lastErasedRef.current) {
          lastErasedRef.current = hit;
          onStrokeRemove(hit);
        }
      }
    },
    [activeTool, currentStroke, strokes, onStrokeRemove, toFlow]
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<SVGRectElement>) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      if (activeTool === "pencil" && currentStroke) {
        if (currentStroke.points.length > 1) {
          onStrokeAdd(currentStroke);
        }
        setCurrentStroke(null);
      }
      lastErasedRef.current = null;
    },
    [activeTool, currentStroke, onStrokeAdd]
  );

  return (
    <ViewportPortal>
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        {strokes.map((s) => (
          <path
            key={s.id}
            d={strokeToPath(s)}
            stroke={s.color}
            strokeWidth={s.width}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pointerEvents: "none" }}
          />
        ))}
        {currentStroke && currentStroke.points.length > 0 && (
          <path
            d={strokeToPath(currentStroke)}
            stroke={currentStroke.color}
            strokeWidth={currentStroke.width}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pointerEvents: "none" }}
          />
        )}

        {/* Transparent capture surface — covers a huge flow-space rect so
            pointer events always hit it while a drawing tool is active.
            React Flow sits underneath and receives no events while drawing. */}
        {drawingActive && (
          <rect
            x={-100000}
            y={-100000}
            width={200000}
            height={200000}
            fill="transparent"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              pointerEvents: "auto",
              cursor: activeTool === "eraser" ? "cell" : "crosshair",
              touchAction: "none",
            }}
          />
        )}
      </svg>
    </ViewportPortal>
  );
}

function strokeToPath(stroke: DrawingStroke): string {
  if (stroke.points.length === 0) return "";
  const first = stroke.points[0];
  if (!first) return "";
  let d = `M ${first.x} ${first.y}`;
  for (let i = 1; i < stroke.points.length; i++) {
    const p = stroke.points[i];
    if (p) d += ` L ${p.x} ${p.y}`;
  }
  return d;
}

function findStrokeAt(
  strokes: DrawingStroke[],
  pos: { x: number; y: number },
  radius: number
): string | null {
  const r2 = radius * radius;
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i];
    if (!s) continue;
    for (const p of s.points) {
      const dx = p.x - pos.x;
      const dy = p.y - pos.y;
      if (dx * dx + dy * dy <= r2) return s.id;
    }
  }
  return null;
}

function makeStrokeId(): string {
  return `stroke-${generateSecureId()}`;
}
