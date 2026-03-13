/**
 * Atlas Landing Page - Main Entry Point for Rabbit-Hole.io
 *
 * Server component wrapper for Atlas client component.
 */

import { Suspense } from "react";

import AtlasClient from "./AtlasClient";

export default function AtlasPage() {
  return (
    <Suspense fallback={<AtlasLoading />}>
      <AtlasClient />
    </Suspense>
  );
}

function AtlasLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-lg font-medium">Loading Atlas...</p>
        <p className="text-sm text-muted-foreground mt-2">
          Preparing knowledge graph
        </p>
      </div>
    </div>
  );
}
