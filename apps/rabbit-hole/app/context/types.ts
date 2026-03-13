/**
 * UI Context Type Definitions
 *
 * Centralized type definitions for all UI state management including:
 * - Entity-based dialogs (research, analysis, etc.)
 * - Confirmation/Action dialogs
 * - Settings and overlay states
 * - Toast/notification queue
 */

// Dialog type constants for type safety
export const DIALOG_TYPES = {
  FAMILY_ANALYSIS: "familyAnalysis",
  BIOGRAPHICAL_ANALYSIS: "biographicalAnalysis",
  RESEARCH_REPORT: "researchReport",
  ENTITY_MERGE: "entityMerge",
} as const;

export type DialogType = (typeof DIALOG_TYPES)[keyof typeof DIALOG_TYPES];

// Entity interface for merge dialogs
export interface Entity {
  uid: string;
  name: string;
  type: string;
  aliases?: string[];
  tags?: string[];
  properties?: Record<string, any>;
  // Graph-specific fields that might be present
  id?: string;
  label?: string;
  entityType?: string;
}

// Entity dialog state structure
export interface EntityDialogState {
  isOpen: boolean;
  entityUid: string;
  entityName: string;
  metadata?: Record<string, any>;
}

// Entity merge dialog state structure (needs full entity object)
export interface EntityMergeDialogState {
  isOpen: boolean;
  sourceEntity: Entity | null;
}

// Confirmation dialog state structure
export interface ConfirmationDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  variant?: "danger" | "warning" | "info";
}

// Settings panel configuration
export interface SettingsPanelState {
  isOpen: boolean;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

// Context menu state
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
}

// Toast notification structure
export interface ToastNotification {
  id: number;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
}

// Dialog history for navigation
export interface DialogHistoryItem {
  id: string;
  dialogType: string;
  entityUid?: string;
  entityName?: string;
  sourceEntity?: Entity;
  timestamp: number;
  title: string; // Display name for navigation
}

// Conditional dialog rendering
export interface DialogCondition {
  id: string;
  name: string;
  check: () => boolean | Promise<boolean>;
  fallbackMessage?: string;
  fallbackAction?: () => void;
}

export interface ConditionalDialogConfig {
  conditions: DialogCondition[];
  requireAll?: boolean; // AND logic if true, OR logic if false
  onFailure?: (failedConditions: DialogCondition[]) => void;
}

// Main UI state structure
export interface UIState {
  // Entity-based dialogs (research, analysis, etc.)
  entityDialogs: {
    [key: string]: EntityDialogState;
  };

  // Entity merge dialog (special case needing full entity object)
  entityMergeDialog: EntityMergeDialogState;

  // Confirmation/Action dialogs
  confirmationDialogs: {
    [key: string]: ConfirmationDialogState;
  };

  // Dialog history for navigation
  dialogHistory: {
    items: DialogHistoryItem[];
    currentIndex: number;
  };

  // Settings and overlay states
  overlays: {
    settingsPanel: SettingsPanelState;
    contextMenu: ContextMenuState;
  };

  // Toast/notification queue
  notifications: {
    items: ToastNotification[];
    nextId: number;
  };
}

// Action type definitions
export interface UIActions {
  // Entity dialog actions
  openEntityDialog: (
    dialogType: string,
    entityUid: string,
    entityName: string,
    metadata?: any
  ) => void;
  closeEntityDialog: (dialogType: string) => void;
  closeAllEntityDialogs: () => void;

  // Entity merge dialog actions
  openEntityMergeDialog: (sourceEntity: Entity) => void;
  closeEntityMergeDialog: () => void;

  // Confirmation dialog actions
  openConfirmationDialog: (
    dialogType: string,
    config: Omit<ConfirmationDialogState, "isOpen">
  ) => void;
  closeConfirmationDialog: (dialogType: string) => void;

  // Overlay actions
  toggleSettingsPanel: () => void;
  setSettingsPosition: (position: SettingsPanelState["position"]) => void;
  openContextMenu: (
    position: { x: number; y: number },
    items: ContextMenuItem[]
  ) => void;
  closeContextMenu: () => void;

  // Notification actions
  showToast: (
    type: ToastNotification["type"],
    title: string,
    message?: string,
    duration?: number
  ) => void;
  removeToast: (id: number) => void;
  clearAllToasts: () => void;

  // Dialog history actions
  pushDialogHistory: (
    item: Omit<DialogHistoryItem, "id" | "timestamp">
  ) => void;
  popDialogHistory: () => void;
  clearDialogHistory: () => void;
  goToHistoryItem: (index: number) => void;
}

// Context value structure
export interface UIContextValue {
  state: UIState;
  actions: UIActions;
}

// Reducer action types
export type UIAction =
  | {
      type: "OPEN_ENTITY_DIALOG";
      payload: {
        dialogType: string;
        entityUid: string;
        entityName: string;
        metadata?: any;
      };
    }
  | {
      type: "CLOSE_ENTITY_DIALOG";
      payload: { dialogType: string };
    }
  | {
      type: "CLOSE_ALL_ENTITY_DIALOGS";
    }
  | {
      type: "OPEN_ENTITY_MERGE_DIALOG";
      payload: { sourceEntity: Entity };
    }
  | {
      type: "CLOSE_ENTITY_MERGE_DIALOG";
    }
  | {
      type: "OPEN_CONFIRMATION_DIALOG";
      payload: {
        dialogType: string;
        config: Omit<ConfirmationDialogState, "isOpen">;
      };
    }
  | {
      type: "CLOSE_CONFIRMATION_DIALOG";
      payload: { dialogType: string };
    }
  | {
      type: "TOGGLE_SETTINGS_PANEL";
    }
  | {
      type: "SET_SETTINGS_POSITION";
      payload: { position: SettingsPanelState["position"] };
    }
  | {
      type: "OPEN_CONTEXT_MENU";
      payload: {
        position: { x: number; y: number };
        items: ContextMenuItem[];
      };
    }
  | {
      type: "CLOSE_CONTEXT_MENU";
    }
  | {
      type: "SHOW_TOAST";
      payload: {
        type: ToastNotification["type"];
        title: string;
        message?: string;
        duration?: number;
      };
    }
  | {
      type: "REMOVE_TOAST";
      payload: { id: number };
    }
  | {
      type: "CLEAR_ALL_TOASTS";
    }
  | {
      type: "PUSH_DIALOG_HISTORY";
      payload: { item: Omit<DialogHistoryItem, "id" | "timestamp"> };
    }
  | {
      type: "POP_DIALOG_HISTORY";
    }
  | {
      type: "CLEAR_DIALOG_HISTORY";
    }
  | {
      type: "GO_TO_HISTORY_ITEM";
      payload: { index: number };
    };

// Event payload types for custom events
export interface EntityDialogEventDetail {
  entityUid: string;
  entityName: string;
  metadata?: Record<string, any>;
}

// Extend global WindowEventMap for TypeScript
declare global {
  interface WindowEventMap {
    openFamilyAnalysis: CustomEvent<EntityDialogEventDetail>;
    openBiographicalAnalysis: CustomEvent<EntityDialogEventDetail>;
    openResearchReport: CustomEvent<EntityDialogEventDetail>;
  }
}
