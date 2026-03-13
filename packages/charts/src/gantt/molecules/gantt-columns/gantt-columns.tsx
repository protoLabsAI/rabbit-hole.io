"use client";

import type { FC } from "react";
import { useId } from "react";

import { GanttColumn } from "../../atoms";

export type GanttColumnsProps = {
  columns: number;
  isColumnSecondary?: (item: number) => boolean;
};

export const GanttColumns: FC<GanttColumnsProps> = ({
  columns,
  isColumnSecondary,
}) => {
  const id = useId();

  return (
    <div
      className="divide grid h-full w-full divide-x divide-border/50"
      style={{
        gridTemplateColumns: `repeat(${columns}, var(--gantt-column-width))`,
      }}
    >
      {Array.from({ length: columns }).map((_, index) => (
        <GanttColumn
          index={index}
          isSecondary={isColumnSecondary?.(index)}
          key={`${id}-${index}`}
        />
      ))}
    </div>
  );
};
