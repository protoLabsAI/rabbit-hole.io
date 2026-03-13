/**
 * Playground Page State Management Hook
 *
 * nuqs-powered URL state management for playground selection.
 * Enables shareable playground URLs and browser navigation.
 */

import { useQueryState, parseAsString } from "nuqs";
import { useCallback } from "react";

// Parser for playground ID from URL
// Validation happens after parsing in the hook
const parsePlaygroundId = parseAsString.withDefault("");

/**
 * Playground page state hook
 *
 * @returns Object with playground ID state and setters
 */
export function usePlaygroundPageState() {
  // Current playground from URL (raw value, empty string if not set)
  const [rawPlaygroundId, setRawPlaygroundId] = useQueryState(
    "p",
    parsePlaygroundId
  );

  // Validate playground ID - only allow alphanumeric and hyphens
  // Invalid IDs or empty strings become null
  const playgroundId =
    rawPlaygroundId && /^[a-z0-9\-]+$/.test(rawPlaygroundId)
      ? rawPlaygroundId
      : null;

  // Helper to load a specific playground by ID
  const loadPlayground = useCallback(
    (id: string) => {
      setRawPlaygroundId(id);
    },
    [setRawPlaygroundId]
  );

  // Helper to clear current playground
  const clearPlayground = useCallback(() => {
    setRawPlaygroundId(null);
  }, [setRawPlaygroundId]);

  return {
    playgroundId,
    setPlaygroundId: setRawPlaygroundId,
    loadPlayground,
    clearPlayground,
  };
}
