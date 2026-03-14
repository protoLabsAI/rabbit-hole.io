/**
 * Client Role Guard Component
 *
 * Conditional rendering based on user role
 * Used to show/hide UI elements based on authentication and authorization
 */

"use client";

import { getUserRoleClient, hasMinimumRole, type UserRole } from "../client";

interface ClientRoleGuardProps {
  minimumRole: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ClientRoleGuard({
  minimumRole,
  children,
  fallback = null,
}: ClientRoleGuardProps) {
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

  if (!user) return <>{fallback}</>;

  const userRole = getUserRoleClient(user);
  const hasAccess = hasMinimumRole(userRole, minimumRole);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
