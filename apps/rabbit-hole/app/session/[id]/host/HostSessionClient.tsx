"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useToast } from "@proto/ui/hooks";

import { ConfirmDialogProvider } from "@/research/components/ConfirmDialog";

import { HostSessionHeader } from "../../components/HostSessionHeader";
import { SessionCanvas } from "../../components/SessionCanvas";
import { SessionLinkModal } from "../../components/SessionLinkModal";

interface HostSessionClientProps {
  sessionId: string;
}

export default function HostSessionClient({
  sessionId,
}: HostSessionClientProps) {
  const userId = "local-user";
<<<<<<< HEAD
  const user = { id: "local-user", firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], primaryEmailAddress: { emailAddress: "local@localhost" } } as any;
  const organization = { id: "local-org", name: "Local Org" } as any;
=======
  const user = {
    id: "local-user",
    firstName: "Local",
    lastName: "User",
    username: "local-user",
    fullName: "Local User",
    emailAddresses: [{ emailAddress: "local@localhost" }],
    publicMetadata: { tier: "pro" },
    privateMetadata: { stats: {} },
    isSignedIn: true,
  };
  /* useOrganization removed - Clerk removed */
>>>>>>> origin/main
  const router = useRouter();
  const { toast } = useToast();

  const [shareLink, setShareLink] = useState("");
  const [participantCount, setParticipantCount] = useState(1);
  const [sessionData, setSessionData] = useState<{
    workspaceId: string;
    tabId: string;
  } | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);

  // Load session metadata and verify initialization
  useEffect(() => {
    if (!userId) return;

    let retryCount = 0;
    const maxRetries = 5;

    const fetchSession = async () => {
      try {
        const response = await fetch(
          `/api/collaboration/sessions/${sessionId}`
        );
        if (!response.ok) throw new Error("Session not found");

        const { session } = await response.json();

        // Verify user is the host
        if (session.ownerId !== userId) {
          toast({
            title: "Access Denied",
            description: "Only the session host can access this view",
            variant: "destructive",
          });
          router.push(`/session/${sessionId}`);
          return;
        }

        // Check if session Y.Doc exists
        const docCheck = await fetch(
          `/api/collaboration/sessions/${sessionId}/verify-data`
        );

        if (!docCheck.ok && retryCount < maxRetries) {
          // Data not ready yet, retry
          retryCount++;
          setTimeout(fetchSession, 200 * retryCount);
          return;
        }

        setSessionData({
          workspaceId: session.ownerWorkspaceId,
          tabId: session.tabId,
        });

        const origin = window.location.origin;
        const link = `${origin}/session/${sessionId}`;
        setShareLink(link);

        // Show modal on first load
        setShowLinkModal(true);
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to load session",
          variant: "destructive",
        });
        router.push("/research");
      }
    };

    fetchSession();
  }, [sessionId, userId, router, toast]);

  // Save session to workspace
  const handleSave = async () => {
    if (!sessionData) throw new Error("Session data not loaded");

    const response = await fetch("/api/workspace/tabs/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        workspaceId: sessionData.workspaceId,
        tabId: sessionData.tabId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to save");
    }
  };

  // End session and return to workspace
  const handleEnd = async () => {
    // End the session
    await fetch(`/api/collaboration/sessions/${sessionId}/end`, {
      method: "POST",
    });

    toast({
      title: "Session Ended",
      description: "Returning to workspace",
    });

    router.push("/research");
  };

  if (!userId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Sign in required</p>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <ConfirmDialogProvider>
      <SessionCanvas
        sessionId={sessionId}
        orgId={organization?.id || ""}
        role="host"
        header={
          <HostSessionHeader
            sessionId={sessionId}
            shareLink={shareLink}
            participantCount={participantCount}
            onSave={handleSave}
            onEnd={handleEnd}
          />
        }
        onDataChange={(data) => {
          // Track participants from canvas updates if needed
        }}
        onParticipantCountChange={setParticipantCount}
      />

      <SessionLinkModal
        open={showLinkModal}
        shareLink={shareLink}
        sessionId={sessionId}
        onClose={() => setShowLinkModal(false)}
      />
    </ConfirmDialogProvider>
  );
}
