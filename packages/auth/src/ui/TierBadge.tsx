/**
 * TierBadge Component
 *
 * Displays the user's current tier with appropriate styling.
 */

"use client";

import { getUserTierClient, getTierLabel, getTierColor } from "../client";

export function TierBadge() {
<<<<<<< HEAD
  const user = { id: "local-user", firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], primaryEmailAddress: { emailAddress: "local@localhost" } } as any;

  if (!user) return null;
=======
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
>>>>>>> origin/main

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
