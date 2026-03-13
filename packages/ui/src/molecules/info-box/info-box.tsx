import * as React from "react";

import { Alert, AlertDescription, AlertTitle } from "../../atoms/alert";

interface InfoBoxProps {
  variant?: "success" | "warning" | "info" | "destructive" | "default";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function InfoBox({
  variant = "default",
  title,
  children,
  className,
}: InfoBoxProps) {
  return (
    <Alert variant={variant} className={className}>
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
