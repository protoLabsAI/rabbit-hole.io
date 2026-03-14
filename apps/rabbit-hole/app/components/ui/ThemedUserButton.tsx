"use client";

import React from "react";

interface ThemedUserButtonProps {
  afterSignOutUrl?: string;
  className?: string;
}

/**
 * Themed UserButton Component
 *
 * Clerk removed - shows a simple local user indicator.
 */
export function ThemedUserButton({
  afterSignOutUrl = "/atlas",
  className = "",
}: ThemedUserButtonProps) {
  return (
    <div className={className}>
      <div
        className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary cursor-default"
        title="Local User"
      >
        L
      </div>
    </div>
  );
}
