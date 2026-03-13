/**
 * Organization ID Utilities
 *
 * Organizations are required for all collaboration features.
 * No fallbacks - users must be in an organization.
 */

/**
 * Get organization ID (strict mode - no fallbacks)
 * Returns the orgId as-is or null if not provided
 *
 * @throws Error if in development and no org provided (helps catch issues early)
 */
export function getOrgIdWithDevFallback(
  orgId: string | null | undefined
): string | null {
  if (!orgId) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "❌ No organization context. User must be in an organization."
      );
      console.error(
        "Add user to organization in Clerk dashboard or select organization in UI."
      );
    }
    return null;
  }
  return orgId;
}
