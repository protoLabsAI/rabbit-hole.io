/**
 * Development Dashboard Page
 *
 * Server component wrapper for the Dashboard client component.
 */

import { Suspense } from "react";

import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardClient />
    </Suspense>
  );
}

function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-lg font-medium">Loading Dashboard...</p>
        <p className="text-sm text-muted-foreground mt-2">
          Preparing admin interface
        </p>
      </div>
    </div>
  );
}
