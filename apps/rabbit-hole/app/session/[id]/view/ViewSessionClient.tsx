"use client";

import { useAuth, useOrganization, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getUserTierClient, getTierLimitsClient } from "@proto/auth/client";
import { useToast } from "@proto/ui/hooks";

import { ConfirmDialogProvider } from "@/research/components/ConfirmDialog";

import { GuestSessionHeader } from "../../components/GuestSessionHeader";
import { SessionCanvas } from "../../components/SessionCanvas";

interface ViewSessionClientProps {
  sessionId: string;
}

export default function ViewSessionClient({
  sessionId,
}: ViewSessionClientProps) {
  const { userId } = useAuth();
  const { user } = useUser();
  const { organization } = useOrganization();
  const router = useRouter();
  const { toast } = useToast();
  const [role, setRole] = useState<"guest" | "viewer">("guest");
  const [participantCount, setParticipantCount] = useState(1);

  // Check tier for save capability
  const tier = getUserTierClient(user || null);
  const limits = getTierLimitsClient(tier);
  const canSaveToWorkspace =
    limits.workspaces > 0 && limits.canvasPerWorkspace > 0;

  const handleSave = async () => {
    const response = await fetch("/api/workspace/tabs/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        workspaceId: "default",
        createNewTab: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to save");
    }

    toast({
      title: "Saved",
      description: "Session saved to your workspace. Visit /research to view.",
    });
  };

  const handleLeave = async () => {
    await fetch(`/api/collaboration/sessions/${sessionId}/leave`, {
      method: "POST",
    });

    toast({
      title: "Left Session",
      description: "You have left the collaboration session",
    });

    router.push("/");
  };

  return (
    <ConfirmDialogProvider>
      <SessionCanvas
        sessionId={sessionId}
        orgId={organization?.id || ""}
        role={role}
        header={
          <GuestSessionHeader
            sessionId={sessionId}
            role={role}
            participantCount={participantCount}
            canSaveToWorkspace={canSaveToWorkspace}
            onSave={canSaveToWorkspace ? handleSave : undefined}
            onLeave={handleLeave}
          />
        }
        onParticipantCountChange={setParticipantCount}
      />
    </ConfirmDialogProvider>
  );
}
