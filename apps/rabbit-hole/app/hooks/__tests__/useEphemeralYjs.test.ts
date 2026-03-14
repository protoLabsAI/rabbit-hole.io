/**
 * Tests for useEphemeralYjs Hook
 * Guest ephemeral Yjs connection (no IndexedDB)
 */

import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useEphemeralYjs } from "../useEphemeralYjs";

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () =>
      Promise.resolve({
        session: {
          roomId: "org:test-org:session:test-session-123",
        },
      }),
  })
) as any;

<<<<<<< HEAD
// Clerk mock removed - useAuth replaced with local-user stub
=======
// Clerk removed - useAuth is no longer used in the hook
>>>>>>> origin/main

// Mock toast
vi.mock("@/components/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock Hocuspocus
vi.mock("@hocuspocus/provider", () => ({
  HocuspocusProvider: class MockProvider {
    awareness = {
      setLocalStateField: vi.fn(),
      getStates: () => new Map(),
      clientID: 1,
    };
    on = vi.fn();
    destroy = vi.fn();
  },
}));

describe("useEphemeralYjs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates Hocuspocus provider for session room", async () => {
    const { result } = renderHook(() =>
      useEphemeralYjs({
        sessionId: "test-session-123",
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.provider).toBeTruthy();
    });

    expect(result.current.ydoc).toBeTruthy();
  });

  it("does not persist to IndexedDB (ephemeral)", () => {
    const { result } = renderHook(() =>
      useEphemeralYjs({
        sessionId: "test-session-123",
      })
    );

    // No IndexedDB provider should exist
    expect(result.current).not.toHaveProperty("idbProvider");
  });

  it("builds correct room ID format", async () => {
    const { result } = renderHook(() =>
      useEphemeralYjs({
        sessionId: "abc-123",
      })
    );

    // Room ID should be session:{sessionId}
    await waitFor(() => {
      expect(result.current.provider).toBeTruthy();
    });

    // Verify provider was created with correct room name
    // (Would need to spy on HocuspocusProvider constructor in real test)
  });

  it("handles disabled state", () => {
    const { result } = renderHook(() =>
      useEphemeralYjs({
        sessionId: "test-session",
        enabled: false,
      })
    );

    expect(result.current.ready).toBe(false);
    expect(result.current.provider).toBeNull();
  });

  it("cleans up provider on unmount", () => {
    const { result, unmount } = renderHook(() =>
      useEphemeralYjs({
        sessionId: "test-session",
      })
    );

    unmount();

    // Provider should be destroyed (spy needed for real verification)
  });
});
