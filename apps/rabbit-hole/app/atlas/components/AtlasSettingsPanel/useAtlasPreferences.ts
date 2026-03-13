/**
 * Atlas User Preferences Hook
 *
 * Manages user preferences with localStorage persistence while maintaining URL shareability
 */

import { useEffect, useCallback, useState } from "react";

export interface AtlasPreferences {
  // UI Preferences (not shared via URL)
  settingsPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  defaultLayoutType: "breadthfirst" | "force" | "atlas";
  defaultShowLabels: boolean;
  defaultHighlightConnections: boolean;
  defaultShowTimeline: boolean;

  // Default values for new graphs
  defaultEgoHops: number;
  defaultEgoNodeLimit: number;

  // Performance preferences
  enablePerformanceWarnings: boolean;
  enableValidationFeedback: boolean;

  // Theme preferences (extends existing theme system)
  preferredColorScheme: "light" | "dark" | "system";
}

const DEFAULT_PREFERENCES: AtlasPreferences = {
  settingsPosition: "bottom-right",
  defaultLayoutType: "atlas",
  defaultShowLabels: true,
  defaultHighlightConnections: true,
  defaultShowTimeline: false,
  defaultEgoHops: 2,
  defaultEgoNodeLimit: 50,
  enablePerformanceWarnings: true,
  enableValidationFeedback: true,
  preferredColorScheme: "system",
};

const STORAGE_KEY = "atlas-preferences";
const STORAGE_VERSION = "1.0";

interface StoredPreferences {
  version: string;
  preferences: AtlasPreferences;
  lastUpdated: string;
}

export function useAtlasPreferences() {
  const [preferences, setPreferences] =
    useState<AtlasPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const loadPreferences = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: StoredPreferences = JSON.parse(stored);

          // Check version compatibility
          if (parsed.version === STORAGE_VERSION) {
            setPreferences((prev) => ({
              ...DEFAULT_PREFERENCES,
              ...parsed.preferences,
            }));
          } else {
            // Migration logic for version changes
            console.log("🔄 Migrating Atlas preferences to new version");
            migratePreferences(parsed);
          }
        }
      } catch (error) {
        console.warn("⚠️ Failed to load Atlas preferences:", error);
        setPreferences(DEFAULT_PREFERENCES);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Save preferences to localStorage
  const savePreferences = useCallback(
    (newPreferences: Partial<AtlasPreferences>) => {
      setPreferences((prev) => {
        const updated = { ...prev, ...newPreferences };

        try {
          const toStore: StoredPreferences = {
            version: STORAGE_VERSION,
            preferences: updated,
            lastUpdated: new Date().toISOString(),
          };

          localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
        } catch (error) {
          console.warn("⚠️ Failed to save Atlas preferences:", error);
        }

        return updated;
      });
    },
    []
  );

  // Individual preference setters for convenience
  const setSettingsPosition = useCallback(
    (position: AtlasPreferences["settingsPosition"]) => {
      savePreferences({ settingsPosition: position });
    },
    [savePreferences]
  );

  const setDefaultLayoutType = useCallback(
    (layoutType: AtlasPreferences["defaultLayoutType"]) => {
      savePreferences({ defaultLayoutType: layoutType });
    },
    [savePreferences]
  );

  const setDefaultViewOptions = useCallback(
    (options: {
      showLabels?: boolean;
      highlightConnections?: boolean;
      showTimeline?: boolean;
    }) => {
      savePreferences({
        defaultShowLabels: options.showLabels,
        defaultHighlightConnections: options.highlightConnections,
        defaultShowTimeline: options.showTimeline,
      });
    },
    [savePreferences]
  );

  const setDefaultEgoSettings = useCallback(
    (settings: { hops?: number; nodeLimit?: number }) => {
      savePreferences({
        defaultEgoHops: settings.hops,
        defaultEgoNodeLimit: settings.nodeLimit,
      });
    },
    [savePreferences]
  );

  const resetPreferences = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setPreferences(DEFAULT_PREFERENCES);
    } catch (error) {
      console.warn("⚠️ Failed to reset Atlas preferences:", error);
    }
  }, []);

  return {
    preferences,
    isLoading,

    // Bulk update
    updatePreferences: savePreferences,

    // Individual setters
    setSettingsPosition,
    setDefaultLayoutType,
    setDefaultViewOptions,
    setDefaultEgoSettings,
    resetPreferences,

    // Utilities
    isDefaultValue: (key: keyof AtlasPreferences, value: any) =>
      DEFAULT_PREFERENCES[key] === value,
  };
}

// Migration logic for future preference schema changes
function migratePreferences(stored: any) {
  // Currently no migrations needed
  // Future versions would handle schema changes here
  console.log(
    "🔄 No migration needed for preferences version:",
    stored.version
  );
}
