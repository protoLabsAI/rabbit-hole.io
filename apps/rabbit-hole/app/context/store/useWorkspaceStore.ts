/**
 * Workspace Store
 *
 * Global Zustand store for workspace draft/viewing mode state.
 * Accessible throughout the app for UI conditional rendering.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WorkspaceMode = "viewing" | "editing";

export interface WorkspaceState {
  // Current mode
  mode: WorkspaceMode;

  // Active draft ID (null when viewing latest)
  activeDraftId: string | null;

  // Active workspace ID
  workspaceId: string | null;

  // Loading states
  isPublishing: boolean;
  isDiscarding: boolean;
  isCreatingDraft: boolean;

  // Error state
  error: string | null;
}

export interface WorkspaceActions {
  // Set workspace context
  setWorkspaceId: (id: string) => void;

  // Mode management
  setMode: (mode: WorkspaceMode) => void;
  enterEditingMode: (draftId: string) => void;
  exitEditingMode: () => void;

  // Draft lifecycle
  setActiveDraftId: (id: string | null) => void;
  setPublishing: (isPublishing: boolean) => void;
  setDiscarding: (isDiscarding: boolean) => void;
  setCreatingDraft: (isCreating: boolean) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Reset all state
  reset: () => void;
}

export type WorkspaceStore = WorkspaceState & WorkspaceActions;

const initialState: WorkspaceState = {
  mode: "viewing",
  activeDraftId: null,
  workspaceId: null,
  isPublishing: false,
  isDiscarding: false,
  isCreatingDraft: false,
  error: null,
};

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      ...initialState,

      // Workspace context
      setWorkspaceId: (id: string) => set({ workspaceId: id }),

      // Mode management
      setMode: (mode: WorkspaceMode) => set({ mode }),

      enterEditingMode: (draftId: string) =>
        set({
          mode: "editing",
          activeDraftId: draftId,
          error: null,
        }),

      exitEditingMode: () =>
        set({
          mode: "viewing",
          activeDraftId: null,
          error: null,
        }),

      // Draft lifecycle
      setActiveDraftId: (id: string | null) => set({ activeDraftId: id }),

      setPublishing: (isPublishing: boolean) => set({ isPublishing }),

      setDiscarding: (isDiscarding: boolean) => set({ isDiscarding }),

      setCreatingDraft: (isCreating: boolean) =>
        set({ isCreatingDraft: isCreating }),

      // Error handling
      setError: (error: string | null) => set({ error }),

      clearError: () => set({ error: null }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: "workspace-mode-storage",
      // Only persist mode and draft ID (not loading states)
      partialize: (state) => ({
        mode: state.mode,
        activeDraftId: state.activeDraftId,
        workspaceId: state.workspaceId,
      }),
    }
  )
);

// Selectors for common patterns
export const useIsEditing = () =>
  useWorkspaceStore((state) => state.mode === "editing");

export const useIsViewing = () =>
  useWorkspaceStore((state) => state.mode === "viewing");

export const useActiveDraftId = () =>
  useWorkspaceStore((state) => state.activeDraftId);

export const useWorkspaceMode = () => useWorkspaceStore((state) => state.mode);

export const useWorkspaceLoading = () =>
  useWorkspaceStore((state) => ({
    isPublishing: state.isPublishing,
    isDiscarding: state.isDiscarding,
    isCreatingDraft: state.isCreatingDraft,
  }));
