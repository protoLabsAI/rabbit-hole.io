/**
 * Tier-Aware Lazy Loading Hook
 *
 * Generic hook for loading paid features based on user tier.
 * Handles loading states, errors, and optional preloading.
 */

import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";

import type { UserTierLimits } from "@proto/auth";
import { getUserTierClient, getTierLimitsClient } from "@proto/auth/client";

interface UseTierAwareLazyLoadOptions<T> {
  featureFlag: keyof UserTierLimits;
  importFn: () => Promise<{ default: T }>;
  preload?: boolean;
  onError?: (error: Error) => void;
}

interface LazyLoadState<T> {
  Component: T | null;
  loading: boolean;
  error: Error | null;
  hasAccess: boolean;
  load: () => Promise<void>;
  reset: () => void;
}

export function useTierAwareLazyLoad<T>({
  featureFlag,
  importFn,
  preload = false,
  onError,
}: UseTierAwareLazyLoadOptions<T>): LazyLoadState<T> {
  const { user } = useUser();
  const [Component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const userTier = getUserTierClient(user || null);
  const tierLimits = getTierLimitsClient(userTier);
  const featureValue = tierLimits[featureFlag as keyof typeof tierLimits];
  const hasAccess = Boolean(featureValue);

  const load = useCallback(async () => {
    if (!hasAccess || Component || loading) return;

    setLoading(true);
    setError(null);

    try {
      const loadedModule = await importFn();
      setComponent(() => loadedModule.default);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to load feature");
      setError(error);
      onError?.(error);
      console.error(
        `[LazyLoad] Failed to load feature (${String(featureFlag)}):`,
        error
      );
    } finally {
      setLoading(false);
    }
  }, [hasAccess, Component, loading, importFn, featureFlag, onError]);

  const reset = useCallback(() => {
    setComponent(null);
    setError(null);
    setLoading(false);
  }, []);

  // Preload if enabled and user has access
  useEffect(() => {
    if (hasAccess && preload && !Component && !loading && !error) {
      load();
    }
  }, [hasAccess, preload, Component, loading, error, load]);

  return {
    Component,
    loading,
    error,
    hasAccess,
    load,
    reset,
  };
}
