/**
 * Playground Page - Server Component Entry Point
 *
 * Interactive testing environment for all playground components.
 * Requires Basic tier or higher.
 */

import { Suspense } from "react";

import PlaygroundClient from "./PlaygroundClient";

export default function PlaygroundPage() {
  return (
    <Suspense fallback={<PlaygroundPageSkeleton />}>
      <PlaygroundClient />
    </Suspense>
  );
}

function PlaygroundPageSkeleton() {
  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-lg font-medium">Loading Playground...</p>
        <p className="text-sm text-muted-foreground mt-2">
          Preparing testing environment
        </p>
      </div>
    </div>
  );
}
