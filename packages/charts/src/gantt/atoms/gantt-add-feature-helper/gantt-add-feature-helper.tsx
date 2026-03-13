"use client";

import { useMouse } from "@uidotdev/usehooks";
import { type FC } from "react";

import { Icon } from "@proto/icon-system";

import { useGanttContext, useGanttScrollX } from "../../hooks";
import { cn } from "../../lib/utils";
import { getDateByMousePosition } from "../../utils/position-calculations";

export type GanttAddFeatureHelperProps = {
  top: number;
  className?: string;
};

export const GanttAddFeatureHelper: FC<GanttAddFeatureHelperProps> = ({
  top,
  className,
}) => {
  const [scrollX] = useGanttScrollX();
  const gantt = useGanttContext();
  const [mousePosition, mouseRef] = useMouse<HTMLDivElement>();

  const handleClick = () => {
    const ganttRect = gantt.ref?.current?.getBoundingClientRect();
    const x =
      mousePosition.x - (ganttRect?.left ?? 0) + scrollX - gantt.sidebarWidth;
    const currentDate = getDateByMousePosition(gantt, x);

    gantt.onAddItem?.(currentDate);
  };

  return (
    <div
      className={cn("absolute top-0 w-full px-0.5", className)}
      ref={mouseRef}
      style={{
        marginTop: -gantt.rowHeight / 2,
        transform: `translateY(${top}px)`,
      }}
    >
      <button
        className="flex h-full w-full items-center justify-center rounded-md border border-dashed p-2"
        onClick={handleClick}
        type="button"
      >
        <Icon
          name="plus"
          className="pointer-events-none select-none text-muted-foreground"
          size={16}
        />
      </button>
    </div>
  );
};
