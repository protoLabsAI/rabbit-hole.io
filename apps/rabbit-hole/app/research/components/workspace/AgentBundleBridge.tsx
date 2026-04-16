"use client";

/**
 * AgentBundleBridge — CopilotKit removed (M4 milestone)
 *
 * Previously read partialBundle from CopilotKit's coagent state.
 * Now passes null until re-wired to native deep research API.
 */

import type { PartialBundle } from "@protolabsai/types";

interface AgentBundleBridgeProps {
  children: (partialBundle: PartialBundle | null) => React.ReactNode;
}

export function AgentBundleBridge({ children }: AgentBundleBridgeProps) {
  return <>{children(null)}</>;
}
