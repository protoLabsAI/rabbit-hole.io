/**
 * useWorkspaceLimits Hook Tests
 */

import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { describe, it, expect } from "vitest";
import * as Y from "yjs";

import { useWorkspaceLimits } from "../useWorkspaceLimits";

describe.skip("useWorkspaceLimits", () => {
  it("returns initial empty state", () => {
    const ydoc = new Y.Doc();
    ydoc.getArray("tabs"); // Initialize empty

    const { result } = renderHook(() => useWorkspaceLimits(ydoc, "FREE"));

    expect(result.current.ready).toBe(true);
    expect(result.current.usage?.totalEntities).toBe(0);
    expect(result.current.blocked.entities).toBe(false);
  });

  it("updates reactively when tabs change", async () => {
    const ydoc = new Y.Doc();
    const { result } = renderHook(() => useWorkspaceLimits(ydoc, "FREE"));

    expect(result.current.usage?.totalEntities).toBe(0);

    // Add entities
    act(() => {
      ydoc.getArray("tabs").push([
        {
          id: "tab1",
          canvasType: "graph",
          canvasData: { nodes: Array(45).fill({}) },
        },
      ]);
    });

    await waitFor(() => {
      expect(result.current.usage?.totalEntities).toBe(45);
      expect(result.current.warnings.entities).toBe(true); // >80% of 50
      expect(result.current.blocked.entities).toBe(false); // <100%
    });
  });

  it("detects blocked state at 100%", async () => {
    const ydoc = new Y.Doc();
    const { result } = renderHook(() => useWorkspaceLimits(ydoc, "FREE"));

    act(() => {
      ydoc.getArray("tabs").push([
        {
          id: "tab1",
          canvasType: "graph",
          canvasData: { nodes: Array(50).fill({}) },
        },
      ]);
    });

    await waitFor(() => {
      expect(result.current.usage?.totalEntities).toBe(50);
      expect(result.current.percentages.entities).toBe(100);
      expect(result.current.blocked.entities).toBe(true);
    });
  });

  it("handles unlimited tier", async () => {
    const ydoc = new Y.Doc();
    const { result } = renderHook(() => useWorkspaceLimits(ydoc, "ENTERPRISE"));

    act(() => {
      ydoc.getArray("tabs").push([
        {
          id: "tab1",
          canvasType: "graph",
          canvasData: { nodes: Array(10000).fill({}) },
        },
      ]);
    });

    await waitFor(() => {
      expect(result.current.usage?.totalEntities).toBe(10000);
      expect(result.current.percentages.entities).toBe(0); // Unlimited
      expect(result.current.blocked.entities).toBe(false);
    });
  });

  it("tracks multiple tabs correctly", async () => {
    const ydoc = new Y.Doc();
    const { result } = renderHook(() => useWorkspaceLimits(ydoc, "FREE"));

    act(() => {
      ydoc.getArray("tabs").push([
        {
          id: "tab1",
          canvasType: "graph",
          canvasData: { nodes: Array(20).fill({}), edges: Array(10).fill({}) },
        },
        {
          id: "tab2",
          canvasType: "graph",
          canvasData: { nodes: Array(25).fill({}), edges: Array(15).fill({}) },
        },
      ]);
    });

    await waitFor(() => {
      expect(result.current.usage?.totalEntities).toBe(45);
      expect(result.current.usage?.totalRelationships).toBe(25);
      expect(result.current.usage?.tabCount).toBe(2);
    });
  });

  it("returns null when ydoc is null", () => {
    const { result } = renderHook(() => useWorkspaceLimits(null, "FREE"));

    expect(result.current.ready).toBe(false);
    expect(result.current.usage).toBe(null);
  });
});
