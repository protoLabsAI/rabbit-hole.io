/**
 * Research Page - Server Component Entry Point
 *
 * Multi-tab collaborative workspace with Yjs persistence.
 * Replaces single-graph mode and IndexedDB with Yjs.
 */

import { Suspense } from "react";

import ResearchClientWorkspace from "./ResearchClientWorkspace";

export default function ResearchPage() {
  return (
    <Suspense fallback={<ResearchPageSkeleton />}>
      <ResearchClientWorkspace />
    </Suspense>
  );
}

function ResearchPageSkeleton() {
  return (
    <div className="h-screen flex bg-background">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <div className="text-lg font-medium">
            Loading Research Environment...
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            Initializing graph editor and AI assistant
          </div>
        </div>
      </div>
    </div>
  );
}
