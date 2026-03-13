/**
 * Host Session Page
 *
 * Server component wrapper for host session client component.
 */

import { Suspense, use } from "react";

import HostSessionClient from "./HostSessionClient";

export default function HostSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);

  return (
    <Suspense fallback={<HostSessionLoading />}>
      <HostSessionClient sessionId={sessionId} />
    </Suspense>
  );
}

function HostSessionLoading() {
  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-lg font-medium">Loading Host Session...</p>
      </div>
    </div>
  );
}
