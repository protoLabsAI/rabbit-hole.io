"use client";

import React from "react";

interface ThemedUserButtonProps {
  afterSignOutUrl?: string;
  className?: string;
}

/**
 * ThemedUserButton Component (Clerk removed)
 *
<<<<<<< HEAD
 * Simple avatar placeholder replacing Clerk's UserButton.
=======
 * Clerk removed - shows a simple local user indicator.
>>>>>>> origin/main
 */
export function ThemedUserButton({
  afterSignOutUrl = "/atlas",
  className = "",
}: ThemedUserButtonProps) {
  return (
    <div className={className}>
<<<<<<< HEAD
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-xs font-semibold text-primary">LU</span>
=======
      <div
        className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary cursor-default"
        title="Local User"
      >
        L
>>>>>>> origin/main
      </div>
    </div>
  );
}
