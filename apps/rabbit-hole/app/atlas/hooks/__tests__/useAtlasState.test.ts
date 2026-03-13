/**
 * Tests for useAtlasState Hook
 *
 * Tests core UI state management including node selection, loading states, and form visibility
 * @vitest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react";
import { describe, test, expect } from "vitest";

import { useAtlasState } from "../useAtlasState";

describe.skip("useAtlasState", () => {
  test("initializes with correct default values", () => {
    const { result } = renderHook(() => useAtlasState());

    expect(result.current.selectedNode).toBe(null);
    expect(result.current.selectedNodeDetails).toBe(null);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isLoadingNodeDetails).toBe(false);
    expect(result.current.showAddForm).toBe(false);
    expect(result.current.showBulkImport).toBe(false);
    expect(result.current.existingEntities).toEqual([]);
  });

  test("setSelectedNode updates both selected node and clears details", () => {
    const { result } = renderHook(() => useAtlasState());

    const mockNode = { id: "1", label: "Test Node", entityType: "person" };

    act(() => {
      result.current.setSelectedNode(mockNode);
    });

    expect(result.current.selectedNode).toBe(mockNode);
    expect(result.current.selectedNodeDetails).toBe(null); // Should clear details when node changes
  });

  test("setSelectedNodeDetails updates details", () => {
    const { result } = renderHook(() => useAtlasState());

    const mockDetails = {
      id: "1",
      label: "Test Node",
      details: { bio: "Test bio" },
      relationships: [],
      evidence: [],
    };

    act(() => {
      result.current.setSelectedNodeDetails(mockDetails);
    });

    expect(result.current.selectedNodeDetails).toBe(mockDetails);
  });

  test("clearSelection clears both node and details", () => {
    const { result } = renderHook(() => useAtlasState());

    // Set some state first
    act(() => {
      result.current.setSelectedNode({
        id: "1",
        label: "Test",
        entityType: "person",
      });
      result.current.setSelectedNodeDetails({ id: "1", details: {} });
    });

    // Clear selection
    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedNode).toBe(null);
    expect(result.current.selectedNodeDetails).toBe(null);
  });

  test("loading states can be controlled independently", () => {
    const { result } = renderHook(() => useAtlasState());

    act(() => {
      result.current.setIsLoading(false);
      result.current.setIsLoadingNodeDetails(true);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isLoadingNodeDetails).toBe(true);
  });

  test("form visibility states work correctly", () => {
    const { result } = renderHook(() => useAtlasState());

    act(() => {
      result.current.setShowAddForm(true);
      result.current.setShowBulkImport(true);
    });

    expect(result.current.showAddForm).toBe(true);
    expect(result.current.showBulkImport).toBe(true);
  });

  test("existing entities can be updated", () => {
    const { result } = renderHook(() => useAtlasState());

    const mockEntities = [
      { id: "1", label: "Alice", entityType: "person" },
      { id: "2", label: "Bob", entityType: "person" },
    ];

    act(() => {
      result.current.setExistingEntities(mockEntities);
    });

    expect(result.current.existingEntities).toEqual(mockEntities);
    expect(result.current.existingEntities).toHaveLength(2);
  });

  test("openAddForm sets show state and clears selection", () => {
    const { result } = renderHook(() => useAtlasState());

    // Set some selected state first
    act(() => {
      result.current.setSelectedNode({
        id: "1",
        label: "Test",
        entityType: "person",
      });
    });

    act(() => {
      result.current.openAddForm();
    });

    expect(result.current.showAddForm).toBe(true);
    expect(result.current.selectedNode).toBe(null); // Should clear selection when opening form
  });

  test("closeAddForm closes form", () => {
    const { result } = renderHook(() => useAtlasState());

    // Open form first
    act(() => {
      result.current.openAddForm();
    });

    act(() => {
      result.current.closeAddForm();
    });

    expect(result.current.showAddForm).toBe(false);
  });

  test("openBulkImport and closeBulkImport work correctly", () => {
    const { result } = renderHook(() => useAtlasState());

    act(() => {
      result.current.openBulkImport();
    });

    expect(result.current.showBulkImport).toBe(true);

    act(() => {
      result.current.closeBulkImport();
    });

    expect(result.current.showBulkImport).toBe(false);
  });

  test("updateExistingEntitiesFromGraphData extracts entities correctly", () => {
    const { result } = renderHook(() => useAtlasState());

    const mockGraphData = {
      nodes: [
        { id: "1", label: "Alice", entityType: "person" },
        { id: "2", label: "TechCorp", entityType: "organization" },
      ],
      edges: [],
      meta: { nodeCount: 2, edgeCount: 0, generatedAt: "2024-01-01" },
    };

    act(() => {
      result.current.updateExistingEntitiesFromGraphData(mockGraphData);
    });

    expect(result.current.existingEntities).toEqual([
      { id: "1", label: "Alice", entityType: "person" },
      { id: "2", label: "TechCorp", entityType: "organization" },
    ]);
  });

  test("startLoading sets loading state and clears previous data", () => {
    const { result } = renderHook(() => useAtlasState());

    // Set some state first
    act(() => {
      result.current.setSelectedNode({
        id: "1",
        label: "Test",
        entityType: "person",
      });
      result.current.setIsLoading(false);
    });

    act(() => {
      result.current.startLoading();
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.selectedNode).toBe(null); // Should clear selection when starting new load
    expect(result.current.selectedNodeDetails).toBe(null);
  });

  test("finishLoading sets loading to false", () => {
    const { result } = renderHook(() => useAtlasState());

    act(() => {
      result.current.startLoading();
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.finishLoading();
    });

    expect(result.current.isLoading).toBe(false);
  });
});
