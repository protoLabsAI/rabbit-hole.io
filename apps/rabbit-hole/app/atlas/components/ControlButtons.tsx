/**
 * ControlButtons Component
 *
 * Action buttons for Import, Export, AI Research, and Graph Controls.
 * Includes Reset View and Fit to Screen functionality for the graph.
 * Pure component that receives callbacks for all actions.
 *
 * Requires authentication for Import, Export, and AI Research actions.
 */

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import {
  getUserRoleClient,
  hasMinimumRole,
  USER_ROLES,
} from "@proto/auth/client";
import { Button } from "@proto/ui/atoms";

import { FileUploadButton } from "../../components/ui/FileUploadButton";

interface ControlButtonsProps {
  onOpenBulkImport: () => void;
  onOpenAddForm: () => void;
  onExport: () => void;
  onResetView?: () => void;
  onFitToScreen?: () => void;
}

/**
 * Client-only wrapper to prevent hydration mismatches with auth state
 */
function ClientOnlyAuthSection({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    // During SSR and initial hydration, render a placeholder that matches
    // the expected structure but doesn't depend on auth state
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2 opacity-0">
          <Button variant="secondary" size="sm" disabled>
            Loading...
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function ControlButtons({
  onOpenBulkImport,
  onOpenAddForm,
  onExport,
  onResetView,
  onFitToScreen,
}: ControlButtonsProps) {
<<<<<<< HEAD
  const user = { id: "local-user", firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], primaryEmailAddress: { emailAddress: "local@localhost" } } as any;
=======
  const user = {
    id: "local-user",
    firstName: "Local",
    lastName: "User",
    username: "local-user",
    fullName: "Local User",
    emailAddresses: [{ emailAddress: "local@localhost" }],
    publicMetadata: { tier: "pro" },
    privateMetadata: { stats: {} },
    isSignedIn: true,
  };
>>>>>>> origin/main
  const router = useRouter();
  const userRole = user ? getUserRoleClient(user) : null;
  const isSuperAdmin = userRole
    ? hasMinimumRole(userRole, USER_ROLES.SUPER_ADMIN)
    : false;

  return (
    <div className="flex items-center space-x-4" data-testid="control-buttons">
      {/* Super Admin Only: Import & Add Entity */}
      {isSuperAdmin && (
        <ClientOnlyAuthSection>
          <div className="flex items-center space-x-2">
            <Button
              onClick={onOpenBulkImport}
              variant="secondary"
              size="sm"
              title="Upload JSON bundle with evidence, entities, and relationships"
            >
              Import
            </Button>

            <FileUploadButton variant="outline" size="sm" />

            <Button
              onClick={onOpenAddForm}
              variant="default"
              size="sm"
              title="Add entity to Atlas (Super Admin only)"
            >
              Add Entity
            </Button>
          </div>
        </ClientOnlyAuthSection>
      )}

      {/* All Authenticated Users: Export & Research Link */}
      <ClientOnlyAuthSection>
        <div className="flex items-center space-x-2">
          <Button
            onClick={onExport}
            variant="outline"
            size="sm"
            title="Download current graph as importable JSON bundle"
          >
            Export
          </Button>

          <Button
            onClick={() => router.push("/research")}
            variant="default"
            size="sm"
            title="Create and edit your own personal knowledge graph"
          >
            AI Research →
          </Button>
        </div>
<<<<<<< HEAD
=======

        {/* Unauthenticated Users: Show Login button */}
        {
          /* SignedOut: removed */

          <Button variant="outline" size="sm">
            <span>🔒</span>
            <span>Sign In for Research Tools</span>
          </Button>
        }
>>>>>>> origin/main
      </ClientOnlyAuthSection>

      {/* Graph Controls */}
      <div className="flex items-center space-x-2 border-l border-border pl-4">
        {onFitToScreen && (
          <Button
            onClick={onFitToScreen}
            variant="outline"
            size="sm"
            title="Fit graph to screen"
          >
            <span>📐</span>
            <span>Fit</span>
          </Button>
        )}

        {onResetView && (
          <Button
            onClick={onResetView}
            variant="destructive"
            size="sm"
            title="Reset zoom, pan, and clear selections"
          >
            <span>🔄</span>
            <span>Reset</span>
          </Button>
        )}
      </div>
    </div>
  );
}
