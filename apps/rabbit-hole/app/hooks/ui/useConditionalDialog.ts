/**
 * Conditional Dialog Hook
 *
 * Wraps dialog hooks with conditional access controls based on
 * authentication, permissions, or any custom logic.
 */
import { useCallback, useState } from "react";

import {
  type UserRole,
  getUserRoleClient,
  hasMinimumRole,
  ROLE_METADATA,
  USER_ROLES,
} from "@proto/auth/client";

import type {
  ConditionalDialogConfig,
  DialogCondition,
} from "../../context/types";

import { useToastManager } from "./useToastManager";

export * from "../useUserStats";

// Predefined common conditions (factory functions)
export const DialogConditions = {
  /**
   * Requires user to be authenticated
   */
  isAuthenticated: (isSignedIn: boolean): DialogCondition => ({
    id: "auth-required",
    name: "Authentication Required",
    check: () => isSignedIn,
    fallbackMessage: "Please sign in to access this feature",
  }),

  /**
   * Requires specific user role or permission (legacy)
   */
  hasRole: (role: string, userRole?: string): DialogCondition => ({
    id: `role-${role}`,
    name: `Role: ${role}`,
    check: () => userRole === role,
    fallbackMessage: `This feature requires ${role} access`,
  }),

  /**
   * Requires minimum user role level using new role system
   */
  hasMinimumRole: (
    requiredRole: UserRole,
    currentRole?: UserRole
  ): DialogCondition => ({
    id: `role-min-${requiredRole}`,
    name: `Role: ${(requiredRole as string) === "super_admin" ? "Super Admin" : ROLE_METADATA[requiredRole as keyof typeof ROLE_METADATA].label}`,
    check: () =>
      currentRole ? hasMinimumRole(currentRole, requiredRole) : false,
    fallbackMessage: `This feature requires ${(requiredRole as string) === "super_admin" ? "Super Admin" : ROLE_METADATA[requiredRole as keyof typeof ROLE_METADATA].label} access`,
  }),

  /**
   * Custom condition function
   */
  custom: (
    id: string,
    name: string,
    checkFn: () => boolean | Promise<boolean>,
    message?: string
  ): DialogCondition => ({
    id,
    name,
    check: checkFn,
    fallbackMessage: message,
  }),

  /**
   * Feature flag check
   */
  featureEnabled: (feature: string): DialogCondition => ({
    id: `feature-${feature}`,
    name: `Feature: ${feature}`,
    check: () => {
      // In a real app, this would check against feature flags service
      return (
        process.env[`NEXT_PUBLIC_FEATURE_${feature.toUpperCase()}`] === "true"
      );
    },
    fallbackMessage: `The ${feature} feature is not available`,
  }),
};

/**
 * Hook for creating conditional dialog access
 */
export function useConditionalDialog<
  T extends Record<string, unknown> & {
    open?: (...args: unknown[]) => unknown;
  },
>(baseDialogHook: () => T, config: ConditionalDialogConfig) {
  const baseDialog = baseDialogHook();
  const toast = useToastManager();
  const [isChecking, setIsChecking] = useState(false);

  // Check all conditions
  const checkConditions = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);

    try {
      const results = await Promise.all(
        config.conditions.map(async (condition) => {
          try {
            const result = await condition.check();
            return { condition, passed: result };
          } catch {
            // Silently handle condition check failures
            return { condition, passed: false };
          }
        })
      );

      const failedConditions = results
        .filter((result) => !result.passed)
        .map((result) => result.condition);

      let accessGranted = false;

      if (config.requireAll !== false) {
        // AND logic (default) - all conditions must pass
        accessGranted = failedConditions.length === 0;
      } else {
        // OR logic - at least one condition must pass
        accessGranted = results.some((result) => result.passed);
      }

      if (!accessGranted) {
        // Handle failure
        if (config.onFailure) {
          config.onFailure(failedConditions);
        } else {
          // Default failure handling
          const message =
            failedConditions[0]?.fallbackMessage || "Access denied";
          toast.error("Access Denied", message);

          // Execute fallback action if available
          if (failedConditions[0]?.fallbackAction) {
            failedConditions[0].fallbackAction();
          }
        }
      }

      return accessGranted;
    } finally {
      setIsChecking(false);
    }
  }, [config, toast]);

  // Wrap the original open function with condition checking
  const conditionalOpen = useCallback(
    async (...args: unknown[]) => {
      const hasAccess = await checkConditions();
      if (hasAccess && baseDialog.open) {
        return baseDialog.open(...args);
      }
    },
    [checkConditions, baseDialog]
  );

  return {
    ...baseDialog,
    open: conditionalOpen,
    isChecking,
    checkAccess: checkConditions,
    isEnabled: !isChecking, // Dialog is enabled when not checking
  };
}

/**
 * Convenience hooks for common authentication scenarios
 */

/**
 * Authentication-gated dialog hook
 */
export function useAuthenticatedDialog<T extends Record<string, unknown>>(
  baseDialogHook: () => T,
  customMessage?: string
) {
  const isSignedIn = true;

  return useConditionalDialog(baseDialogHook, {
    conditions: [
      {
        ...DialogConditions.isAuthenticated(isSignedIn || false),
        fallbackMessage:
          customMessage || "Please sign in to access this feature",
      },
    ],
    requireAll: true,
  });
}

/**
 * Role-based dialog hook (legacy - for backward compatibility)
 */
export function useRoleBasedDialog<T extends Record<string, unknown>>(
  baseDialogHook: () => T,
  requiredRole: string,
  customMessage?: string
) {
  const isSignedIn = true;
  const user = {
    id: "local-user",
    firstName: "Local",
    lastName: "User",
    username: "local-user",
    fullName: "Local User",
    emailAddresses: [{ emailAddress: "local@localhost" }],
    publicMetadata: { tier: "pro" },
    privateMetadata: { stats: {} },
  };
  const userRole = user?.publicMetadata?.role as string;

  return useConditionalDialog(baseDialogHook, {
    conditions: [
      DialogConditions.isAuthenticated(isSignedIn || false),
      {
        ...DialogConditions.hasRole(requiredRole, userRole),
        fallbackMessage:
          customMessage || `This feature requires ${requiredRole} access`,
      },
    ],
    requireAll: true,
  });
}

/**
 * Enhanced role-based dialog hook using new role system
 */
export function useRoleRequiredDialog<T extends Record<string, unknown>>(
  baseDialogHook: () => T,
  requiredRole: UserRole,
  customMessage?: string
) {
  const isSignedIn = true;
  const user = {
    id: "local-user",
    firstName: "Local",
    lastName: "User",
    username: "local-user",
    fullName: "Local User",
    emailAddresses: [{ emailAddress: "local@localhost" }],
    publicMetadata: { tier: "pro" },
    privateMetadata: { stats: {} },
  };
  const userRole = user ? getUserRoleClient(user) : undefined;

  return useConditionalDialog(baseDialogHook, {
    conditions: [
      DialogConditions.isAuthenticated(isSignedIn || false),
      {
        ...DialogConditions.hasMinimumRole(requiredRole, userRole),
        fallbackMessage:
          customMessage ||
          `This feature requires ${(requiredRole as string) === "super_admin" ? "Super Admin" : ROLE_METADATA[requiredRole as keyof typeof ROLE_METADATA].label} access`,
      },
    ],
    requireAll: true,
  });
}

/**
 * Admin-only dialog hook
 */
export function useAdminDialog<T extends Record<string, unknown>>(
  baseDialogHook: () => T,
  customMessage?: string
) {
  return useRoleRequiredDialog(baseDialogHook, USER_ROLES.ADMIN, customMessage);
}

/**
 * Member-level dialog hook (member or admin can access)
 */
export function useMemberDialog<T extends Record<string, unknown>>(
  baseDialogHook: () => T,
  customMessage?: string
) {
  return useRoleRequiredDialog(
    baseDialogHook,
    USER_ROLES.MEMBER,
    customMessage
  );
}

/**
 * Viewer-level dialog hook (any authenticated user can access)
 */
export function useViewerDialog<T extends Record<string, unknown>>(
  baseDialogHook: () => T,
  customMessage?: string
) {
  return useRoleRequiredDialog(
    baseDialogHook,
    USER_ROLES.VIEWER,
    customMessage
  );
}

/**
 * Feature flag gated dialog hook
 */
export function useFeatureGatedDialog<T extends Record<string, unknown>>(
  baseDialogHook: () => T,
  featureName: string,
  customMessage?: string
) {
  return useConditionalDialog(baseDialogHook, {
    conditions: [
      {
        ...DialogConditions.featureEnabled(featureName),
        fallbackMessage:
          customMessage || `The ${featureName} feature is not available`,
      },
    ],
    requireAll: true,
  });
}
