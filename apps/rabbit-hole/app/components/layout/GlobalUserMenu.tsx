/**
 * Global User Menu
 *
 * Persistent navigation menu that follows authenticated users across all pages.
 * Provides quick access to navigation, account settings, and workspace features.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  getUserTierClient,
  getTierLimitsClient,
} from "@protolabsai/auth/client";
import { TierBadge } from "@protolabsai/auth/ui";
import { Icon } from "@protolabsai/icon-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@protolabsai/ui/atoms";
import { TierGatedMenuItem } from "@protolabsai/ui/organisms";

import { ThemeSelector } from "@/components/ui/ThemeSelector";
import { useTheme } from "@/context/ThemeProvider";

export interface GlobalUserMenuProps {
  /** Optional CSS class */
  className?: string;
}

export function GlobalUserMenu({ className = "" }: GlobalUserMenuProps) {
  const user = {
    id: "local-user",
    firstName: "Local",
    lastName: "User",
    fullName: "Local User",
    imageUrl: "",
    publicMetadata: { tier: "free", role: "admin" },
    emailAddresses: [{ emailAddress: "local@localhost" }],
    primaryEmailAddress: { emailAddress: "local@localhost" },
  } as any;
  const signOut = async () => {};
  const openUserProfile = () => {};
  const { branding } = useTheme();
  const pathname = usePathname();
  // Hide the Research + Atlas nav entries in production until the new flow ships.
  const researchAtlasEnabled =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_RESEARCH_ATLAS === "true";
  const [menuOpen, setMenuOpen] = useState(false);
  const [themePopoverOpen, setThemePopoverOpen] = useState(false);

  const userTier = getUserTierClient(user || null);
  const tierLimits = getTierLimitsClient(userTier);
  const canCustomizeThemes = tierLimits.hasCustomThemes;

  // Don't render if user not loaded or on auth pages
  if (!user) return null;
  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) {
    return null;
  }

  // Generate initials for avatar fallback
  const getInitials = () => {
    if (!user) return "?";
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (
      (first + last).toUpperCase() ||
      user.emailAddresses[0]?.emailAddress[0]?.toUpperCase() ||
      "?"
    );
  };

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
  };

  const handleOpenAccountSettings = () => {
    openUserProfile();
    setMenuOpen(false);
  };

  const handleOpenThemeSettings = () => {
    setThemePopoverOpen(true);
    setMenuOpen(false); // Close menu when opening theme popover
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className={`p-2 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground ${className}`}
            title="User menu"
            aria-label="Open user menu"
          >
            <Icon name="menu" size={18} />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="min-w-[280px]"
          align="end"
          side="bottom"
          sideOffset={12}
        >
          {/* User Section */}
          <DropdownMenuLabel>
            <div className="flex items-center gap-3 py-2">
              {/* Avatar */}
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {user.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt={user.fullName || "User"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold text-primary">
                    {getInitials()}
                  </span>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {user.fullName || "User"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {user.primaryEmailAddress?.emailAddress}
                </div>
                <div className="mt-1">
                  <TierBadge />
                </div>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Navigation Section */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Navigation
          </DropdownMenuLabel>

          {researchAtlasEnabled && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/atlas" className="cursor-pointer">
                  <Icon name="network" size={14} className="mr-2" />
                  Atlas
                  {pathname === "/atlas" && (
                    <span className="ml-auto text-xs text-primary">•</span>
                  )}
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/research" className="cursor-pointer">
                  <Icon name="edit" size={14} className="mr-2" />
                  Research
                  {pathname === "/research" && (
                    <span className="ml-auto text-xs text-primary">•</span>
                  )}
                </Link>
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuItem asChild>
            <Link href="/playground" className="cursor-pointer">
              <Icon name="box" size={14} className="mr-2" />
              Playground
              {pathname === "/playground" && (
                <span className="ml-auto text-xs text-primary">•</span>
              )}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="cursor-pointer">
              <Icon name="grid" size={14} className="mr-2" />
              Dashboard
              {pathname === "/dashboard" && (
                <span className="ml-auto text-xs text-primary">•</span>
              )}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/pricing" className="cursor-pointer">
              <Icon name="tag" size={14} className="mr-2" />
              Pricing
              {pathname === "/pricing" && (
                <span className="ml-auto text-xs text-primary">•</span>
              )}
            </Link>
          </DropdownMenuItem>

          {branding?.homeUrl && (
            <DropdownMenuItem asChild>
              <Link
                href={branding.homeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer"
              >
                <Icon name="external-link" size={14} className="mr-2" />
                {branding.name || "Public Site"}
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Account Section */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Account
          </DropdownMenuLabel>

          <TierGatedMenuItem
            icon="settings"
            label="Theme Settings"
            hasAccess={canCustomizeThemes}
            onClick={handleOpenThemeSettings}
            tierLabel="Basic"
            featureInfo={{
              name: "Custom Themes",
              description:
                "Personalize your workspace with custom color schemes and themes",
              benefits: [
                "20+ pre-built themes",
                "Custom color palettes",
                "Dark and light mode support",
                "Save and export your themes",
              ],
              tier: "basic",
            }}
          />

          <DropdownMenuItem onClick={handleOpenAccountSettings}>
            <Icon name="settings" size={14} className="mr-2" />
            Account Settings
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-destructive focus:text-destructive"
          >
            <Icon name="arrow-left" size={14} className="mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Theme Settings Popover - Independent, positioned in top-right */}
      {themePopoverOpen && (
        <div className="fixed top-14 right-4 z-50">
          <div className="bg-card border border-border rounded-lg shadow-lg p-4 w-80">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-sm">Theme Settings</h4>
              <button
                onClick={() => setThemePopoverOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Close"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
            <ThemeSelector showColorSchemeToggle />
          </div>
        </div>
      )}
    </>
  );
}
