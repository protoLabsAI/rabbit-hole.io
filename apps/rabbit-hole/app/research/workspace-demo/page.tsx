/**
 * Workspace Demo Page
 *
 * Demonstrates multi-tab collaborative workspace with:
 * - VSCode-style tabs
 * - Multiple canvas types (Graph, Map, Timeline, etc.)
 * - Real-time collaboration with follow mode
 * - Local/offline support via Yjs
 */

import { Suspense } from "react";

import WorkspaceClient from "./WorkspaceClient";

export default function WorkspaceDemoPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <WorkspaceClient />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Tab bar skeleton */}
      <div className="h-10 border-b bg-muted/30 flex items-center gap-2 px-2">
        <div className="h-8 w-32 bg-muted/50 rounded animate-pulse" />
        <div className="h-8 w-32 bg-muted/50 rounded animate-pulse" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-lg font-medium">Initializing workspace...</p>
        </div>
      </div>
    </div>
  );
}
