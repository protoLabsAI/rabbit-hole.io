/**
 * Role Manager Component
 *
 * Provides UI for viewing and managing user roles in development/admin contexts.
 * Shows current user role, available roles, and role-based feature access.
 */

"use client";

import React, { useState } from "react";

import {
  getUserRoleClient,
  getAvailableRoles,
  getRoleDisplay,
  hasMinimumRole,
  type UserRole,
} from "../client";

interface RoleManagerProps {
  showPermissions?: boolean;
  showRoleSelector?: boolean;
  className?: string;
}

export function RoleManager({
  showPermissions = true,
  showRoleSelector = false,
  className = "",
}: RoleManagerProps) {
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
  const isSignedIn = true;
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  if (!isSignedIn || !user) {
    return (
      <div className={`p-4 border rounded-lg bg-muted ${className}`}>
        <h3 className="font-semibold text-sm text-muted-foreground">
          Role Information
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          Sign in to view role information
        </p>
      </div>
    );
  }

  const currentRole = getUserRoleClient(user);
  const currentRoleDisplay = getRoleDisplay(currentRole);
  const availableRoles = getAvailableRoles();

  return (
    <div className={`p-4 border rounded-lg bg-card ${className}`}>
      <h3 className="font-semibold text-sm mb-3">Role Information</h3>

      {/* Current Role */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Current Role:</span>
          <span className={`text-sm font-semibold ${currentRoleDisplay.color}`}>
            {currentRoleDisplay.label}
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          {currentRoleDisplay.description}
        </p>
      </div>

      {/* Role Selector (for development/admin) */}
      {showRoleSelector && (
        <div className="mt-4 pt-3 border-t">
          <label className="text-sm font-medium mb-2 block">
            Test Different Role:
          </label>
          <select
            value={selectedRole || currentRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
            className="w-full px-2 py-1 text-sm border rounded"
          >
            {availableRoles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label} - {role.description}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            This is for testing UI only - doesn&apos;t actually change your role
          </p>
        </div>
      )}

      {/* Permissions */}
      {showPermissions && (
        <div className="mt-4 pt-3 border-t">
          <h4 className="text-sm font-medium mb-2">Current Permissions:</h4>
          <div className="flex flex-wrap gap-1">
            {currentRoleDisplay.permissions.map((permission) => (
              <span
                key={permission}
                className="px-2 py-1 text-xs bg-muted rounded-md text-muted-foreground"
              >
                {permission}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Role Hierarchy */}
      <div className="mt-4 pt-3 border-t">
        <h4 className="text-sm font-medium mb-2">Role Levels:</h4>
        <div className="space-y-1">
          {availableRoles.map((role) => {
            const hasAccess = hasMinimumRole(currentRole, role.value);
            return (
              <div
                key={role.value}
                className="flex items-center justify-between"
              >
                <span className="text-sm">{role.label}</span>
                <span
                  className={`text-xs ${hasAccess ? "text-green-600" : "text-muted-foreground"}`}
                >
                  {hasAccess ? "✅ Access" : "❌ No access"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Debug Info */}
      <details className="mt-4 pt-3 border-t">
        <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
          Debug Information
        </summary>
        <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
          <div>User ID: {user.id}</div>
          <div>Email: {user.emailAddresses[0]?.emailAddress}</div>
          <div>
            Role (from metadata):{" "}
            {(user.publicMetadata?.role as string) || "none"}
          </div>
          <div>Computed Role: {currentRole}</div>
        </div>
      </details>
    </div>
  );
}

/**
 * Quick role indicator for header/navigation
 */
export function RoleIndicator({ className = "" }: { className?: string }) {
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
  const isSignedIn = true;

  if (!isSignedIn || !user) {
    return null;
  }

  const currentRole = getUserRoleClient(user);
  const roleDisplay = getRoleDisplay(currentRole);

  return (
    <span
      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${roleDisplay.color} bg-opacity-10 ${className}`}
    >
      {roleDisplay.label}
    </span>
  );
}

/**
 * Role-based feature toggle
 */
interface RoleFeatureProps {
  requiredRole: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleFeature({
  requiredRole,
  children,
  fallback = null,
}: RoleFeatureProps) {
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
  const isSignedIn = true;

  if (!isSignedIn || !user) {
    return <>{fallback}</>;
  }

  const currentRole = getUserRoleClient(user);
  const hasAccess = hasMinimumRole(currentRole, requiredRole);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Simple role guard component
 */
interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export function RoleGuard({
  allowedRoles,
  children,
  fallback = null,
  showFallback = true,
}: RoleGuardProps) {
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
  const isSignedIn = true;

  if (!isSignedIn || !user) {
    return showFallback ? <>{fallback}</> : null;
  }

  const currentRole = getUserRoleClient(user);
  const hasAccess = allowedRoles.some((role) =>
    hasMinimumRole(currentRole, role)
  );

  if (!hasAccess) {
    return showFallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
