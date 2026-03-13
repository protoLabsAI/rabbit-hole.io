/**
 * AtlasHeader Component
 *
 * Displays the Rabbit Hole brand and logo in the atlas page header.
 * Supports children for additional header content like control buttons.
 */

"use client";

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import { Button } from "@proto/ui/atoms";

import { ThemedUserButton } from "../../components/ui/ThemedUserButton";
import { useTheme } from "../../context/ThemeProvider";

/**
 * Client-only wrapper to prevent hydration mismatches with auth state
 */
function ClientOnlyAuthSection({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null; // Return nothing on server-side and initial client render
  }

  return <>{children}</>;
}

interface AtlasHeaderProps {
  viewModeIndicator?: React.ReactNode;
  controlButtons?: React.ReactNode;
  onLogoClick?: () => void;
}

export function AtlasHeader({
  viewModeIndicator,
  controlButtons,
  onLogoClick,
}: AtlasHeaderProps) {
  const router = useRouter();
  const { branding } = useTheme();

  const handleLogoClick = () => {
    if (onLogoClick) {
      // Use custom handler if provided (for atlas page to reset view)
      onLogoClick();
    } else {
      // Default behavior for other pages
      router.push(branding?.homeUrl || "/atlas");
    }
  };

  return (
    <div
      className="bg-card/90 shadow-sm border-b border-border flex-shrink-0"
      data-testid="atlas-header"
    >
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Brand - Clickable to go to atlas */}
          <button
            onClick={handleLogoClick}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg px-2 py-1 -mx-2 -my-1"
            data-testid="brand-section"
            title="Go to Atlas home"
          >
            <div className="text-4xl" data-testid="logo-container">
              {branding?.logo || "✏️"}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {branding?.name || "research-graph.com"}
              </h1>
            </div>
          </button>

          {/* Center: View Mode Indicator */}
          {viewModeIndicator && (
            <div className="flex-1 flex justify-center">
              {viewModeIndicator}
            </div>
          )}

          {/* Right: Control Buttons & Authentication */}
          <div className="flex items-center space-x-4">
            {controlButtons}

            {/* Authentication UI */}
            <div className="border-l border-border pl-4 flex items-center">
              <ClientOnlyAuthSection>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
                      <span>Sign In</span>
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <div className="flex items-center gap-3">
                    <Link href="/dashboard">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Development Dashboard"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        🛠️
                      </Button>
                    </Link>
                    <ThemedUserButton afterSignOutUrl="/atlas" />
                  </div>
                </SignedIn>
              </ClientOnlyAuthSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
