/**
 * Research Page - Minimal POC
 *
 * Single canvas + chat. No workspace management, no collaboration,
 * no utility panels. Just the core research flow.
 */

import { Suspense } from "react";

import ResearchPOC from "./ResearchPOC";

export default function ResearchPage() {
  return (
    <Suspense fallback={<ResearchPageSkeleton />}>
      <ResearchPOC />
    </Suspense>
  );
}

function ResearchPageSkeleton() {
  return (
    <div className="h-screen flex bg-background">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <div className="text-lg font-medium">Loading Research...</div>
        </div>
      </div>
    </div>
  );
}
