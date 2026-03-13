"use client";

/**
 * Lazy CopilotKit Wrapper
 *
 * Dynamically loads CopilotKit only for users with AI chat access.
 * Reduces bundle size for free tier users.
 */

import React, { Suspense } from "react";

import {
  LazyFeatureErrorBoundary,
  CopilotKitLoadingSkeleton,
} from "@proto/utils/react/lazy-loading";

const CopilotKitProvider = React.lazy(() =>
  import("@copilotkit/react-core").then((module) => ({
    default: module.CopilotKit,
  }))
);

interface LazyCopilotKitWrapperProps {
  children: React.ReactNode;
  runtimeUrl: string;
  agent: string;
  publicLicenseKey: string;
}

export function LazyCopilotKitWrapper({
  children,
  runtimeUrl,
  agent,
  publicLicenseKey,
}: LazyCopilotKitWrapperProps) {
  return (
    <LazyFeatureErrorBoundary featureName="AI Chat">
      <Suspense fallback={<CopilotKitLoadingSkeleton />}>
        <CopilotKitProvider
          runtimeUrl={runtimeUrl}
          agent={agent}
          publicLicenseKey={publicLicenseKey}
        >
          {children}
        </CopilotKitProvider>
      </Suspense>
    </LazyFeatureErrorBoundary>
  );
}
