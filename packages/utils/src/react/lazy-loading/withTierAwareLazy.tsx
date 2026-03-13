"use client";

/**
 * Tier-Aware Lazy Loading HOC
 *
 * Higher-order component factory for wrapping components with tier-aware lazy loading.
 * Combines error boundary, loading states, and tier checks in one reusable pattern.
 */

import { useUser } from "@clerk/nextjs";
import React, { Suspense, ComponentType } from "react";

import type { UserTierLimits } from "@proto/auth";
import { getUserTierClient, getTierLimitsClient } from "@proto/auth/client";

import { LazyFeatureErrorBoundary } from "./LazyFeatureErrorBoundary";
import { GenericFeatureLoadingSkeleton } from "./LoadingStates";

interface WithTierAwareLazyOptions {
  featureFlag: keyof UserTierLimits;
  featureName: string;
  LoadingComponent?: ComponentType<any>;
  FallbackComponent?: ComponentType<any>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export function withTierAwareLazy<P extends object>(
  LazyComponent: React.LazyExoticComponent<ComponentType<P>>,
  options: WithTierAwareLazyOptions
) {
  const {
    featureFlag,
    featureName,
    LoadingComponent = GenericFeatureLoadingSkeleton,
    FallbackComponent,
    onError,
  } = options;

  return function TierAwareLazyWrapper(props: P) {
    const { user } = useUser();
    const userTier = getUserTierClient(user || null);
    const tierLimits = getTierLimitsClient(userTier);
    const featureValue = tierLimits[featureFlag as keyof typeof tierLimits];
    const hasAccess = Boolean(featureValue);

    if (!hasAccess && FallbackComponent) {
      return <FallbackComponent {...props} />;
    }

    if (!hasAccess) {
      return null;
    }

    return (
      <LazyFeatureErrorBoundary featureName={featureName} onError={onError}>
        <Suspense
          fallback={<LoadingComponent message={`Loading ${featureName}...`} />}
        >
          <LazyComponent {...props} />
        </Suspense>
      </LazyFeatureErrorBoundary>
    );
  };
}
