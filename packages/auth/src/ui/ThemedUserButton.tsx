"use client";

import React from "react";

<<<<<<< HEAD
=======
import { toast } from "@proto/ui/atoms";
import { useTheme } from "@proto/ui/theme";

import { getUserTierClient, getTierLimitsClient } from "../client";

>>>>>>> origin/main
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
<<<<<<< HEAD
  return (
    <div className={className}>
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-xs font-semibold text-primary">LU</span>
      </div>
=======
  const { colorScheme } = useTheme();
  const user = {
    id: "local-user",
    firstName: "Local",
    lastName: "User",
    username: "local-user",
    fullName: "Local User",
    emailAddresses: [{ emailAddress: "local@localhost" }],
    publicMetadata: { tier: "pro", role: "super_admin" },
    privateMetadata: { stats: {} },
  };
  const getToken = async (_?: any) => null;
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
      <button className={className} type="button">
        Local User
      </button>
>>>>>>> origin/main
    </div>
  );
}
