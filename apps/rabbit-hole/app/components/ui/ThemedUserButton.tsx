"use client";

import React from "react";

interface ThemedUserButtonProps {
  afterSignOutUrl?: string;
  className?: string;
}

/**
 * ThemedUserButton Component (Clerk removed)
 *
 * Simple avatar placeholder replacing Clerk's UserButton.
 */
export function ThemedUserButton({
  afterSignOutUrl = "/atlas",
  className = "",
}: ThemedUserButtonProps) {
  return (
    <div className={className}>
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-xs font-semibold text-primary">LU</span>
      </div>
    </div>
  );
}
