/**
 * Feature Gating for Collaboration
 *
 * Validates plan access to voice/video features.
 */

import type { CollaborationFeature, OrganizationPlan } from "../types";
import {
  COLLABORATION_FEATURE_GATES,
  FeatureNotAvailableError,
} from "../types";

/**
 * Check if a plan has access to a feature
 */
export function hasFeatureAccess(
  plan: OrganizationPlan,
  feature: CollaborationFeature
): boolean {
  const allowedPlans = COLLABORATION_FEATURE_GATES[feature];
  return (allowedPlans as readonly string[]).includes(plan);
}

/**
 * Assert feature access or throw error
 */
export function assertFeatureAccess(
  plan: OrganizationPlan,
  feature: CollaborationFeature
): void {
  if (!hasFeatureAccess(plan, feature)) {
    throw new FeatureNotAvailableError(feature, plan);
  }
}

/**
 * Get max participants for a plan
 */
export function getMaxParticipants(plan: OrganizationPlan): number {
  const limits = {
    free: 1,
    pro: 5,
    enterprise: 50,
  };
  return limits[plan];
}

/**
 * Check if super admin override is active
 */
export function isSuperAdmin(clerkUserId: string): boolean {
  const superAdmins = (process.env.SUPER_ADMIN_USER_IDS || "").split(",");
  return superAdmins.includes(clerkUserId);
}

/**
 * Validate collaboration access (with super admin override)
 */
export function validateCollaborationAccess(
  plan: OrganizationPlan,
  feature: CollaborationFeature,
  clerkUserId: string
): { allowed: boolean; reason?: string } {
  // Super admin override
  if (isSuperAdmin(clerkUserId)) {
    return { allowed: true };
  }

  // Plan-based gating
  if (!hasFeatureAccess(plan, feature)) {
    return {
      allowed: false,
      reason: `Feature '${feature}' requires enterprise plan (current: ${plan})`,
    };
  }

  return { allowed: true };
}
