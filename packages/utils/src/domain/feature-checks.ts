/**
 * Domain Feature Check Utilities
 *
 * Helper functions to check domain feature flags.
 */

import { domainRegistry } from "@protolabsai/types";
import type { DomainFeatureConfig } from "@protolabsai/types";

// Re-export default config from types
const DEFAULT_FEATURE_CONFIG: DomainFeatureConfig = {
  allowCreate: true,
  allowEdit: true,
  allowDelete: true,
  allowMerge: true,
  requireApproval: false,
  showInSearch: true,
  showInAnalytics: true,
  showInGraph: true,
  showInTimeline: true,
  showInEvidence: true,
  showInSelector: true,
  allowRelationshipCreation: true,
  enableAIExtraction: true,
  enableBulkImport: true,
  enableExport: true,
  requireAuth: false,
};

/**
 * Check if feature is enabled for domain
 */
export function isDomainFeatureEnabled(
  domain: string,
  feature: keyof DomainFeatureConfig
): boolean {
  const config = domainRegistry.getDomainConfig(domain);
  const featureConfig = config?.features || DEFAULT_FEATURE_CONFIG;

  const value = featureConfig[feature] ?? DEFAULT_FEATURE_CONFIG[feature];
  return typeof value === "boolean" ? value : false;
}

/**
 * Check if entity creation is allowed for domain
 */
export function canCreateEntity(domain: string): boolean {
  return isDomainFeatureEnabled(domain, "allowCreate");
}

/**
 * Check if entity editing is allowed
 */
export function canEditEntity(domain: string): boolean {
  return isDomainFeatureEnabled(domain, "allowEdit");
}

/**
 * Check if entity deletion is allowed
 */
export function canDeleteEntity(domain: string): boolean {
  return isDomainFeatureEnabled(domain, "allowDelete");
}

/**
 * Check if domain should appear in selector
 */
export function shouldShowInSelector(domain: string): boolean {
  return isDomainFeatureEnabled(domain, "showInSelector");
}

/**
 * Check if user role is allowed to access domain
 */
export function canUserAccessDomain(domain: string, userRole: string): boolean {
  const config = domainRegistry.getDomainConfig(domain);
  const allowedRoles = config?.features?.allowedRoles;

  // If no role restrictions, allow all
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  return allowedRoles.includes(userRole);
}

/**
 * Get all domains user can access based on role
 */
export function getAccessibleDomains(userRole: string): string[] {
  return domainRegistry
    .getAllDomains()
    .filter((d) => canUserAccessDomain(d.name, userRole))
    .map((d) => d.name);
}
