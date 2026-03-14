"use client";

import { WorkspaceContainer } from "../components/workspace/WorkspaceContainer";

export default function WorkspaceClient() {
  const orgId = "local-org";

  // Generate workspace ID (in production, this would come from URL or selection)
  const workspaceId = orgId ? `demo-${orgId}` : "demo-workspace";

  return <WorkspaceContainer workspaceId={workspaceId} />;
}
