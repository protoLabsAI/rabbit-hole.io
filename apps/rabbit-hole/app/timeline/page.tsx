/**
 * Timeline Page - Redirect to Analytics
 *
 * This page now redirects to the new analytics page with timeline configuration
 * to maintain backward compatibility for existing URLs and bookmarks.
 */

import { Suspense } from "react";

import TimelineRedirectClient from "./TimelineRedirectClient";

export default function TimelineRedirectPage() {
  return (
    <Suspense fallback={<RedirectLoading />}>
      <TimelineRedirectClient />
    </Suspense>
  );
}

function RedirectLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-gray-700 mb-2">
          Redirecting...
        </h1>
      </div>
    </div>
  );
}
