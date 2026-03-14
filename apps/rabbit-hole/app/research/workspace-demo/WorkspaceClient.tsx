"use client";

import { WorkspaceContainer } from "../components/workspace/WorkspaceContainer";

export default function WorkspaceClient() {
<<<<<<< HEAD
  const orgId = "local-org";
=======
  const orgId = null as string | null;
>>>>>>> origin/main

  // Generate workspace ID (in production, this would come from URL or selection)
  const workspaceId = orgId ? `demo-${orgId}` : "demo-workspace";

  return <WorkspaceContainer workspaceId={workspaceId} />;
}
