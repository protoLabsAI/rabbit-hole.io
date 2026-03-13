/**
 * Panel Loader Hook
 *
 * Manages dynamic loading and unloading of panel components.
 * Only one panel is loaded at a time to conserve memory.
 */

import { useState, useCallback, useEffect, useRef } from "react";

import type { PanelRegistryEntry } from "../types";

interface UsePanelLoaderOptions {
  /**
   * Callback when panel loads
   */
  onLoad?: (id: string) => void;

  /**
   * Callback when panel unloads
   */
  onUnload?: (id: string) => void;

  /**
   * Error callback
   */
  onError?: (error: Error) => void;
}

interface PanelLoaderState {
  /**
   * Currently loaded panel component
   */
  Component: React.ComponentType | null;

  /**
   * Current panel ID
   */
  panelId: string | null;

  /**
   * Loading state
   */
  isLoading: boolean;

  /**
   * Error state
   */
  error: Error | null;

  /**
   * Load a panel by registry entry
   */
  loadPanel: (entry: PanelRegistryEntry) => Promise<void>;

  /**
   * Unload current panel
   */
  unloadPanel: () => void;
}

export function usePanelLoader(
  options: UsePanelLoaderOptions = {}
): PanelLoaderState {
  const { onLoad, onUnload, onError } = options;

  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [panelId, setPanelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track current load to prevent race conditions
  const loadCounterRef = useRef(0);

  const loadPanel = useCallback(
    async (entry: PanelRegistryEntry) => {
      const currentLoadId = ++loadCounterRef.current;

      // If already loaded, skip
      if (panelId === entry.id && Component) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log(`[PanelHub] Loading panel: ${entry.id}`);

        // Unload previous panel first
        if (Component && panelId) {
          console.log(`[PanelHub] Unloading: ${panelId}`);
          setComponent(null);
          onUnload?.(panelId);

          // Give React time to cleanup
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Check if this load is still relevant
        if (currentLoadId !== loadCounterRef.current) {
          console.log(`[PanelHub] Load cancelled: ${entry.id}`);
          return;
        }

        // Dynamic import
        const importedModule = await entry.importFn();

        // Final check before setting state
        if (currentLoadId !== loadCounterRef.current) {
          return;
        }

        setComponent(() => importedModule.default);
        setPanelId(entry.id);
        onLoad?.(entry.id);

        console.log(`[PanelHub] Loaded: ${entry.id}`);
      } catch (err) {
        if (currentLoadId !== loadCounterRef.current) {
          return;
        }

        const error =
          err instanceof Error ? err : new Error("Failed to load panel");
        setError(error);
        onError?.(error);
        console.error(`[PanelHub] Load error:`, error);
      } finally {
        if (currentLoadId === loadCounterRef.current) {
          setIsLoading(false);
        }
      }
    },
    [Component, panelId, onLoad, onUnload, onError]
  );

  const unloadPanel = useCallback(() => {
    if (Component && panelId) {
      console.log(`[PanelHub] Manually unloading: ${panelId}`);
      setComponent(null);
      setPanelId(null);
      onUnload?.(panelId);
    }
  }, [Component, panelId, onUnload]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (panelId) {
        console.log(`[PanelHub] Cleanup on unmount: ${panelId}`);
      }
    };
  }, [panelId]);

  return {
    Component,
    panelId,
    isLoading,
    error,
    loadPanel,
    unloadPanel,
  };
}
