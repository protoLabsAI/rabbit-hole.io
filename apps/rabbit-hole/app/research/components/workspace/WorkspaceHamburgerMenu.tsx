/**
 * Workspace Hamburger Menu
 *
 * Compact menu for workspace navigation, user settings, and controls.
 * Replaces AppNavBar in research workspace to maximize canvas space.
 */

"use client";

import Link from "next/link";
import { useState } from "react";

import { getUserTierClient, getTierLimitsClient } from "@proto/auth/client";
import { TierBadge } from "@proto/auth/ui";
import { Icon } from "@proto/icon-system";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@proto/ui/atoms";
import { PaidFeaturePopover, TierGatedMenuItem } from "@proto/ui/organisms";

import { ThemeSelector } from "@/components/ui/ThemeSelector";
import { useTheme } from "@/context/ThemeProvider";

export interface WorkspaceHamburgerMenuProps {
  /** Current workspace ID */
  workspaceId: string;

  /** Whether workspace is in view mode */
  isViewMode: boolean;

  /** Toggle view mode callback */
  onViewModeToggle: () => void;

  /** Start collaboration session callback */
  onNewSession: () => void;

  /** Whether current user is workspace owner */
  isOwner: boolean;

  /** Optional CSS class */
  className?: string;
}

export function WorkspaceHamburgerMenu({
  workspaceId,
  isViewMode,
  onViewModeToggle,
  onNewSession,
  isOwner,
  className = "",
}: WorkspaceHamburgerMenuProps) {
  const user = { id: "local-user", firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], primaryEmailAddress: { emailAddress: "local@localhost" } } as any;
  const signOut = async () => {}; const openUserProfile = () => {};
  const { branding } = useTheme();
  const [showThemeDialog, setShowThemeDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const userTier = getUserTierClient(user || null);
  const tierLimits = getTierLimitsClient(userTier);
  const canUseCollaboration = tierLimits.maxActiveSessions > 0;
  const canCustomizeThemes = tierLimits.hasCustomThemes;

  // Feature flag - collaboration temporarily disabled
  const COLLABORATION_ENABLED = false;

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
    setShowThemeDialog(true);
    setMenuOpen(false);
  };

  const handleViewModeToggle = () => {
    onViewModeToggle();
    setMenuOpen(false);
  };

  const handleNewSession = () => {
    onNewSession();
    setMenuOpen(false);
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className={`p-2 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground ${className}`}
            title="Workspace menu"
            aria-label="Open workspace menu"
          >
            <Icon name="menu" size={16} />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="min-w-[280px] mr"
          align="end"
          side="bottom"
          sideOffset={12}
        >
          {/* User Section */}
          {user && (
            <>
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
            </>
          )}

          {/* Workspace Section */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Workspace
          </DropdownMenuLabel>

          <DropdownMenuItem disabled className="text-xs font-mono">
            <Icon name="folder" size={14} className="mr-2" />
            <span className="truncate">{workspaceId.slice(0, 16)}...</span>
          </DropdownMenuItem>

          {isOwner && (
            <DropdownMenuItem onClick={handleViewModeToggle}>
              <Icon
                name={isViewMode ? "edit" : "eye"}
                size={14}
                className="mr-2"
              />
              {isViewMode ? "Switch to Edit Mode" : "Switch to View Mode"}
            </DropdownMenuItem>
          )}

          {isOwner &&
            (COLLABORATION_ENABLED ? (
              <PaidFeaturePopover
                hasAccess={canUseCollaboration}
                trigger="click"
                feature={{
                  name: "Collaboration Sessions",
                  icon: (
                    <Icon name="users" size={20} className="text-primary" />
                  ),
                  description:
                    "Create live collaboration sessions for real-time teamwork",
                  benefits: [
                    "Real-time collaborative editing",
                    "Follow mode - track teammates",
                    "Presence indicators",
                    "Up to 5 concurrent sessions (Pro)",
                  ],
                  tier: "basic",
                }}
                align="start"
                side="right"
              >
                <DropdownMenuItem
                  onSelect={(e) => {
                    if (canUseCollaboration) {
                      handleNewSession();
                    } else {
                      e.preventDefault();
                    }
                  }}
                >
                  <Icon name="users" size={14} className="mr-2" />
                  <span>Start Collaboration Session</span>
                  {!canUseCollaboration && (
                    <span className="ml-auto text-xs text-muted-foreground px-1.5 py-0.5 rounded-sm bg-muted">
                      Pro
                    </span>
                  )}
                </DropdownMenuItem>
              </PaidFeaturePopover>
            ) : (
              <DropdownMenuItem disabled>
                <Icon name="sparkles" size={14} className="mr-2" />
                <span>Collaboration (Coming Soon)</span>
              </DropdownMenuItem>
            ))}

          <DropdownMenuSeparator />

          {/* Navigation Section */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Navigation
          </DropdownMenuLabel>

          <DropdownMenuItem asChild>
            <Link href="/atlas" className="cursor-pointer">
              <Icon name="network" size={14} className="mr-2" />
              Atlas
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="cursor-pointer">
              <Icon name="grid" size={14} className="mr-2" />
              Dashboard
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/pricing" className="cursor-pointer">
              <Icon name="tag" size={14} className="mr-2" />
              Pricing
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

      {/* Theme Settings Dialog */}
      <Dialog open={showThemeDialog} onOpenChange={setShowThemeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Theme Settings</DialogTitle>
          </DialogHeader>
          <ThemeSelector showColorSchemeToggle />
        </DialogContent>
      </Dialog>
    </>
  );
}
