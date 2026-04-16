"use client";

import { useDraggable } from "@dnd-kit/core";
import type { FC, ReactNode } from "react";
import { useEffect } from "react";

import { Card } from "@protolabsai/ui/atoms";

import { useGanttDragging } from "../../hooks";
import { cn } from "../../lib/utils";

export type GanttFeatureCardProps = {
  id: string;
  children?: ReactNode;
};

export const GanttFeatureCard: FC<GanttFeatureCardProps> = ({
  id,
  children,
}) => {
  const [, setDragging] = useGanttDragging();
  const { attributes, listeners, setNodeRef } = useDraggable({ id });
  const isPressed = Boolean(attributes["aria-pressed"]);

  useEffect(() => setDragging(isPressed), [isPressed, setDragging]);

  return (
    <Card className="h-full w-full rounded-md bg-background p-2 text-xs shadow-sm">
      <div
        className={cn(
          "flex h-full w-full items-center justify-between gap-2 text-left",
          isPressed && "cursor-grabbing"
        )}
        {...attributes}
        {...listeners}
        ref={setNodeRef}
      >
        {children}
      </div>
    </Card>
  );
};
