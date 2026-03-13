/**
 * Integration Tests for Collaboration Session React Query Hooks
 *
 * Tests cache invalidation, optimistic updates, and error handling
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useCreateTabSession,
  useEndSession,
  useDeleteSession,
  useActiveSessions,
} from "../useCollaborationSessions";

// Mock Server Actions
vi.mock("../../../actions", () => ({
  createTabSession: vi.fn(),
  endCollaborationSession: vi.fn(),
  deleteCollaborationSession: vi.fn(),
  isActionSuccess: vi.fn((result) => result.status === 200),
  isActionTierLimit: vi.fn((result) => result.status === 402),
}));

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "TestWrapper";

  return Wrapper;
}

describe("useCreateTabSession", () => {
  let mockActions: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockActions = await import("../../../actions");
  });

  it("should create session and navigate on success", async () => {
    mockActions.createTabSession.mockResolvedValue({
      status: 200,
      data: {
        session: {
          id: "session-123",
          ownerId: "user-123",
          ownerWorkspaceId: "workspace-123",
          tabId: "tab-123",
          roomId: "room-123",
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
          expiresAt: Date.now() + 30 * 60 * 1000,
          status: "active",
          visibility: "edit",
          hasUnmergedChanges: false,
        },
        shareLink: "http://localhost:3000/session/session-123",
      },
    });

    const { result } = renderHook(() => useCreateTabSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        tabId: "tab-123",
        workspaceId: "workspace-123",
        visibility: "edit",
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockPush).toHaveBeenCalledWith("/session/session-123/host");
  });

  it("should handle tier limit errors", async () => {
    mockActions.createTabSession.mockResolvedValue({
      status: 402,
      error: "Requires Basic tier",
      limitType: "maxActiveSessions",
      tier: "free",
      upgradeUrl: "/pricing",
    });

    const { result } = renderHook(() => useCreateTabSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        tabId: "tab-123",
        workspaceId: "workspace-123",
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should not navigate on tier limit
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("useEndSession", () => {
  let mockActions: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockActions = await import("../../../actions");
  });

  it("should perform optimistic update", async () => {
    mockActions.endCollaborationSession.mockResolvedValue({
      status: 200,
      data: { success: true, message: "Session ended" },
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Pre-populate cache
    queryClient.setQueryData(["collaboration-session", "session-123"], {
      session: { id: "session-123", status: "active" },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useEndSession(), { wrapper });

    await act(async () => {
      result.current.mutate({ sessionId: "session-123" });
    });

    // Check optimistic update happened
    const cached = queryClient.getQueryData([
      "collaboration-session",
      "session-123",
    ]);
    expect((cached as any)?.session?.status).toBe("ended");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it("should rollback on error", async () => {
    mockActions.endCollaborationSession.mockRejectedValue(
      new Error("Network error")
    );

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const originalData = {
      session: { id: "session-123", status: "active" },
    };

    queryClient.setQueryData(
      ["collaboration-session", "session-123"],
      originalData
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useEndSession(), { wrapper });

    await act(async () => {
      result.current.mutate({ sessionId: "session-123" });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Should rollback to original data
    const cached = queryClient.getQueryData([
      "collaboration-session",
      "session-123",
    ]);
    expect(cached).toEqual(originalData);
  });
});

describe("useDeleteSession", () => {
  let mockActions: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockActions = await import("../../../actions");
  });

  it("should optimistically remove session from list", async () => {
    mockActions.deleteCollaborationSession.mockResolvedValue({
      status: 200,
      data: { success: true },
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const sessionsData = {
      sessions: [
        { id: "session-1", status: "ended" },
        { id: "session-2", status: "ended" },
      ],
    };

    queryClient.setQueryData(
      ["collaboration-sessions", "active"],
      sessionsData
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDeleteSession(), { wrapper });

    await act(async () => {
      result.current.mutate({ sessionId: "session-1" });
    });

    // Check optimistic removal
    const cached: any = queryClient.getQueryData([
      "collaboration-sessions",
      "active",
    ]);
    expect(cached.sessions).toHaveLength(1);
    expect(cached.sessions[0].id).toBe("session-2");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it("should rollback on delete error", async () => {
    mockActions.deleteCollaborationSession.mockRejectedValue(
      new Error("Delete failed")
    );

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const originalSessions = {
      sessions: [
        { id: "session-1", status: "ended" },
        { id: "session-2", status: "ended" },
      ],
    };

    queryClient.setQueryData(
      ["collaboration-sessions", "active"],
      originalSessions
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDeleteSession(), { wrapper });

    await act(async () => {
      result.current.mutate({ sessionId: "session-1" });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Should rollback to original
    const cached = queryClient.getQueryData([
      "collaboration-sessions",
      "active",
    ]);
    expect(cached).toEqual(originalSessions);
  });
});

describe("useActiveSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should fetch active sessions", async () => {
    const mockSessions = {
      sessions: [
        { id: "session-1", status: "active" },
        { id: "session-2", status: "active" },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockSessions,
    });

    const { result } = renderHook(() => useActiveSessions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSessions);
  });

  it("should handle fetch errors", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useActiveSessions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
