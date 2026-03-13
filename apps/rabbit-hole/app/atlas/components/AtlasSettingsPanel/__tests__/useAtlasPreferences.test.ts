/**
 * Atlas User Preferences Hook Tests
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { useAtlasPreferences } from "../useAtlasPreferences";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("useAtlasPreferences", () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads default preferences when localStorage is empty", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useAtlasPreferences());

    expect(result.current.preferences.settingsPosition).toBe("bottom-right");
    expect(result.current.preferences.defaultLayoutType).toBe("atlas");
    expect(result.current.preferences.defaultShowLabels).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("loads stored preferences from localStorage", () => {
    const storedPreferences = {
      version: "1.0",
      preferences: {
        settingsPosition: "top-left",
        defaultLayoutType: "force",
        defaultShowLabels: false,
        defaultHighlightConnections: true,
        defaultShowTimeline: false,
        defaultEgoHops: 3,
        defaultEgoNodeLimit: 75,
        enablePerformanceWarnings: false,
        enableValidationFeedback: true,
        preferredColorScheme: "dark",
      },
      lastUpdated: "2024-01-01T00:00:00.000Z",
    };

    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedPreferences));

    const { result } = renderHook(() => useAtlasPreferences());

    expect(result.current.preferences.settingsPosition).toBe("top-left");
    expect(result.current.preferences.defaultLayoutType).toBe("force");
    expect(result.current.preferences.defaultShowLabels).toBe(false);
    expect(result.current.preferences.enablePerformanceWarnings).toBe(false);
  });

  it("saves preferences to localStorage", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useAtlasPreferences());

    act(() => {
      result.current.updatePreferences({
        settingsPosition: "top-right",
        defaultEgoHops: 4,
      });
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "atlas-preferences",
      expect.stringContaining('"settingsPosition":"top-right"')
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "atlas-preferences",
      expect.stringContaining('"defaultEgoHops":4')
    );
  });

  it("updates individual preferences correctly", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useAtlasPreferences());

    act(() => {
      result.current.setSettingsPosition("top-left");
    });

    expect(result.current.preferences.settingsPosition).toBe("top-left");

    act(() => {
      result.current.setDefaultLayoutType("breadthfirst");
    });

    expect(result.current.preferences.defaultLayoutType).toBe("breadthfirst");

    act(() => {
      result.current.setDefaultEgoSettings({ hops: 5, nodeLimit: 125 });
    });

    expect(result.current.preferences.defaultEgoHops).toBe(5);
    expect(result.current.preferences.defaultEgoNodeLimit).toBe(125);
  });

  it("resets preferences to defaults", () => {
    const storedPreferences = {
      version: "1.0",
      preferences: {
        settingsPosition: "top-left",
        defaultLayoutType: "force",
        defaultShowLabels: false,
      },
      lastUpdated: "2024-01-01T00:00:00.000Z",
    };

    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedPreferences));

    const { result } = renderHook(() => useAtlasPreferences());

    // Verify loaded preferences are not defaults
    expect(result.current.preferences.settingsPosition).toBe("top-left");

    act(() => {
      result.current.resetPreferences();
    });

    // Verify reset to defaults
    expect(result.current.preferences.settingsPosition).toBe("bottom-right");
    expect(result.current.preferences.defaultLayoutType).toBe("atlas");
    expect(result.current.preferences.defaultShowLabels).toBe(true);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      "atlas-preferences"
    );
  });

  it("handles localStorage errors gracefully", () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error("localStorage error");
    });

    const { result } = renderHook(() => useAtlasPreferences());

    // Should fall back to defaults without crashing
    expect(result.current.preferences.settingsPosition).toBe("bottom-right");
    expect(result.current.isLoading).toBe(false);
  });

  it("handles invalid JSON in localStorage gracefully", () => {
    localStorageMock.getItem.mockReturnValue("invalid json");

    const { result } = renderHook(() => useAtlasPreferences());

    // Should fall back to defaults
    expect(result.current.preferences.settingsPosition).toBe("bottom-right");
    expect(result.current.isLoading).toBe(false);
  });

  it("identifies default values correctly", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useAtlasPreferences());

    expect(
      result.current.isDefaultValue("settingsPosition", "bottom-right")
    ).toBe(true);
    expect(result.current.isDefaultValue("settingsPosition", "top-left")).toBe(
      false
    );
    expect(result.current.isDefaultValue("defaultEgoHops", 2)).toBe(true);
    expect(result.current.isDefaultValue("defaultEgoHops", 5)).toBe(false);
  });
});
