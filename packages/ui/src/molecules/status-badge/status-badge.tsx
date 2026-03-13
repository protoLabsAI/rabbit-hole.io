import * as React from "react";

import { Badge } from "../../atoms/badge";

interface StatusBadgeProps {
  status: "success" | "warning" | "error" | "info" | "pending";
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  const variantMap = {
    success: "success" as const,
    warning: "warning" as const,
    error: "destructive" as const,
    info: "info" as const,
    pending: "secondary" as const,
  };

  return (
    <Badge variant={variantMap[status]} className={className}>
      {children}
    </Badge>
  );
}
