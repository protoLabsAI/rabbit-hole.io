/**
 * Tier-Gated Menu Item
 *
 * Reusable component for dropdown menu items that require paid tiers.
 * Shows detailed feature popover for free users, with tier badge.
 */

"use client";

import { DropdownMenuItem } from "../../../atoms/dropdown-menu";
import { Icon, type RegisteredIconName } from "../../../atoms/icon";
import {
  PaidFeaturePopover,
  type PaidFeatureInfo,
} from "../paid-feature-popover";

export interface TierGatedMenuItemProps {
  /** Icon to display */
  icon: RegisteredIconName;

  /** Label text */
  label: string;

  /** Whether user has access to this feature */
  hasAccess: boolean;

  /** Callback when item is clicked (only called if hasAccess=true) */
  onClick?: () => void;

  /** Minimum tier required (displayed as badge for free users) */
  tierLabel?: "Basic" | "Pro" | "Team" | "Enterprise";

  /** Feature details for popover (optional - if not provided, shows simple badge) */
  featureInfo?: Omit<PaidFeatureInfo, "tier"> & {
    tier?: PaidFeatureInfo["tier"];
  };
}

/**
 * Tier-gated dropdown menu item.
 *
 * **Paid users:** Normal menu item with onClick handler
 * **Free users:** Shows popover with feature details and tier badge
 *
 * @example
 * ```tsx
 * <TierGatedMenuItem
 *   icon="settings"
 *   label="Theme Settings"
 *   hasAccess={tierLimits.hasCustomThemes}
 *   onClick={handleOpenThemeSettings}
 *   tierLabel="Basic"
 *   featureInfo={{
 *     name: "Custom Themes",
 *     description: "Personalize your workspace appearance",
 *     benefits: ["Custom color schemes", "Dark/light modes", "Save presets"],
 *     tier: "basic"
 *   }}
 * />
 * ```
 */
export function TierGatedMenuItem({
  icon,
  label,
  hasAccess,
  onClick,
  tierLabel = "Pro",
  featureInfo,
}: TierGatedMenuItemProps) {
  // Tier label mapping for badge
  const tierLabelMap = {
    Basic: "basic",
    Pro: "pro",
    Team: "team",
    Enterprise: "enterprise",
  } as const;

  // User has access - normal menu item
  if (hasAccess) {
    return (
      <DropdownMenuItem onClick={onClick}>
        <Icon name={icon} size={14} className="mr-2" />
        {label}
      </DropdownMenuItem>
    );
  }

  // User lacks access - show popover if feature info provided
  const menuItem = (
    <DropdownMenuItem
      onSelect={(e) => {
        // Prevent menu from closing when clicking on gated item
        e.preventDefault();
      }}
    >
      <Icon name={icon} size={14} className="mr-2" />
      <span>{label}</span>
      <span className="ml-auto text-xs text-muted-foreground px-1.5 py-0.5 rounded-sm bg-muted">
        {tierLabel}
      </span>
    </DropdownMenuItem>
  );

  // If feature info provided, wrap in popover
  if (featureInfo) {
    const fullFeatureInfo: PaidFeatureInfo = {
      ...featureInfo,
      tier: featureInfo.tier || tierLabelMap[tierLabel],
      icon: featureInfo.icon || (
        <Icon name={icon} size={20} className="text-primary" />
      ),
    };

    return (
      <PaidFeaturePopover
        feature={fullFeatureInfo}
        hasAccess={hasAccess}
        trigger="click"
        align="start"
        side="right"
      >
        {menuItem}
      </PaidFeaturePopover>
    );
  }

  // No feature info - simple disabled item
  return menuItem;
}
