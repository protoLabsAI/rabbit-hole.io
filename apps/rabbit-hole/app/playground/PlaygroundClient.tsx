"use client";

/**
 * Playground Client Component
 *
 * Interactive testing environment with auth protection.
 * Requires authentication and Basic tier minimum.
 */

import { useAuth, SignInButton, useUser } from "@clerk/nextjs";

import { getUserTierClient } from "@proto/auth/client";

import { PlaygroundHub } from "./components/playground-hub";

export default function PlaygroundClient() {
  const { userId } = useAuth();
  const { user, isLoaded } = useUser();

  // Wait for user data to load
  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-lg font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show inline sign-in (no redirect to avoid loops)
  if (!userId) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-semibold mb-2">Sign In Required</h2>
          <p className="text-muted-foreground mb-4">
            Sign in to access the playground testing environment.
          </p>
          <SignInButton mode="modal">
            <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium">
              Sign In
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  // Check tier for access (only after user is loaded)
  const userTier = getUserTierClient(user || null);
  const hasAccess = userTier !== "free"; // Basic tier minimum

  // Tier check - require Basic tier minimum
  if (!hasAccess) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⭐</div>
          <h2 className="text-2xl font-semibold mb-2">Upgrade Required</h2>
          <p className="text-muted-foreground mb-6">
            Access to the playground requires a Basic tier subscription or
            higher.
          </p>
          <div className="space-y-3">
            <a
              href="/pricing"
              className="block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
            >
              View Pricing
            </a>
            <p className="text-xs text-muted-foreground">
              Current tier: <span className="font-medium">{userTier}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main playground interface
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Playground Hub - Full Screen (global menu handles navigation) */}
      <PlaygroundHub />
    </div>
  );
}
