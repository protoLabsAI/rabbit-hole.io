/**
 * Global User Menu
 *
 * Persistent navigation menu that follows authenticated users across all pages.
 * Provides quick access to navigation, account settings, and workspace features.
 * Clerk has been removed — uses local user context.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Icon } from "@proto/icon-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@proto/ui/atoms";

import { ThemeSelector } from "@/components/ui/ThemeSelector";
import { useTheme } from "@/context/ThemeProvider";

export interface GlobalUserMenuProps {
  /** Optional CSS class */
  className?: string;
}

const LOCAL_USER = {
  id: "local-user",
  firstName: "Local",
  lastName: "User",
  fullName: "Local User",
  imageUrl: null as string | null,
  primaryEmailAddress: { emailAddress: "local@localhost" },
};

export function GlobalUserMenu({ className = "" }: GlobalUserMenuProps) {
<<<<<<< HEAD
  const user = { id: "local-user", firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], primaryEmailAddress: { emailAddress: "local@localhost" } } as any;
  const signOut = async () => {}; const openUserProfile = () => {};
=======
>>>>>>> origin/main
  const { branding } = useTheme();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [themePopoverOpen, setThemePopoverOpen] = useState(false);

  const user = LOCAL_USER;

  // Don't render on auth pages
  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) {
    return null;
  }

  // Generate initials for avatar fallback
  const getInitials = () => {
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last).toUpperCase() || "LU";
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    // No-op: auth removed
  };

  const handleOpenAccountSettings = () => {
    setMenuOpen(false);
    // No-op: Clerk profile UI removed
  };

  const handleOpenThemeSettings = () => {
    setThemePopoverOpen(true);
    setMenuOpen(false);
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
                <span className="text-sm font-semibold text-primary">
                  {getInitials()}
                </span>
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {user.fullName || "User"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {user.primaryEmailAddress?.emailAddress}
                </div>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Navigation Section */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Navigation
          </DropdownMenuLabel>

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

          <DropdownMenuItem onClick={handleOpenThemeSettings}>
            <Icon name="settings" size={14} className="mr-2" />
            Theme Settings
          </DropdownMenuItem>

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
