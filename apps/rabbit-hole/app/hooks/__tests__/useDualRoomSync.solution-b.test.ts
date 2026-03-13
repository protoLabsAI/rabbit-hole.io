/**
 * Tests for Solution B (Explicit Sync Trigger Workaround)
 *
 * This test file validates the temporary workaround using CustomEvents
 * to trigger sync between workspace and session rooms.
 *
 * TODO: Remove this file when Y.Map migration is complete
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as Y from "yjs";

import { useDualRoomSync } from "../useDualRoomSync";

describe.skip("useDualRoomSync - Solution B (Explicit Sync)", () => {
  let workspaceYdoc: Y.Doc;
  let sessionYdoc: Y.Doc;
  let mockEventListener: EventListener | null = null;

  beforeEach(() => {
    workspaceYdoc = new Y.Doc();
    sessionYdoc = new Y.Doc();

    // Setup workspace structure
    const yTabs = workspaceYdoc.getArray("tabs");
    yTabs.push([
      {
        id: "test-tab",
        name: "Test Tab",
        canvasType: "graph",
        canvasData: { graphData: { nodes: [], edges: [] } },
        roomId: "test-room",
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: "test-user",
        },
      },
    ]);

    // Spy on addEventListener to capture our handler
    vi.spyOn(window, "addEventListener").mockImplementation(
      (event, handler) => {
        if (event === "workspace-tab-updated") {
          mockEventListener = handler as EventListener;
        }
      }
    );

    vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockEventListener = null;
  });

  it("should attach explicit sync event listener on mount", () => {
    renderHook(() =>
      useDualRoomSync({
        workspaceYdoc,
        sessionYdoc,
        tabId: "test-tab",
        enabled: true,
      })
    );

    expect(window.addEventListener).toHaveBeenCalledWith(
      "workspace-tab-updated",
      expect.any(Function)
    );
    expect(mockEventListener).not.toBeNull();
  });

  it("should remove explicit sync event listener on unmount", () => {
    const { unmount } = renderHook(() =>
      useDualRoomSync({
        workspaceYdoc,
        sessionYdoc,
        tabId: "test-tab",
        enabled: true,
      })
    );

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith(
      "workspace-tab-updated",
      expect.any(Function)
    );
  });

  it("should sync canvas data when explicit event is fired", () => {
    renderHook(() =>
      useDualRoomSync({
        workspaceYdoc,
        sessionYdoc,
        tabId: "test-tab",
        enabled: true,
      })
    );

    const newCanvasData = {
      graphData: {
        nodes: [{ id: "node-1", type: "person", label: "Test" }],
        edges: [],
      },
    };

    // Fire explicit sync event
    act(() => {
      window.dispatchEvent(
        new CustomEvent("workspace-tab-updated", {
          detail: {
            tabId: "test-tab",
            canvasData: newCanvasData,
            userId: "test-user",
          },
        })
      );
    });

    // Verify session doc was updated
    const sessionTab = sessionYdoc.getMap("tab");
    const syncedData = sessionTab.get("canvasData");

    expect(syncedData).toEqual(newCanvasData);
    expect(sessionTab.get("updatedAt")).toBeDefined();
  });

  it("should ignore events for different tabs", () => {
    renderHook(() =>
      useDualRoomSync({
        workspaceYdoc,
        sessionYdoc,
        tabId: "test-tab",
        enabled: true,
      })
    );

    const sessionTab = sessionYdoc.getMap("tab");
    const originalData = sessionTab.get("canvasData");

    // Fire event for different tab
    act(() => {
      window.dispatchEvent(
        new CustomEvent("workspace-tab-updated", {
          detail: {
            tabId: "different-tab", // Different tab ID
            canvasData: {
              graphData: { nodes: [{ id: "should-not-sync" }], edges: [] },
            },
            userId: "test-user",
          },
        })
      );
    });

    // Session should not have been updated
    expect(sessionTab.get("canvasData")).toEqual(originalData);
  });

  it("should prevent concurrent syncs", () => {
    const consoleSpy = vi.spyOn(console, "log");

    renderHook(() =>
      useDualRoomSync({
        workspaceYdoc,
        sessionYdoc,
        tabId: "test-tab",
        enabled: true,
      })
    );

    const canvasData1 = {
      graphData: { nodes: [{ id: "1" }], edges: [] },
    };
    const canvasData2 = {
      graphData: { nodes: [{ id: "1" }, { id: "2" }], edges: [] },
    };

    // Fire two events rapidly
    act(() => {
      window.dispatchEvent(
        new CustomEvent("workspace-tab-updated", {
          detail: {
            tabId: "test-tab",
            canvasData: canvasData1,
            userId: "test-user",
          },
        })
      );

      // Immediately fire second event
      window.dispatchEvent(
        new CustomEvent("workspace-tab-updated", {
          detail: {
            tabId: "test-tab",
            canvasData: canvasData2,
            userId: "test-user",
          },
        })
      );
    });

    // Should see skip message for concurrent sync
    const skipMessages = consoleSpy.mock.calls.filter(
      (call) => call[0] === "⏭️ Explicit sync skipped - already in progress"
    );

    expect(skipMessages.length).toBeGreaterThan(0);

    consoleSpy.mockRestore();
  });

  it("should handle sync errors gracefully", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Create a session doc that will throw on transact
    const brokenSessionYdoc = new Y.Doc();
    vi.spyOn(brokenSessionYdoc, "transact").mockImplementation(() => {
      throw new Error("Sync error");
    });

    renderHook(() =>
      useDualRoomSync({
        workspaceYdoc,
        sessionYdoc: brokenSessionYdoc,
        tabId: "test-tab",
        enabled: true,
      })
    );

    const canvasData = {
      graphData: { nodes: [], edges: [] },
    };

    // Fire event - should not throw
    expect(() => {
      act(() => {
        window.dispatchEvent(
          new CustomEvent("workspace-tab-updated", {
            detail: { tabId: "test-tab", canvasData, userId: "test-user" },
          })
        );
      });
    }).not.toThrow();

    // Should log error
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ Explicit sync error:",
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it("should not attach listener when disabled", () => {
    vi.clearAllMocks();

    renderHook(() =>
      useDualRoomSync({
        workspaceYdoc,
        sessionYdoc,
        tabId: "test-tab",
        enabled: false, // Disabled
      })
    );

    expect(window.addEventListener).not.toHaveBeenCalled();
  });

  it("should sync complex canvas data correctly", () => {
    renderHook(() =>
      useDualRoomSync({
        workspaceYdoc,
        sessionYdoc,
        tabId: "test-tab",
        enabled: true,
      })
    );

    const complexData = {
      graphData: {
        nodes: [
          { id: "1", type: "person", label: "Alice", x: 100, y: 200 },
          { id: "2", type: "organization", label: "ACME Corp", x: 300, y: 200 },
        ],
        edges: [{ id: "e1", source: "1", target: "2", label: "works_at" }],
      },
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedNodes: ["1"],
    };

    act(() => {
      window.dispatchEvent(
        new CustomEvent("workspace-tab-updated", {
          detail: {
            tabId: "test-tab",
            canvasData: complexData,
            userId: "test-user",
          },
        })
      );
    });

    const sessionTab = sessionYdoc.getMap("tab");
    const syncedData = sessionTab.get("canvasData");

    expect(syncedData).toEqual(complexData);
    expect(syncedData.graphData.nodes).toHaveLength(2);
    expect(syncedData.graphData.edges).toHaveLength(1);
  });
});
