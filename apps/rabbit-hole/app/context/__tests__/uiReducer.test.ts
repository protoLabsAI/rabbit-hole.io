import { describe, test, expect } from "vitest";

import type { UIState, UIAction } from "../types";
import { uiReducer, initialUIState } from "../uiReducer";

describe.skip("uiReducer", () => {
  describe("Entity Dialog Actions", () => {
    test("OPEN_ENTITY_DIALOG creates new dialog state", () => {
      const action: UIAction = {
        type: "OPEN_ENTITY_DIALOG",
        payload: {
          dialogType: "familyAnalysis",
          entityUid: "person:test",
          entityName: "Test Person",
          metadata: { extra: "data" },
        },
      };

      const newState = uiReducer(initialUIState, action);

      expect(newState.entityDialogs.familyAnalysis).toEqual({
        isOpen: true,
        entityUid: "person:test",
        entityName: "Test Person",
        metadata: { extra: "data" },
      });
    });

    test("OPEN_ENTITY_DIALOG without metadata sets empty object", () => {
      const action: UIAction = {
        type: "OPEN_ENTITY_DIALOG",
        payload: {
          dialogType: "biographicalAnalysis",
          entityUid: "person:bio",
          entityName: "Bio Person",
        },
      };

      const newState = uiReducer(initialUIState, action);

      expect(newState.entityDialogs.biographicalAnalysis).toEqual({
        isOpen: true,
        entityUid: "person:bio",
        entityName: "Bio Person",
        metadata: {},
      });
    });

    test("CLOSE_ENTITY_DIALOG resets dialog to closed state", () => {
      const initialState: UIState = {
        ...initialUIState,
        entityDialogs: {
          familyAnalysis: {
            isOpen: true,
            entityUid: "person:test",
            entityName: "Test Person",
            metadata: { data: "test" },
          },
        },
      };

      const action: UIAction = {
        type: "CLOSE_ENTITY_DIALOG",
        payload: { dialogType: "familyAnalysis" },
      };

      const newState = uiReducer(initialState, action);

      expect(newState.entityDialogs.familyAnalysis).toEqual({
        isOpen: false,
        entityUid: "",
        entityName: "",
        metadata: {},
      });
    });

    test("CLOSE_ALL_ENTITY_DIALOGS closes all open dialogs", () => {
      const initialState: UIState = {
        ...initialUIState,
        entityDialogs: {
          familyAnalysis: {
            isOpen: true,
            entityUid: "person:test1",
            entityName: "Test Person 1",
            metadata: {},
          },
          biographicalAnalysis: {
            isOpen: true,
            entityUid: "person:test2",
            entityName: "Test Person 2",
            metadata: {},
          },
        },
      };

      const action: UIAction = { type: "CLOSE_ALL_ENTITY_DIALOGS" };
      const newState = uiReducer(initialState, action);

      expect(newState.entityDialogs.familyAnalysis.isOpen).toBe(false);
      expect(newState.entityDialogs.biographicalAnalysis.isOpen).toBe(false);
      expect(newState.entityDialogs.familyAnalysis.entityUid).toBe("");
      expect(newState.entityDialogs.biographicalAnalysis.entityUid).toBe("");
    });
  });

  describe("Settings Panel Actions", () => {
    test("TOGGLE_SETTINGS_PANEL toggles from closed to open", () => {
      const action: UIAction = { type: "TOGGLE_SETTINGS_PANEL" };
      const newState = uiReducer(initialUIState, action);

      expect(newState.overlays.settingsPanel.isOpen).toBe(true);
    });

    test("TOGGLE_SETTINGS_PANEL toggles from open to closed", () => {
      const initialState: UIState = {
        ...initialUIState,
        overlays: {
          ...initialUIState.overlays,
          settingsPanel: {
            ...initialUIState.overlays.settingsPanel,
            isOpen: true,
          },
        },
      };

      const action: UIAction = { type: "TOGGLE_SETTINGS_PANEL" };
      const newState = uiReducer(initialState, action);

      expect(newState.overlays.settingsPanel.isOpen).toBe(false);
    });

    test("SET_SETTINGS_POSITION updates panel position", () => {
      const action: UIAction = {
        type: "SET_SETTINGS_POSITION",
        payload: { position: "top-left" },
      };

      const newState = uiReducer(initialUIState, action);

      expect(newState.overlays.settingsPanel.position).toBe("top-left");
    });
  });

  describe("Toast Notification Actions", () => {
    test("SHOW_TOAST adds notification with auto-generated ID", () => {
      const action: UIAction = {
        type: "SHOW_TOAST",
        payload: {
          type: "success",
          title: "Test Success",
          message: "Test message",
          duration: 5000,
        },
      };

      const newState = uiReducer(initialUIState, action);

      expect(newState.notifications.items).toHaveLength(1);
      expect(newState.notifications.items[0]).toMatchObject({
        id: 1,
        type: "success",
        title: "Test Success",
        message: "Test message",
        duration: 5000,
      });
      expect(newState.notifications.nextId).toBe(2);
    });

    test("SHOW_TOAST uses default duration when not provided", () => {
      const action: UIAction = {
        type: "SHOW_TOAST",
        payload: {
          type: "info",
          title: "Test Info",
        },
      };

      const newState = uiReducer(initialUIState, action);

      expect(newState.notifications.items[0].duration).toBe(4000);
    });

    test("REMOVE_TOAST removes specific notification", () => {
      const initialState: UIState = {
        ...initialUIState,
        notifications: {
          items: [
            {
              id: 1,
              type: "success",
              title: "Test 1",
              timestamp: Date.now(),
            },
            {
              id: 2,
              type: "error",
              title: "Test 2",
              timestamp: Date.now(),
            },
          ],
          nextId: 3,
        },
      };

      const action: UIAction = {
        type: "REMOVE_TOAST",
        payload: { id: 1 },
      };

      const newState = uiReducer(initialState, action);

      expect(newState.notifications.items).toHaveLength(1);
      expect(newState.notifications.items[0].id).toBe(2);
    });

    test("CLEAR_ALL_TOASTS removes all notifications", () => {
      const initialState: UIState = {
        ...initialUIState,
        notifications: {
          items: [
            { id: 1, type: "success", title: "Test 1", timestamp: Date.now() },
            { id: 2, type: "error", title: "Test 2", timestamp: Date.now() },
          ],
          nextId: 3,
        },
      };

      const action: UIAction = { type: "CLEAR_ALL_TOASTS" };
      const newState = uiReducer(initialState, action);

      expect(newState.notifications.items).toHaveLength(0);
    });
  });

  describe("Context Menu Actions", () => {
    test("OPEN_CONTEXT_MENU sets menu state", () => {
      const items = [{ id: "1", label: "Test Item", onClick: () => {} }];

      const action: UIAction = {
        type: "OPEN_CONTEXT_MENU",
        payload: {
          position: { x: 100, y: 200 },
          items,
        },
      };

      const newState = uiReducer(initialUIState, action);

      expect(newState.overlays.contextMenu).toEqual({
        isOpen: true,
        position: { x: 100, y: 200 },
        items,
      });
    });

    test("CLOSE_CONTEXT_MENU resets menu state", () => {
      const initialState: UIState = {
        ...initialUIState,
        overlays: {
          ...initialUIState.overlays,
          contextMenu: {
            isOpen: true,
            position: { x: 100, y: 200 },
            items: [{ id: "1", label: "Test", onClick: () => {} }],
          },
        },
      };

      const action: UIAction = { type: "CLOSE_CONTEXT_MENU" };
      const newState = uiReducer(initialState, action);

      expect(newState.overlays.contextMenu).toEqual({
        isOpen: false,
        position: { x: 0, y: 0 },
        items: [],
      });
    });
  });

  describe("State Immutability", () => {
    test("reducer returns new state object", () => {
      const action: UIAction = { type: "TOGGLE_SETTINGS_PANEL" };
      const newState = uiReducer(initialUIState, action);

      expect(newState).not.toBe(initialUIState);
      expect(newState.overlays).not.toBe(initialUIState.overlays);
      expect(newState.overlays.settingsPanel).not.toBe(
        initialUIState.overlays.settingsPanel
      );
    });

    test("unhandled action returns same state", () => {
      const action = { type: "UNKNOWN_ACTION" } as any;
      const newState = uiReducer(initialUIState, action);

      expect(newState).toBe(initialUIState);
    });
  });
});
