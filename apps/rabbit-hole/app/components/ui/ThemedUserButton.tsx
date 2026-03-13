"use client";

import { UserButton, useUser, useAuth } from "@clerk/nextjs";
import React from "react";

import { getUserTierClient, getTierLimitsClient } from "@proto/auth/client";
import { toast } from "@proto/ui/hooks";

import { useTheme } from "../../context/ThemeProvider";

import { ThemeSelector } from "./ThemeSelector";
import { UserStatsPage } from "./UserStatsPage";

/**
 * Icon component for theme menu item
 */
function PaletteIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="13.5" cy="6.5" r=".5" />
      <circle cx="17.5" cy="10.5" r=".5" />
      <circle cx="8.5" cy="7.5" r=".5" />
      <circle cx="6.5" cy="12.5" r=".5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

/**
 * Icon component for stats menu item
 */
function ChartIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

/**
 * Icon component for refresh menu item
 */
function RefreshIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
    </svg>
  );
}

interface ThemedUserButtonProps {
  afterSignOutUrl?: string;
  className?: string;
}

/**
 * Themed UserButton Component
 *
 * Wraps Clerk's UserButton with theme-aware styling and custom theme menu.
 * Automatically syncs with the application's theme system.
 */
export function ThemedUserButton({
  afterSignOutUrl = "/atlas",
  className = "",
}: ThemedUserButtonProps) {
  const { colorScheme } = useTheme();
  const { user } = useUser();
  const { getToken } = useAuth();
  const userTier = getUserTierClient(user || null);
  const tierLimits = getTierLimitsClient(userTier);
  const canCustomizeThemes = tierLimits.hasCustomThemes;

  // Handle session refresh
  const handleRefreshSession = async () => {
    try {
      // Force fetch fresh token from Clerk
      await getToken({ skipCache: true });

      toast({
        title: "Session Refreshed",
        description: "Your account details have been updated.",
        duration: 3000,
      });

      // Reload page after short delay
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("Failed to refresh session:", error);
      toast({
        title: "Refresh Failed",
        description: "Please try signing out and back in.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Resolve effective color scheme (handle "system" preference)
  const effectiveScheme: "light" | "dark" =
    colorScheme === "system"
      ? typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : colorScheme;

  // Theme-aware appearance configuration
  const appearance = {
    // Base theme syncs with color scheme
    baseTheme: effectiveScheme,

    elements: {
      // Avatar styling
      userButtonAvatarBox: "w-8 h-8 ring-2 ring-border",

      // Popover card - uses theme variables with backdrop blur
      userButtonPopoverCard: [
        "bg-card/95",
        "border border-border",
        "shadow-xl",
        "rounded-lg",
      ].join(" "),

      // Main content area
      userButtonPopoverMain: "bg-card",

      // Action buttons (menu items)
      userButtonPopoverActionButton: [
        "text-foreground",
        "hover:bg-muted",
        "transition-colors",
        "data-[active=true]:bg-primary",
        "data-[active=true]:text-primary-foreground",
      ].join(" "),

      // Footer area
      userButtonPopoverFooter: [
        "border-t",
        "border-border",
        "bg-muted/30",
      ].join(" "),

      // Actions container
      userButtonPopoverActions: "gap-1",

      // UserProfile modal (Account page)
      rootBox: "!bg-background",
      cardBox: ["!bg-card/95", "!border !border-border", "!shadow-2xl"].join(
        " "
      ),

      // Profile sections
      profileSection: "!bg-card",
      profileSectionPrimaryButton: [
        "!bg-primary",
        "!text-primary-foreground",
        "hover:!bg-primary/90",
      ].join(" "),

      // Card styling in profile
      card: "!bg-card !border !border-border",

      // Form elements
      formButtonPrimary: [
        "!bg-primary",
        "!text-primary-foreground",
        "hover:!bg-primary/90",
      ].join(" "),

      formFieldInput: [
        "!bg-background",
        "!border-border",
        "!text-foreground",
        "focus:!ring-primary",
      ].join(" "),

      // Navbar in modal
      navbar: "!bg-muted/30 !border-b !border-border",
      navbarButton: [
        "!text-foreground",
        "hover:!bg-muted",
        "data-[active=true]:!bg-primary",
        "data-[active=true]:!text-primary-foreground",
      ].join(" "),

      // Page scrollbox
      scrollBox: "!bg-card",
      pageScrollBox: "!bg-card",

      // Alert/notice components
      alert: "bg-muted/50 border border-border text-foreground",

      // Badge elements
      badge: "bg-primary/10 text-primary border-primary/20",
    },

    // Direct CSS variable overrides - these take precedence over class names
    variables: {
      // Core colors
      colorPrimary: "hsl(var(--primary-500))",
      colorDanger: "hsl(var(--destructive))",
      colorSuccess: "hsl(var(--success-500))",
      colorWarning: "hsl(var(--warning-500))",
      colorNeutral: "hsl(var(--muted))",

      // Background colors - these are key for modal
      colorBackground: "hsl(var(--card))",
      colorInputBackground: "hsl(var(--background))",

      // Text colors
      colorText: "hsl(var(--foreground))",
      colorTextSecondary: "hsl(var(--muted-foreground))",
      colorTextOnPrimaryBackground: "hsl(var(--primary-foreground))",

      // Border and spacing
      borderRadius: "0.5rem",

      // Force these CSS variables for UserProfile
      "--cl-color-background": "hsl(var(--card))",
      "--cl-color-text": "hsl(var(--foreground))",
      "--cl-color-text-secondary": "hsl(var(--muted-foreground))",
      "--cl-color-border": "hsl(var(--border))",
    },
  };

  return (
    <div className={className}>
      <UserButton
        afterSignOutUrl={afterSignOutUrl}
        appearance={appearance as any}
      >
        {/* Add custom menu items */}
        <UserButton.MenuItems>
          <UserButton.Action
            label="Stats"
            labelIcon={<ChartIcon />}
            open="stats"
          />
          <UserButton.Action
            label="Refresh Session"
            labelIcon={<RefreshIcon />}
            onClick={handleRefreshSession}
          />
          {canCustomizeThemes && (
            <UserButton.Action
              label="Theme Settings"
              labelIcon={<PaletteIcon />}
              open="theme"
            />
          )}
        </UserButton.MenuItems>

        {/* Add custom page for stats */}
        <UserButton.UserProfilePage
          label="Stats"
          labelIcon={<ChartIcon />}
          url="stats"
        >
          <UserStatsPage />
        </UserButton.UserProfilePage>

        {/* Add custom page for theme settings - only for paid tiers */}
        {canCustomizeThemes && (
          <UserButton.UserProfilePage
            label="Theme Settings"
            labelIcon={<PaletteIcon />}
            url="theme"
          >
            <div className="p-6">
              <ThemeSelector showColorSchemeToggle={true} />
            </div>
          </UserButton.UserProfilePage>
        )}
      </UserButton>
    </div>
  );
}
