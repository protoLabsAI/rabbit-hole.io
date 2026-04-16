/**
 * Workspace Header
 *
 * Shows tier, workspace scope, and sync status
 */

import Link from "next/link";

import { getUserTierClient, getTierLabel } from "@protolabsai/auth/client";
import { Badge, Button } from "@protolabsai/ui/atoms";

interface WorkspaceHeaderProps {
  workspaceId: string;
}

export function WorkspaceHeader({ workspaceId }: WorkspaceHeaderProps) {
  const user = {
    id: "local-user",
    firstName: "Local",
    lastName: "User",
    fullName: "Local User",
    imageUrl: "",
    publicMetadata: { tier: "free", role: "admin" },
    emailAddresses: [{ emailAddress: "local@localhost" }],
    primaryEmailAddress: { emailAddress: "local@localhost" },
  } as any;
  const tier = getUserTierClient(user || null);
  const tierLabel = getTierLabel(tier);

  // Inline sync strategy logic
  const syncStrategy = {
    usesHocuspocus: tier !== "free",
    canSync: tier !== "free",
    syncLabel: tier === "free" ? "Local Only" : "Synced",
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
      <div className="flex items-center gap-3">
        {/* Tier Badge */}
        <Badge variant="outline" className="text-xs font-medium">
          {tierLabel}
        </Badge>

        {/* Workspace Type */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Personal Workspace</span>
        </div>

        {/* Sync Status */}
        <Badge
          variant={syncStrategy.canSync ? "default" : "secondary"}
          className="text-xs"
        >
          {syncStrategy.syncLabel}
        </Badge>
      </div>

      {/* Upgrade CTA for Free tier */}
      {tier === "free" && (
        <Button variant="outline" size="sm" asChild>
          <Link href="/pricing">Upgrade for Sync & Collaboration</Link>
        </Button>
      )}
    </div>
  );
}
