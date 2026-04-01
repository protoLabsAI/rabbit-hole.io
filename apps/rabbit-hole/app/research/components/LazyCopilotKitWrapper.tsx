"use client";

/**
 * LazyCopilotKitWrapper — CopilotKit removed (M4 milestone)
 *
 * Previously wrapped children in a CopilotKit provider. Now renders
 * children directly. Research AI chat will be re-wired to the native
 * deep research API in a follow-up milestone.
 */

import React from "react";

interface LazyCopilotKitWrapperProps {
  children: React.ReactNode;
  runtimeUrl: string;
  agent: string;
  publicLicenseKey: string;
}

export function LazyCopilotKitWrapper({
  children,
}: LazyCopilotKitWrapperProps) {
  return <>{children}</>;
}
