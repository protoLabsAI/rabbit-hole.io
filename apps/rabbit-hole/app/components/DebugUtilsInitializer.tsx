"use client";

import { useEffect } from "react";

import { initDebugUtils } from "../lib/debug-utils";

/**
 * Client component that initializes debug utilities
 * Exposes window.__RABBIT_DEBUG__ in development/staging
 */
export function DebugUtilsInitializer() {
  useEffect(() => {
    initDebugUtils();
  }, []);

  return null; // This component doesn't render anything
}
