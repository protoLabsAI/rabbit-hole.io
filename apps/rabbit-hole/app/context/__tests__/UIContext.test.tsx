import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, beforeEach } from "vitest";

import { useUIStore } from "../store/useUIStore";

describe.skip("UnifiedUI Store", () => {
  beforeEach(() => {
    // Reset store state between tests
    const store = useUIStore.getState();
    store.closeAllEntityDialogs();
    store.clearAllToasts();
    if (store.overlays.settingsPanel.isOpen) {
      store.toggleSettingsPanel();
    }
  });
  describe("Initial State", () => {
    test("provides initial state correctly", () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.entityDialogs).toEqual({});
      expect(result.current.confirmationDialogs).toEqual({});
      expect(result.current.overlays.settingsPanel.isOpen).toBe(false);
      expect(result.current.notifications.items).toEqual([]);
    });

    test("provides all required actions", () => {
      const { result } = renderHook(() => useUIStore());

      expect(typeof result.current.openEntityDialog).toBe("function");
      expect(typeof result.current.closeEntityDialog).toBe("function");
      expect(typeof result.current.closeAllEntityDialogs).toBe("function");
      expect(typeof result.current.showToast).toBe("function");
      expect(typeof result.current.toggleSettingsPanel).toBe("function");
    });
  });

  describe("Entity Dialog Actions", () => {
    test("opens entity dialog correctly", () => {
      const { result } = renderHook(() => useUIStore(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.openEntityDialog(
          "familyAnalysis",
          "person:test",
          "Test Person",
          { metadata: "test" }
        );
      });

      const familyDialog = result.current.entityDialogs.familyAnalysis;
      expect(familyDialog.isOpen).toBe(true);
      expect(familyDialog.entityUid).toBe("person:test");
      expect(familyDialog.entityName).toBe("Test Person");
      expect(familyDialog.metadata).toEqual({ metadata: "test" });
    });

    test("closes entity dialog correctly", () => {
      const { result } = renderHook(() => useUIStore(), {
        wrapper: TestWrapper,
      });

      // First open a dialog
      act(() => {
        result.current.openEntityDialog(
          "familyAnalysis",
          "person:test",
          "Test Person"
        );
      });

      // Then close it
      act(() => {
        result.current.closeEntityDialog("familyAnalysis");
      });

      expect(result.current.entityDialogs.familyAnalysis).toBeUndefined();
    });

    test("closes all entity dialogs", () => {
      const { result } = renderHook(() => useUIStore(), {
        wrapper: TestWrapper,
      });

      // Open multiple dialogs
      act(() => {
        result.current.openEntityDialog(
          "familyAnalysis",
          "person:test1",
          "Test Person 1"
        );
        result.current.openEntityDialog(
          "biographicalAnalysis",
          "person:test2",
          "Test Person 2"
        );
      });

      // Close all
      act(() => {
        result.current.closeAllEntityDialogs();
      });

      expect(result.current.entityDialogs).toEqual({});
    });
  });

  describe("Toast Notifications", () => {
    test("shows toast notification", () => {
      const { result } = renderHook(() => useUIStore(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.showToast("success", "Test Title", "Test Message");
      });

      const notifications = result.current.notifications.items;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe("success");
      expect(notifications[0].title).toBe("Test Title");
      expect(notifications[0].message).toBe("Test Message");
    });

    test("removes toast notification", () => {
      const { result } = renderHook(() => useUIStore(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.showToast("info", "Test");
      });

      const toastId = result.current.notifications.items[0].id;

      act(() => {
        result.current.dismissToast(toastId);
      });

      expect(result.current.notifications.items).toHaveLength(0);
    });
  });

  describe("Settings Panel", () => {
    test("toggles settings panel", () => {
      const { result } = renderHook(() => useUIStore(), {
        wrapper: TestWrapper,
      });

      expect(result.current.overlays.settingsPanel.isOpen).toBe(false);

      act(() => {
        result.current.toggleSettingsPanel();
      });

      expect(result.current.overlays.settingsPanel.isOpen).toBe(true);

      act(() => {
        result.current.toggleSettingsPanel();
      });

      expect(result.current.overlays.settingsPanel.isOpen).toBe(false);
    });
  });
});

// Event integration tests removed - Phase 3 eliminated custom event listeners
// All UI interactions now use direct store actions
