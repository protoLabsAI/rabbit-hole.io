/**
 * Session Join Page
 *
 * Server component wrapper for session join client component.
 */

import { Suspense, use } from "react";

import SessionJoinClient from "./SessionJoinClient";

export default function SessionJoinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);

  return (
    <Suspense fallback={<SessionJoinLoading />}>
      <SessionJoinClient sessionId={sessionId} />
    </Suspense>
  );
}

function SessionJoinLoading() {
  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-lg font-medium">Loading Session...</p>
      </div>
    </div>
  );
}
