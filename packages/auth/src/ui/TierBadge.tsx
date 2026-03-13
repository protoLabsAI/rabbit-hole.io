/**
 * TierBadge Component
 *
 * Displays the user's current tier with appropriate styling.
 */

"use client";

import { useUser } from "@clerk/nextjs";

import { getUserTierClient, getTierLabel, getTierColor } from "../client";

export function TierBadge() {
  const { user } = useUser();

  if (!user) return null;

  const tier = getUserTierClient(user);
  const label = getTierLabel(tier);
  const colorClass = getTierColor(tier);

  return (
    <span
      className={`text-xs px-2 py-1 rounded-md bg-muted font-medium ${colorClass}`}
      title={`${label} Tier`}
    >
      {label}
    </span>
  );
}
