"use client";

import type { FC, ReactNode } from "react";

import { cn } from "../../lib/utils";

export type GanttFeatureListGroupProps = {
  children: ReactNode;
  className?: string;
};

export const GanttFeatureListGroup: FC<GanttFeatureListGroupProps> = ({
  children,
  className,
}) => <div className={cn("space-y-4", className)}>{children}</div>;
