/**
 * Tests for useDualRoomSync Hook
 * Bidirectional sync between workspace and session rooms
 */

import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as Y from "yjs";

import { useDualRoomSync } from "../useDualRoomSync";

describe.skip("useDualRoomSync", () => {
  let workspaceYdoc: Y.Doc;
  let sessionYdoc: Y.Doc;

  beforeEach(() => {
    workspaceYdoc = new Y.Doc();
    sessionYdoc = new Y.Doc();
  });

  afterEach(() => {
    workspaceYdoc.destroy();
    sessionYdoc.destroy();
  });

  it("syncs workspace → session on initial connect", () => {
    // Add data to workspace first
    const workspaceMap = workspaceYdoc.getMap("test");
    workspaceMap.set("key", "value");

    renderHook(() =>
      useDualRoomSync({
        workspaceYdoc,
        sessionYdoc,
        tabId: "tab-123",
        enabled: true,
      })
    );

    // Session should have the data
    const sessionMap = sessionYdoc.getMap("test");
    expect(sessionMap.get("key")).toBe("value");
  });

  it("syncs workspace → session on change", () => {
    renderHook(() =>
      useDualRoomSync({
        workspaceYdoc,
        sessionYdoc,
        tabId: "tab-123",
        enabled: true,
      })
    );

    // Change workspace
    const workspaceMap = workspaceYdoc.getMap("test");
    workspaceMap.set("new", "data");

    // Should sync to session
    const sessionMap = sessionYdoc.getMap("test");
    expect(sessionMap.get("new")).toBe("data");
  });

  it("syncs session → workspace on change", () => {
    renderHook(() =>
      useDualRoomSync({
        workspaceYdoc,
        sessionYdoc,
        tabId: "tab-123",
        enabled: true,
      })
    );

    // Change session (Guest edit)
    const sessionMap = sessionYdoc.getMap("test");
    sessionMap.set("guest", "edit");

    // Should sync to workspace
    const workspaceMap = workspaceYdoc.getMap("test");
    expect(workspaceMap.get("guest")).toBe("edit");
  });

  it("prevents feedback loops", () => {
    const updateSpy = vi.fn();
    workspaceYdoc.on("update", updateSpy);

    renderHook(() =>
      useDualRoomSync({
        workspaceYdoc,
        sessionYdoc,
        tabId: "tab-123",
        enabled: true,
      })
    );

    // Clear initial sync calls
    updateSpy.mockClear();

    // Make change
    const workspaceMap = workspaceYdoc.getMap("test");
    workspaceMap.set("test", "value");

    // Should only trigger once, not loop
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

  it("does not sync when disabled", () => {
    renderHook(() =>
      useDualRoomSync({
        workspaceYdoc,
        sessionYdoc,
        tabId: "tab-123",
        enabled: false,
      })
    );

    // Change workspace
    const workspaceMap = workspaceYdoc.getMap("test");
    workspaceMap.set("key", "value");

    // Should NOT sync to session
    const sessionMap = sessionYdoc.getMap("test");
    expect(sessionMap.get("key")).toBeUndefined();
  });

  it("cleans up listeners on unmount", () => {
    const { unmount } = renderHook(() =>
      useDualRoomSync({
        workspaceYdoc,
        sessionYdoc,
        tabId: "tab-123",
        enabled: true,
      })
    );

    unmount();

    // Change workspace after unmount
    const workspaceMap = workspaceYdoc.getMap("test");
    workspaceMap.set("after", "unmount");

    // Should NOT sync (listeners removed)
    const sessionMap = sessionYdoc.getMap("test");
    expect(sessionMap.get("after")).toBeUndefined();
  });
});
