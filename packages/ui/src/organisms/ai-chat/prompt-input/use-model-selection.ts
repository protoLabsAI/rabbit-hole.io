"use client";

import { useEffect, useState } from "react";

/**
 * Hook to manage model selection with localStorage persistence
 *
 * @param key - localStorage key for persistence (default: "selected-model")
 * @returns Current model and setter function
 */
export function useModelSelection(key: string = "selected-model") {
  const [selectedModel, setSelectedModelState] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  // Load from localStorage after mount
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setSelectedModelState(JSON.parse(stored));
      } catch {
        setSelectedModelState(stored);
      }
    }
  }, [key]);

  // Persist to localStorage on change
  const setSelectedModel = (model: string) => {
    setSelectedModelState(model);
    if (mounted) {
      localStorage.setItem(key, JSON.stringify(model));
    }
  };

  return { selectedModel, setSelectedModel };
}
