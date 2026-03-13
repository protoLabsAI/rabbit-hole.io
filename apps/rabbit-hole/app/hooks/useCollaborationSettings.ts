/**
 * Collaboration Settings Store
 *
 * User preferences for workspace collaboration features.
 * Persists to localStorage across sessions.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CollaborationSettings {
  // Presence & Awareness
  showPresence: boolean; // Show other users' cursors
  showFollowers: boolean; // Show who's following you
  autoFollowMode: boolean; // Auto-follow when joining workspace

  // Sync Behavior
  syncDebounceMs: number; // Debounce for data sync (100-2000ms)
  autoSaveEnabled: boolean; // Auto-save to IndexedDB

  // Storage
  autoCleanupDays: number; // Auto-cleanup workspaces after N days (0 = never)
  warnAtStoragePercent: number; // Warn when storage usage exceeds %

  // UI Preferences
  showConnectionStatus: boolean; // Show status badges
  showDevTools: boolean; // Show dev mode tools
  verboseLogging: boolean; // Enable detailed console logs
}

interface CollaborationSettingsStore extends CollaborationSettings {
  // Actions
  setShowPresence: (value: boolean) => void;
  setShowFollowers: (value: boolean) => void;
  setAutoFollowMode: (value: boolean) => void;
  setSyncDebounce: (ms: number) => void;
  setAutoSave: (enabled: boolean) => void;
  setAutoCleanupDays: (days: number) => void;
  setWarnAtStoragePercent: (percent: number) => void;
  setShowConnectionStatus: (show: boolean) => void;
  setShowDevTools: (show: boolean) => void;
  setVerboseLogging: (enabled: boolean) => void;

  // Batch update
  updateSettings: (partial: Partial<CollaborationSettings>) => void;

  // Reset to defaults
  resetToDefaults: () => void;
}

const defaultSettings: CollaborationSettings = {
  // Presence
  showPresence: true,
  showFollowers: true,
  autoFollowMode: false,

  // Sync
  syncDebounceMs: 1000,
  autoSaveEnabled: true,

  // Storage
  autoCleanupDays: 90,
  warnAtStoragePercent: 80,

  // UI
  showConnectionStatus: true,
  showDevTools: process.env.NODE_ENV === "development",
  verboseLogging: false,
};

export const useCollaborationSettings = create<CollaborationSettingsStore>()(
  persist(
    (set) => ({
      // Initial state
      ...defaultSettings,

      // Actions
      setShowPresence: (value) => set({ showPresence: value }),
      setShowFollowers: (value) => set({ showFollowers: value }),
      setAutoFollowMode: (value) => set({ autoFollowMode: value }),
      setSyncDebounce: (ms) =>
        set({ syncDebounceMs: Math.max(100, Math.min(2000, ms)) }),
      setAutoSave: (enabled) => set({ autoSaveEnabled: enabled }),
      setAutoCleanupDays: (days) => set({ autoCleanupDays: Math.max(0, days) }),
      setWarnAtStoragePercent: (percent) =>
        set({ warnAtStoragePercent: Math.max(50, Math.min(95, percent)) }),
      setShowConnectionStatus: (show) => set({ showConnectionStatus: show }),
      setShowDevTools: (show) => set({ showDevTools: show }),
      setVerboseLogging: (enabled) => set({ verboseLogging: enabled }),

      // Batch update
      updateSettings: (partial) => set((state) => ({ ...state, ...partial })),

      // Reset
      resetToDefaults: () => set(defaultSettings),
    }),
    {
      name: "collaboration-settings",
      version: 2,
      migrate: (persistedState: any, version: number) => {
        // If migrating from version 1, remove forceOffline property
        if (version === 1) {
          const { forceOffline, ...rest } = persistedState;
          return rest;
        }
        return persistedState;
      },
    }
  )
);
