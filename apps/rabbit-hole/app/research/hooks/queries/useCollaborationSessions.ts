"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createCollaborationSession,
  createTabSession,
  initializeSessionData,
  endCollaborationSession,
  deleteCollaborationSession,
  isActionSuccess,
  isActionTierLimit,
} from "../../actions";

// Query: Fetch Active Sessions
export function useActiveSessions() {
  return useQuery({
    queryKey: ["collaboration-sessions", "active"],
    queryFn: async () => {
      const response = await fetch("/api/collaboration/sessions/my-sessions");
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }
      return response.json();
    },
    refetchInterval: 10000, // Poll every 10 seconds
    staleTime: 5000,
  });
}

// Query: Fetch Session Details
export function useSessionDetails(sessionId: string | null) {
  return useQuery({
    queryKey: ["collaboration-session", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const response = await fetch(`/api/collaboration/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch session");
      }
      return response.json();
    },
    enabled: !!sessionId,
    staleTime: 60000, // Cache for 1 minute
  });
}

// Mutation: Create Session
export function useCreateSession() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: createCollaborationSession,
    onSuccess: (result) => {
      if (!isActionSuccess(result)) {
        // Handle tier limit errors
        if (isActionTierLimit(result)) {
          toast.error(result.error, {
            description: "Upgrade to use collaboration features",
            action: {
              label: "Upgrade",
              onClick: () => router.push(result.upgradeUrl),
            },
          });
          return;
        }

        toast.error(result.error);
        return;
      }

      // Invalidate sessions list
      queryClient.invalidateQueries({
        queryKey: ["collaboration-sessions"],
      });

      toast.success("Session created!");

      // Navigate to session host page
      if (result.data?.session?.id) {
        router.push(`/session/${result.data.session.id}/host`);
      }
    },
    onError: (error) => {
      console.error("Failed to create session:", error);
      toast.error("Failed to create session");
    },
  });
}

// Mutation: Create Tab Session
export function useCreateTabSession() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: createTabSession,
    onSuccess: (result) => {
      if (!isActionSuccess(result)) {
        if (isActionTierLimit(result)) {
          toast.error(result.error, {
            description: "Upgrade to use collaboration features",
            action: {
              label: "Upgrade",
              onClick: () => router.push(result.upgradeUrl),
            },
          });
          return;
        }

        toast.error(result.error);
        return;
      }

      queryClient.invalidateQueries({
        queryKey: ["collaboration-sessions"],
      });

      toast.success("Session created!");

      if (result.data?.session?.id) {
        router.push(`/session/${result.data.session.id}/host`);
      }
    },
    onError: (error) => {
      console.error("Failed to create tab session:", error);
      toast.error("Failed to create session");
    },
  });
}

// Mutation: Initialize Session Data
export function useInitializeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: initializeSessionData,
    onSuccess: (result, variables) => {
      if (!isActionSuccess(result)) {
        toast.error(result.error);
        return;
      }

      queryClient.invalidateQueries({
        queryKey: ["collaboration-session", variables.sessionId],
      });

      toast.success("Session initialized");
    },
    onError: (error) => {
      console.error("Failed to initialize session:", error);
      toast.error("Failed to initialize session");
    },
  });
}

// Mutation: End Session
export function useEndSession() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: endCollaborationSession,
    onMutate: async (input) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: ["collaboration-session", input.sessionId],
      });

      // Snapshot previous value
      const previous = queryClient.getQueryData([
        "collaboration-session",
        input.sessionId,
      ]);

      // Optimistic update
      queryClient.setQueryData(
        ["collaboration-session", input.sessionId],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            session: { ...old.session, status: "ended" },
          };
        }
      );

      return { previous };
    },
    onSuccess: (result, variables) => {
      if (!isActionSuccess(result)) {
        toast.error(result.error);
        return;
      }

      // Invalidate sessions list
      queryClient.invalidateQueries({
        queryKey: ["collaboration-sessions"],
      });

      toast.success("Session ended");
      router.push("/research");
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previous) {
        queryClient.setQueryData(
          ["collaboration-session", variables.sessionId],
          context.previous
        );
      }

      console.error("Failed to end session:", error);
      toast.error("Failed to end session");
    },
  });
}

// Mutation: Delete Session
export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCollaborationSession,
    onMutate: async (input) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: ["collaboration-sessions"],
      });

      // Snapshot previous value
      const previous = queryClient.getQueryData([
        "collaboration-sessions",
        "active",
      ]);

      // Optimistically remove from list
      queryClient.setQueryData(
        ["collaboration-sessions", "active"],
        (old: any) => {
          if (!old?.sessions) return old;
          return {
            ...old,
            sessions: old.sessions.filter((s: any) => s.id !== input.sessionId),
          };
        }
      );

      return { previous };
    },
    onSuccess: (result) => {
      if (!isActionSuccess(result)) {
        toast.error(result.error);
        return;
      }

      // Invalidate to refetch
      queryClient.invalidateQueries({
        queryKey: ["collaboration-sessions"],
      });

      toast.success("Session deleted");
    },
    onError: (error, variables, context) => {
      // Rollback
      if (context?.previous) {
        queryClient.setQueryData(
          ["collaboration-sessions", "active"],
          context.previous
        );
      }

      console.error("Failed to delete session:", error);
      toast.error("Failed to delete session");
    },
  });
}
