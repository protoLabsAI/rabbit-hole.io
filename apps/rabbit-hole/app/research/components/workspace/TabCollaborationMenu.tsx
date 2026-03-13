"use client";

import { useState } from "react";

import { Icon } from "@proto/icon-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@proto/ui/atoms";
import { useToast } from "@proto/ui/hooks";

import {
  useCreateTabSession,
  useInitializeSession,
  useEndSession,
} from "../../hooks/queries/useCollaborationSessions";

import { SessionCreatedModal } from "./SessionCreatedModal";

interface TabCollaborationMenuProps {
  tabId: string;
  tabName?: string;
  workspaceId: string;
  workspaceReady?: boolean;
  activeSessionId?: string | null;
  canvasData?: any;
  canvasType?: string;
  onSessionCreated?: (sessionId: string, shareLink: string) => void;
  onEndSession?: () => void;
}

export function TabCollaborationMenu({
  tabId,
  tabName = "this tab",
  workspaceId,
  workspaceReady = false,
  activeSessionId,
  canvasData,
  canvasType = "graph",
  onSessionCreated,
  onEndSession,
}: TabCollaborationMenuProps) {
  const COLLABORATION_ENABLED = true;

  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [sessionData, setSessionData] = useState<{
    sessionId: string;
    shareLink: string;
    expiresAt: number;
  } | null>(null);

  // React Query mutations
  const createSession = useCreateTabSession();
  const initializeSession = useInitializeSession();
  const endSession = useEndSession();

  const handleStartCollaboration = async (importCanvas: boolean) => {
    if (!workspaceReady) {
      toast({
        title: "Workspace Loading",
        description:
          "Please wait for workspace to finish loading before starting collaboration.",
        variant: "default",
      });
      return;
    }

    // Create session
    const result = await createSession.mutateAsync({
      tabId,
      workspaceId,
      visibility: "edit",
    });

    // Initialize with canvas data if needed
    if (importCanvas && result.data?.session) {
      const currentCanvasData = canvasData || {
        graphData: { nodes: [], edges: [] },
      };

      await initializeSession.mutateAsync({
        sessionId: result.data.session.id,
        tabId,
        workspaceId,
        canvasData: currentCanvasData,
        canvasType: canvasType as any,
      });
    }

    // Callback notification
    if (result.data?.session && onSessionCreated) {
      onSessionCreated(result.data.session.id, result.data.shareLink);
    }

    // Note: Navigation to /session/{id}/host is handled in the mutation hook
  };

  const handleEndSession = async () => {
    if (!activeSessionId) return;

    await endSession.mutateAsync({ sessionId: activeSessionId });

    if (onEndSession) {
      onEndSession();
    }
  };

  const handleViewSession = () => {
    if (sessionData?.shareLink) {
      window.open(sessionData.shareLink, "_blank");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-2 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 relative"
            disabled={createSession.isPending || initializeSession.isPending}
            title={
              activeSessionId
                ? "Active collaboration session"
                : "Start collaboration"
            }
          >
            <Icon name="globe" size={16} />
            {activeSessionId && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Collaboration on {tabName}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {activeSessionId ? (
            <>
              <DropdownMenuItem onClick={handleViewSession}>
                <Icon name="external-link" size={14} />
                <span className="ml-2">View Session Link</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleEndSession}
                disabled={endSession.isPending}
                className="text-destructive focus:text-destructive"
              >
                <Icon name="x-circle" size={14} />
                <span className="ml-2">
                  {endSession.isPending ? "Ending..." : "End Session"}
                </span>
              </DropdownMenuItem>
            </>
          ) : COLLABORATION_ENABLED ? (
            <DropdownMenuItem
              onClick={() => handleStartCollaboration(true)}
              disabled={createSession.isPending || initializeSession.isPending}
            >
              <Icon name="user-plus" size={14} />
              <span className="ml-2">
                {createSession.isPending || initializeSession.isPending
                  ? "Creating..."
                  : "Start Collaboration"}
              </span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled>
              <Icon name="sparkles" size={14} />
              <span className="ml-2 text-muted-foreground">
                Collaboration (Coming Soon)
              </span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <Icon name="info" size={14} />
            <span className="ml-2 text-xs">Guest access only</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {sessionData && (
        <SessionCreatedModal
          open={modalOpen}
          sessionId={sessionData.sessionId}
          shareLink={sessionData.shareLink}
          expiresAt={sessionData.expiresAt}
          onClose={() => setModalOpen(false)}
          onEndSession={handleEndSession}
        />
      )}
    </>
  );
}
