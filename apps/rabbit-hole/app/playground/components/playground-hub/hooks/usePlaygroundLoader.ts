/**
 * Playground Loader Hook
 *
 * Manages dynamic loading and unloading of playground components.
 * Only one playground is loaded at a time to conserve memory.
 */

import { useState, useCallback, useEffect, useRef } from "react";

import type { PlaygroundRegistryEntry } from "../registry/types";

interface UsePlaygroundLoaderOptions {
  /**
   * Callback when playground loads
   */
  onLoad?: (id: string) => void;

  /**
   * Callback when playground unloads
   */
  onUnload?: (id: string) => void;

  /**
   * Error callback
   */
  onError?: (error: Error) => void;
}

interface PlaygroundLoaderState {
  /**
   * Currently loaded playground component
   */
  Component: React.ComponentType<any> | null;

  /**
   * Current playground ID
   */
  playgroundId: string | null;

  /**
   * Loading state
   */
  isLoading: boolean;

  /**
   * Error state
   */
  error: Error | null;

  /**
   * Load a playground by registry entry
   */
  loadPlayground: (entry: PlaygroundRegistryEntry) => Promise<void>;

  /**
   * Unload current playground
   */
  unloadPlayground: () => void;
}

export function usePlaygroundLoader(
  options: UsePlaygroundLoaderOptions = {}
): PlaygroundLoaderState {
  const { onLoad, onUnload, onError } = options;

  const [Component, setComponent] = useState<React.ComponentType<any> | null>(
    null
  );
  const [playgroundId, setPlaygroundId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track current load to prevent race conditions
  const loadCounterRef = useRef(0);

  const loadPlayground = useCallback(
    async (entry: PlaygroundRegistryEntry) => {
      const currentLoadId = ++loadCounterRef.current;

      // If already loaded, skip
      if (playgroundId === entry.id && Component) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log(`[PlaygroundHub] Loading playground: ${entry.id}`);

        // Unload previous playground first
        if (Component && playgroundId) {
          console.log(`[PlaygroundHub] Unloading: ${playgroundId}`);
          setComponent(null);
          onUnload?.(playgroundId);

          // Give React time to cleanup
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Check if this load is still relevant
        if (currentLoadId !== loadCounterRef.current) {
          console.log(`[PlaygroundHub] Load cancelled: ${entry.id}`);
          return;
        }

        // Dynamic import
        const importedModule = await entry.importFn();

        // Final check before setting state
        if (currentLoadId !== loadCounterRef.current) {
          return;
        }

        setComponent(() => importedModule.default);
        setPlaygroundId(entry.id);
        onLoad?.(entry.id);

        console.log(`[PlaygroundHub] Loaded: ${entry.id}`);
      } catch (err) {
        if (currentLoadId !== loadCounterRef.current) {
          return;
        }

        const error =
          err instanceof Error ? err : new Error("Failed to load playground");
        setError(error);
        onError?.(error);
        console.error(`[PlaygroundHub] Load error:`, error);
      } finally {
        if (currentLoadId === loadCounterRef.current) {
          setIsLoading(false);
        }
      }
    },
    [Component, playgroundId, onLoad, onUnload, onError]
  );

  const unloadPlayground = useCallback(() => {
    if (Component && playgroundId) {
      console.log(`[PlaygroundHub] Manually unloading: ${playgroundId}`);
      setComponent(null);
      setPlaygroundId(null);
      onUnload?.(playgroundId);
    }
  }, [Component, playgroundId, onUnload]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playgroundId) {
        console.log(`[PlaygroundHub] Cleanup on unmount: ${playgroundId}`);
      }
    };
  }, [playgroundId]);

  return {
    Component,
    playgroundId,
    isLoading,
    error,
    loadPlayground,
    unloadPlayground,
  };
}
