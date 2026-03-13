import { cleanup, renderHook } from "@testing-library/react";
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { useUIStore } from "../../context/store/useUIStore";
import { useContextMenu, ContextMenuProvider } from "../core/hooks";

// Mock Next.js dependencies
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => "/test",
}));

describe.skip("ContextMenuStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useUIStore.setState({
      contextMenu: {
        isOpen: false,
        type: "background",
        x: 0,
        y: 0,
        context: undefined,
        routeActions: {},
      },
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  describe("Initial State", () => {
    it("should start with closed state", () => {
      const state = useUIStore.getState();
      expect(state.contextMenu.isOpen).toBe(false);
      expect(state.contextMenu.type).toBe("background");
      expect(state.contextMenu.x).toBe(0);
      expect(state.contextMenu.y).toBe(0);
    });
  });

  describe("Actions", () => {
    it("should open context menu with position data", () => {
      const { openContextMenu } = useUIStore.getState();

      openContextMenu("node", 100, 200, { id: "test-node" });

      const state = useUIStore.getState();
      expect(state.contextMenu.isOpen).toBe(true);
      expect(state.contextMenu.type).toBe("node");
      expect(state.contextMenu.x).toBe(100);
      expect(state.contextMenu.y).toBe(200);
      expect(state.contextMenu.context).toEqual({ id: "test-node" });
    });

    it("should close context menu", () => {
      const { openContextMenu, closeContextMenu } = useUIStore.getState();

      // Open menu first
      openContextMenu("node", 100, 200);
      expect(useUIStore.getState().contextMenu.isOpen).toBe(true);

      // Then close it
      closeContextMenu();
      expect(useUIStore.getState().contextMenu.isOpen).toBe(false);
    });

    it("should set route actions", () => {
      const testActions = {
        createNode: vi.fn(),
        deleteNode: vi.fn(),
      };

      const { setContextMenuActions } = useUIStore.getState();
      setContextMenuActions(testActions);

      expect(useUIStore.getState().contextMenu.routeActions).toEqual(
        testActions
      );
    });
  });

  describe("useContextMenu Hook", () => {
    it("should return context menu state and actions", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ContextMenuProvider>{children}</ContextMenuProvider>
      );
      const { result } = renderHook(() => useContextMenu(), { wrapper });

      expect(result.current.contextMenu).toMatchObject({
        isOpen: false,
        type: "background",
        x: 0,
        y: 0,
      });
      expect(typeof result.current.openContextMenu).toBe("function");
      expect(typeof result.current.closeContextMenu).toBe("function");
      expect(typeof result.current.setActions).toBe("function");
      expect(result.current.actions).toEqual({});
    });

    it("should update when context menu opens", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ContextMenuProvider>{children}</ContextMenuProvider>
      );
      const { result } = renderHook(() => useContextMenu(), { wrapper });

      result.current.openContextMenu("node", 150, 250, { id: "node-123" });

      expect(result.current.contextMenu).toMatchObject({
        isOpen: true,
        type: "node",
        x: 150,
        y: 250,
        context: { id: "node-123" },
      });
    });

    it("should update actions when set", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ContextMenuProvider>{children}</ContextMenuProvider>
      );
      const { result } = renderHook(() => useContextMenu(), { wrapper });

      const testActions = { testAction: vi.fn() };
      result.current.setActions(testActions);

      expect(result.current.actions).toEqual(testActions);
    });
  });
});
