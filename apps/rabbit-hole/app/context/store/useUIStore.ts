import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Import types from the existing UIContext
import type { ResearchBundle } from "../../research/lib/bundle-validator";
import type { UIState } from "../types";

// Context Menu types (from context menu migration)
type ContextType = "node" | "edge" | "background" | "legend" | string;

export interface ContextMenuState {
  isOpen: boolean;
  type: ContextType;
  x: number;
  y: number;
  context?: any;
  routeActions: Record<string, any>;
}

// Unified Store State (replaces UIState)
export interface UnifiedUIStore {
  entityDialogs: UIState["entityDialogs"];
  entityMergeDialog: UIState["entityMergeDialog"];
  confirmationDialogs: UIState["confirmationDialogs"];
  dialogHistory: UIState["dialogHistory"];
  notifications: UIState["notifications"];
  overlays: UIState["overlays"];
  contextMenu: ContextMenuState;
  mergeToNeo4jDialog: {
    isOpen: boolean;
    bundle: ResearchBundle | null;
  } | null;
}

// Actions Interface
export interface UnifiedUIActions {
  // Entity Dialog Actions
  openEntityDialog: (
    dialogType: string,
    entityUid: string,
    entityName: string,
    metadata?: any
  ) => void;
  closeEntityDialog: (dialogType: string) => void;
  closeAllEntityDialogs: () => void;

  // Entity Merge Dialog Actions
  openEntityMergeDialog: (sourceEntity: any) => void;
  closeEntityMergeDialog: () => void;

  // Merge to Neo4j Dialog Actions
  openMergeToNeo4jDialog: (bundle: ResearchBundle) => void;
  closeMergeToNeo4jDialog: () => void;

  // Confirmation Dialog Actions
  openConfirmationDialog: (dialogType: string, config: any) => void;
  closeConfirmationDialog: (dialogType: string) => void;

  // Settings Panel Actions
  toggleSettingsPanel: () => void;
  setSettingsPosition: (position: string) => void;

  // Context Menu Actions (from Zustand migration)
  openContextMenu: (
    type: ContextType,
    x: number,
    y: number,
    context?: any
  ) => void;
  closeContextMenu: () => void;
  setContextMenuActions: (actions: Record<string, any>) => void;

  // Toast/Notification Actions
  showToast: (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message?: string,
    duration?: number
  ) => void;
  dismissToast: (id: number) => void;
  clearAllToasts: () => void;

  // Dialog History Actions
  pushDialogHistory: (item: any) => void;
  popDialogHistory: () => void;
  goToHistoryItem: (index: number) => void;
  clearDialogHistory: () => void;
}

type UIStore = UnifiedUIStore & UnifiedUIActions;

export const useUIStore = create<UIStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      entityDialogs: {},
      entityMergeDialog: {
        isOpen: false,
        sourceEntity: null,
      },
      confirmationDialogs: {},
      dialogHistory: {
        items: [],
        currentIndex: -1,
      },
      overlays: {
        settingsPanel: {
          isOpen: false,
          position: "bottom-right" as const,
        },
        contextMenu: {
          isOpen: false,
          position: { x: 0, y: 0 },
          items: [],
        },
      },
      notifications: {
        items: [],
        nextId: 1,
      },
      contextMenu: {
        isOpen: false,
        type: "background",
        x: 0,
        y: 0,
        context: undefined,
        routeActions: {},
      },
      mergeToNeo4jDialog: null,

      // Entity Dialog Actions
      openEntityDialog: (
        dialogType: string,
        entityUid: string,
        entityName: string,
        metadata?: any
      ) => {
        set(
          (state) => ({
            entityDialogs: {
              ...state.entityDialogs,
              [dialogType]: {
                isOpen: true,
                entityUid,
                entityName,
                metadata: metadata || {},
              },
            },
          }),
          false,
          `openEntityDialog/${dialogType}`
        );
      },

      closeEntityDialog: (dialogType: string) => {
        set(
          (state) => {
            const { [dialogType]: removed, ...remaining } = state.entityDialogs;
            return { entityDialogs: remaining };
          },
          false,
          `closeEntityDialog/${dialogType}`
        );
      },

      closeAllEntityDialogs: () => {
        set({ entityDialogs: {} }, false, "closeAllEntityDialogs");
      },

      // Entity Merge Dialog Actions
      openEntityMergeDialog: (sourceEntity: any) => {
        set(
          {
            entityMergeDialog: {
              isOpen: true,
              sourceEntity,
            },
          },
          false,
          "openEntityMergeDialog"
        );
      },

      closeEntityMergeDialog: () => {
        set(
          {
            entityMergeDialog: {
              isOpen: false,
              sourceEntity: null,
            },
          },
          false,
          "closeEntityMergeDialog"
        );
      },

      // Merge to Neo4j Dialog Actions
      openMergeToNeo4jDialog: (bundle: ResearchBundle) => {
        set(
          { mergeToNeo4jDialog: { isOpen: true, bundle } },
          false,
          "openMergeToNeo4jDialog"
        );
      },

      closeMergeToNeo4jDialog: () => {
        set({ mergeToNeo4jDialog: null }, false, "closeMergeToNeo4jDialog");
      },

      // Confirmation Dialog Actions
      openConfirmationDialog: (dialogType: string, config: any) => {
        set(
          (state) => ({
            confirmationDialogs: {
              ...state.confirmationDialogs,
              [dialogType]: {
                isOpen: true,
                title: config.title || "Confirm",
                message: config.message || "Are you sure?",
                onConfirm: config.onConfirm,
                onCancel: config.onCancel,
                variant: config.variant || "danger",
              },
            },
          }),
          false,
          `openConfirmationDialog/${dialogType}`
        );
      },

      closeConfirmationDialog: (dialogType: string) => {
        set(
          (state) => {
            const { [dialogType]: removed, ...remaining } =
              state.confirmationDialogs;
            return { confirmationDialogs: remaining };
          },
          false,
          `closeConfirmationDialog/${dialogType}`
        );
      },

      // Settings Panel Actions
      toggleSettingsPanel: () => {
        set(
          (state) => ({
            overlays: {
              ...state.overlays,
              settingsPanel: {
                ...state.overlays.settingsPanel,
                isOpen: !state.overlays.settingsPanel.isOpen,
              },
            },
          }),
          false,
          "toggleSettingsPanel"
        );
      },

      setSettingsPosition: (
        position: "top-left" | "top-right" | "bottom-left" | "bottom-right"
      ) => {
        set(
          (state) => ({
            overlays: {
              ...state.overlays,
              settingsPanel: {
                ...state.overlays.settingsPanel,
                position,
              },
            },
          }),
          false,
          `setSettingsPosition/${position}`
        );
      },

      // Context Menu Actions
      openContextMenu: (
        type: ContextType,
        x: number,
        y: number,
        context?: any
      ) => {
        set(
          (state) => ({
            contextMenu: {
              ...state.contextMenu,
              isOpen: true,
              type,
              x,
              y,
              context,
            },
          }),
          false,
          `openContextMenu/${type}`
        );
      },

      closeContextMenu: () => {
        set(
          (state) => ({
            contextMenu: {
              ...state.contextMenu,
              isOpen: false,
            },
          }),
          false,
          "closeContextMenu"
        );
      },

      setContextMenuActions: (actions: Record<string, any>) => {
        set(
          (state) => {
            // Only update if actions reference actually changed
            if (state.contextMenu.routeActions === actions) {
              return state; // No change, return same state to prevent re-render
            }
            return {
              contextMenu: {
                ...state.contextMenu,
                routeActions: actions,
              },
            };
          },
          false,
          "setContextMenuActions"
        );
      },

      // Toast Actions
      showToast: (
        type: "success" | "error" | "info" | "warning",
        title: string,
        message?: string,
        duration?: number
      ) => {
        set(
          (state) => ({
            notifications: {
              items: [
                ...state.notifications.items,
                {
                  id: state.notifications.nextId,
                  type,
                  title,
                  message,
                  duration: duration || 5000,
                  timestamp: Date.now(),
                },
              ],
              nextId: state.notifications.nextId + 1,
            },
          }),
          false,
          `showToast/${type}`
        );
      },

      dismissToast: (id: number) => {
        set(
          (state) => ({
            notifications: {
              ...state.notifications,
              items: state.notifications.items.filter((item) => item.id !== id),
            },
          }),
          false,
          `dismissToast/${id}`
        );
      },

      clearAllToasts: () => {
        set(
          { notifications: { items: [], nextId: 1 } },
          false,
          "clearAllToasts"
        );
      },

      // Dialog History Actions
      pushDialogHistory: (item: any) => {
        set(
          (state) => ({
            dialogHistory: {
              items: [...state.dialogHistory.items, item],
              currentIndex: state.dialogHistory.items.length,
            },
          }),
          false,
          "pushDialogHistory"
        );
      },

      popDialogHistory: () => {
        set(
          (state) => ({
            dialogHistory: {
              ...state.dialogHistory,
              currentIndex: Math.max(0, state.dialogHistory.currentIndex - 1),
            },
          }),
          false,
          "popDialogHistory"
        );
      },

      goToHistoryItem: (index: number) => {
        set(
          (state) => ({
            dialogHistory: {
              ...state.dialogHistory,
              currentIndex: index,
            },
          }),
          false,
          `goToHistoryItem/${index}`
        );
      },

      clearDialogHistory: () => {
        set(
          { dialogHistory: { items: [], currentIndex: -1 } },
          false,
          "clearDialogHistory"
        );
      },
    }),
    {
      name: "unified-ui-store",
    }
  )
);
