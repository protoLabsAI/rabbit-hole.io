"use client";

import type { FC, ReactNode } from "react";

import { cn } from "../../lib/utils";

export type GanttFeatureListProps = {
  className?: string;
  children: ReactNode;
};

export const GanttFeatureList: FC<GanttFeatureListProps> = ({
  className,
  children,
}) => (
  <div
    className={cn("absolute top-0 left-0 h-full w-max space-y-4", className)}
    style={{ marginTop: "var(--gantt-header-height)" }}
  >
    {children}
  </div>
);
