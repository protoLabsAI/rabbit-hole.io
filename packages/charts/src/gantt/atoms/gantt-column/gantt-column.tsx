"use client";

import { useMouse, useWindowScroll, useThrottle } from "@uidotdev/usehooks";
import { useState, useCallback } from "react";
import type { FC } from "react";

import { useGanttContext, useGanttDragging } from "../../hooks";
import { cn } from "../../lib/utils";
import { GanttAddFeatureHelper } from "../gantt-add-feature-helper";

export type GanttColumnProps = {
  index: number;
  isSecondary?: boolean;
};

export const GanttColumn: FC<GanttColumnProps> = ({ isSecondary }) => {
  const gantt = useGanttContext();
  const [dragging] = useGanttDragging();
  const [mousePosition, mouseRef] = useMouse<HTMLDivElement>();
  const [hovering, setHovering] = useState(false);
  const [windowScroll] = useWindowScroll();

  const handleMouseEnter = useCallback(() => setHovering(true), []);
  const handleMouseLeave = useCallback(() => setHovering(false), []);

  const top = useThrottle(
    mousePosition.y -
      (mouseRef.current?.getBoundingClientRect().y ?? 0) -
      (windowScroll.y ?? 0),
    10
  );

  return (
    <div
      className={cn(
        "group relative h-full overflow-hidden",
        isSecondary ? "bg-secondary" : ""
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={mouseRef}
    >
      {!dragging && hovering && gantt.onAddItem ? (
        <GanttAddFeatureHelper top={top} />
      ) : null}
    </div>
  );
};
