"use client";

import { formatDistance, addDays, isSameDay } from "date-fns";
import type { FC, MouseEventHandler, KeyboardEventHandler } from "react";

import { useGanttContext } from "../../hooks";
import { cn } from "../../lib/utils";
import type { GanttFeature } from "../../types";

export type GanttSidebarItemProps = {
  feature: GanttFeature;
  onSelectItem?: (id: string) => void;
  className?: string;
};

export const GanttSidebarItem: FC<GanttSidebarItemProps> = ({
  feature,
  onSelectItem,
  className,
}) => {
  const gantt = useGanttContext();
  const tempEndAt =
    feature.endAt && isSameDay(feature.startAt, feature.endAt)
      ? addDays(feature.endAt, 1)
      : feature.endAt;
  const duration = tempEndAt
    ? formatDistance(feature.startAt, tempEndAt)
    : `${formatDistance(feature.startAt, new Date())} so far`;

  const handleClick: MouseEventHandler<HTMLDivElement> = (event) => {
    if (event.target === event.currentTarget) {
      gantt.scrollToFeature?.(feature);
      onSelectItem?.(feature.id);
    }
  };

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key === "Enter") {
      gantt.scrollToFeature?.(feature);
      onSelectItem?.(feature.id);
    }
  };

  return (
    <div
      className={cn(
        "relative flex items-center gap-2.5 p-2.5 text-xs hover:bg-secondary",
        className
      )}
      key={feature.id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      style={{
        height: "var(--gantt-row-height)",
      }}
      tabIndex={0}
    >
      <div
        className="pointer-events-none h-2 w-2 shrink-0 rounded-full"
        style={{
          backgroundColor: feature.status.color,
        }}
      />
      <p className="pointer-events-none flex-1 truncate text-left font-medium">
        {feature.name}
      </p>
      <p className="pointer-events-none text-muted-foreground">{duration}</p>
    </div>
  );
};
