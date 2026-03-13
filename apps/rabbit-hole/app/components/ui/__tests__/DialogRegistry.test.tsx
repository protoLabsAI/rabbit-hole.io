import { describe, test, expect } from "vitest";

import { useUIStore } from "../../../context/store/useUIStore";

/**
 * DialogRegistry Integration Tests
 *
 * Note: Full rendering tests cause infinite loops with Zustand store subscriptions
 * in the test environment. DialogRegistry is tested through E2E tests instead.
 *
 * These tests verify the underlying store behavior that DialogRegistry depends on.
 */

describe("DialogRegistry Store Integration", () => {
  test("store provides dialog state management", () => {
    const store = useUIStore.getState();

    // Verify store has required actions
    expect(typeof store.openEntityDialog).toBe("function");
    expect(typeof store.closeEntityDialog).toBe("function");
    expect(typeof store.closeAllEntityDialogs).toBe("function");

    // Verify initial state
    expect(store.entityDialogs).toEqual({});
  });

  test("store manages dialog lifecycle", () => {
    const store = useUIStore.getState();

    // Open a dialog
    store.openEntityDialog("familyAnalysis", "test:123", "Test Entity");

    let state = useUIStore.getState();
    expect(state.entityDialogs.familyAnalysis).toBeDefined();
    expect(state.entityDialogs.familyAnalysis.isOpen).toBe(true);
    expect(state.entityDialogs.familyAnalysis.entityUid).toBe("test:123");

    // Close the dialog
    store.closeEntityDialog("familyAnalysis");

    state = useUIStore.getState();
    expect(state.entityDialogs.familyAnalysis).toBeUndefined();
  });

  test("store cleans up all dialogs", () => {
    const store = useUIStore.getState();

    // Open multiple dialogs
    store.openEntityDialog("familyAnalysis", "test:1", "Entity 1");
    store.openEntityDialog("biographicalAnalysis", "test:2", "Entity 2");

    let state = useUIStore.getState();
    expect(Object.keys(state.entityDialogs).length).toBe(2);

    // Close all
    store.closeAllEntityDialogs();

    state = useUIStore.getState();
    expect(Object.keys(state.entityDialogs).length).toBe(0);
  });
});
