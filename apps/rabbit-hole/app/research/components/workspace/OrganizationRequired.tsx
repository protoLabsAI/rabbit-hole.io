/**
 * Organization Required Component
 *
 * Shows when Team/Enterprise tier user isn't in an organization context.
 * Free/Basic users don't need organizations (user workspaces only).
 */

"use client";

import { useEffect, useState } from "react";

import { getUserTierClient } from "@proto/auth/client";

export function OrganizationRequired() {
  const user = { id: "local-user", firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], primaryEmailAddress: { emailAddress: "local@localhost" } } as any;
  const tier = getUserTierClient(user || null);
  const needsOrg = tier === "team" || tier === "enterprise";

  // Free/Basic users don't need org
  if (!needsOrg) {
    return null;
  }

  const orgList = { userMemberships: { data: [], count: 0, isLoading: false }, setActive: async (_: any) => {} } as any;
  const [attempting, setAttempting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-select organization if user is a member
  useEffect(() => {
    if (!orgList.isLoaded) return;

    const selectOrg = async () => {
      try {
        // Get user's organization memberships
        const memberships = orgList.userMemberships?.data;

        if (memberships && memberships.length > 0) {
          // Set first organization as active
          const firstOrgId = memberships[0].organization.id;
          console.log("🔄 Setting active organization:", firstOrgId);
          console.log(
            "Available memberships:",
            memberships.map((m) => ({
              id: m.organization.id,
              name: m.organization.name,
            }))
          );

          if (orgList.setActive) {
            await orgList.setActive({ organization: firstOrgId });
            console.log("✅ Organization activated");
          } else {
            console.error("❌ setActive not available");
            setAttempting(false);
            setError("Organization activation not available");
          }
        } else {
          // User truly has no organizations
          console.log("❌ No organizations found for user");
          setAttempting(false);
          setError("No organizations found");
        }
      } catch (err) {
        console.error("Failed to set active organization:", err);
        setAttempting(false);
        setError(
          err instanceof Error ? err.message : "Failed to activate organization"
        );
      }
    };

    selectOrg();
  }, [orgList]);

  // Show loading while attempting to set org
  if (attempting) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-lg font-medium">Setting up organization...</p>
        </div>
      </div>
    );
  }

  // User has no organizations at all
  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="max-w-md text-center space-y-6 p-8">
        <div className="text-6xl mb-4">🏢</div>

        <h1 className="text-2xl font-semibold">Organization Required</h1>

        <div className="space-y-4 text-muted-foreground">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <p>
            Your {tier} tier requires an organization for team collaboration
            features.
          </p>

          <div className="bg-muted/50 p-4 rounded-lg text-left text-sm space-y-2">
            <p className="font-medium text-foreground">To continue:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Contact your admin to be added to an organization</li>
              <li>Or create a new organization from your user menu</li>
              <li>Refresh this page after joining</li>
            </ol>
          </div>

          {user && (
            <p className="text-xs">
              Logged in as:{" "}
              <span className="font-medium">
                {user.primaryEmailAddress?.emailAddress}
              </span>
            </p>
          )}
        </div>

        <div className="pt-4">
          <a
            href="https://clerk.com/docs/organizations/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Learn more about organizations →
          </a>
        </div>
      </div>
    </div>
  );
}
