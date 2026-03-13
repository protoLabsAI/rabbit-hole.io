/**
 * Tenant Helper Functions (Node.js Runtime)
 *
 * For API routes to validate and resolve tenant context.
 * Uses database lookups - cannot be used in Edge runtime.
 */

import { NextRequest } from "next/server";

import {
  getTenantByHash,
  getTenantBySlug,
  getTenantByOrgId,
  type TenantContext,
} from "./tenant-utils";

/**
 * Get tenant context from middleware headers and validate with database
 * Use in API routes (Node.js runtime)
 */
export async function resolveTenantFromHeaders(
  request: NextRequest
): Promise<TenantContext | null> {
  const orgId = request.headers.get("x-clerk-org-id");
  const hash = request.headers.get("x-tenant-hash");
  const slug = request.headers.get("x-tenant-slug");

  // Try hash first (most specific)
  if (hash) {
    const tenant = await getTenantByHash(hash);
    if (tenant && (!orgId || tenant.clerkOrgId === orgId)) {
      return tenant;
    }
  }

  // Try slug
  if (slug) {
    const tenant = await getTenantBySlug(slug);
    if (tenant && (!orgId || tenant.clerkOrgId === orgId)) {
      return tenant;
    }
  }

  // Fallback to org ID
  if (orgId) {
    return await getTenantByOrgId(orgId);
  }

  return null;
}

/**
 * Require tenant context or throw error
 */
export async function requireTenant(
  request: NextRequest
): Promise<TenantContext> {
  const tenant = await resolveTenantFromHeaders(request);

  if (!tenant) {
    throw new Error(
      "No tenant context found. User must be authenticated and have an organization."
    );
  }

  return tenant;
}

/**
 * Get Neo4j namespace from request headers
 */
export function getNamespaceFromHeaders(request: NextRequest): string | null {
  const hash = request.headers.get("x-tenant-hash");
  if (hash) {
    return `org_${hash}`;
  }
  return null;
}
