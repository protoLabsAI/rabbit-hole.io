/**
 * Global User Menu Wrapper
 *
 * Client component wrapper for the global user menu.
 * Positioned to match research workspace TabBar placement (top-right of tab bar area).
 * Visible on all pages. Clerk has been removed.
 */

"use client";

import { GlobalUserMenu } from "./GlobalUserMenu";

export function GlobalUserMenuWrapper() {
  return (
    <div className="fixed top-2 right-4 z-50">
      <GlobalUserMenu />
    </div>
  );
}
