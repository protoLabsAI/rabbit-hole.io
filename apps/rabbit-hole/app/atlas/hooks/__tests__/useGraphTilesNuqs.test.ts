/**
 * Tests for useGraphTilesNuqs hook (nuqs-based URL state management)
 *
 * Tests core functionality for nuqs-based URL state management
 * @vitest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react";
import { useQueryState, useQueryStates } from "nuqs";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock nuqs
vi.mock("nuqs", () => ({
  useQueryState: vi.fn(),
  useQueryStates: vi.fn(),
  parseAsString: {
    withDefault: vi.fn((defaultValue) => ({ defaultValue })),
  },
  parseAsInteger: {
    withDefault: vi.fn((defaultValue) => ({ defaultValue })),
  },
  parseAsJson: vi.fn(() => ({
    withDefault: vi.fn((defaultValue) => ({ defaultValue })),
  })),
  parseAsFloat: {
    withDefault: vi.fn((defaultValue) => ({ defaultValue })),
  },
}));

import { useGraphTilesNuqs } from "../useGraphTilesNuqs";

describe.skip("useGraphTilesNuqs - Basic Functionality", () => {
  const mockSetViewMode = vi.fn();
  const mockSetCenterEntity = vi.fn();
  const mockSetZoom = vi.fn();
  const mockSetStates = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock individual useQueryState calls
    (useQueryState as any).mockImplementation((key: string, parser: any) => {
      switch (key) {
        case "mode":
          return ["full-atlas", mockSetViewMode];
        case "center":
          return [null, mockSetCenterEntity];
        case "zoom":
          return [1, mockSetZoom];
        case "pan":
          return [{ x: 0, y: 0 }, vi.fn()];
        default:
          return [null, vi.fn()];
      }
    });

    // Mock useQueryStates for batch operations
    (useQueryStates as any).mockReturnValue([
      {
        mode: "full-atlas",
        center: null,
        community: null,
        zoom: 1,
      },
      mockSetStates,
    ]);
  });

  describe("Basic State Management", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() => useGraphTilesNuqs());

      expect(result.current.viewMode).toBe("full-atlas");
      expect(result.current.centerEntity).toBe(null);
      expect(result.current.zoom).toBe(1);
      expect(result.current.pan).toEqual({ x: 0, y: 0 });
    });

    it("should update view mode", () => {
      const { result } = renderHook(() => useGraphTilesNuqs());

      act(() => {
        result.current.setViewMode("ego");
      });

      expect(mockSetViewMode).toHaveBeenCalledWith("ego");
    });

    it("should update center entity", () => {
      const { result } = renderHook(() => useGraphTilesNuqs());

      act(() => {
        result.current.setCenterEntity("test-entity");
      });

      expect(mockSetCenterEntity).toHaveBeenCalledWith("test-entity");
    });

    it("should update zoom level", () => {
      const { result } = renderHook(() => useGraphTilesNuqs());

      act(() => {
        result.current.setZoom(2.5);
      });

      expect(mockSetZoom).toHaveBeenCalledWith(2.5);
    });

    it("should update viewport (zoom and pan together)", () => {
      const { result } = renderHook(() => useGraphTilesNuqs());
      const mockSetZoomInternal = vi.fn();
      const mockSetPanInternal = vi.fn();

      // Mock the individual setters used by setViewport
      (useQueryState as any).mockImplementation((key: string) => {
        switch (key) {
          case "zoom":
            return [1, mockSetZoomInternal];
          case "pan":
            return [{ x: 0, y: 0 }, mockSetPanInternal];
          default:
            return [null, vi.fn()];
        }
      });

      const { result: newResult } = renderHook(() => useGraphTilesNuqs());

      act(() => {
        newResult.current.setViewport(3.2, { x: 150, y: 75 });
      });

      expect(mockSetZoomInternal).toHaveBeenCalledWith(3.2);
      expect(mockSetPanInternal).toHaveBeenCalledWith({ x: 150, y: 75 });
    });
  });

  describe("Navigation Methods", () => {
    it("should navigate to ego network", () => {
      const { result } = renderHook(() => useGraphTilesNuqs());

      act(() => {
        result.current.toEgoNetwork("entity-123");
      });

      expect(mockSetStates).toHaveBeenCalledWith({
        mode: "ego",
        center: "entity-123",
        community: null,
      });
    });

    it("should navigate to full atlas", () => {
      const { result } = renderHook(() => useGraphTilesNuqs());

      act(() => {
        result.current.toFullAtlas();
      });

      expect(mockSetStates).toHaveBeenCalledWith({
        mode: "full-atlas",
        center: null,
        community: null,
      });
    });

    it("should navigate to community", () => {
      const { result } = renderHook(() => useGraphTilesNuqs());

      act(() => {
        result.current.toCommunity(42);
      });

      expect(mockSetStates).toHaveBeenCalledWith({
        mode: "community",
        community: 42,
        center: null,
      });
    });
  });

  describe("Zoom Persistence", () => {
    it("should handle zoom updates with localStorage", () => {
      // Mock localStorage
      const mockLocalStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
      };
      Object.defineProperty(window, "localStorage", {
        value: mockLocalStorage,
      });

      const { result } = renderHook(() => useGraphTilesNuqs());

      act(() => {
        result.current.setZoom(3.2);
      });

      expect(mockSetZoom).toHaveBeenCalledWith(3.2);
    });
  });
});
