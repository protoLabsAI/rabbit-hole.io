/**
 * Global User Menu Wrapper
 *
 * Client component wrapper for the global user menu.
 * Positioned to match research workspace TabBar placement (top-right of tab bar area).
 * Visible on all pages for authenticated users.
 */

"use client";

import { SignedIn } from "@clerk/nextjs";

import { GlobalUserMenu } from "./GlobalUserMenu";

export function GlobalUserMenuWrapper() {
  return (
    <SignedIn>
      <div className="fixed top-2 right-4 z-50">
        <GlobalUserMenu />
      </div>
    </SignedIn>
  );
}
