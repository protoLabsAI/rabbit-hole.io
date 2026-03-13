/**
 * Error Boundary for Share Pages
 *
 * Handles unexpected errors during share page rendering
 * with user-friendly error messages and recovery options
 */

"use client";

import { useEffect } from "react";

import { GenericError } from "@/components/share";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error for monitoring
    console.error("Share page error:", error);
  }, [error]);

  return (
    <GenericError
      onRetry={reset}
      showDevelopmentDetails={process.env.NODE_ENV === "development"}
      error={error}
    />
  );
}
