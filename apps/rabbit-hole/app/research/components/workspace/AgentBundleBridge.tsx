"use client";

/**
 * AgentBundleBridge
 *
 * Bridge component that reads the research agent's partialBundle from
 * CopilotKit's coagent state and passes it to children via render prop.
 *
 * Must be rendered inside a CopilotKit provider.
 */

import { useCoAgent } from "@copilotkit/react-core";

import type { PartialBundle } from "@proto/types";

interface AgentBundleBridgeProps {
  children: (partialBundle: PartialBundle | null) => React.ReactNode;
}

export function AgentBundleBridge({ children }: AgentBundleBridgeProps) {
  const { state: agentState } = useCoAgent({
    name: "research_agent",
  });

  const partialBundle = (agentState?.partialBundle as PartialBundle) ?? null;

  return <>{children(partialBundle)}</>;
}
