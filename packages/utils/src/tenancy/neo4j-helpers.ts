/**
 * Neo4j Tenant Scoping Helpers
 *
 * Utilities to add organization namespace scoping to Neo4j queries
 */

import { NextRequest } from "next/server";

/**
 * Extract tenant context from middleware headers
 */
export function getTenantContext(request: NextRequest): {
  orgId: string;
  namespace: string;
} | null {
  const orgId = request.headers.get("x-clerk-org-id");
  const namespace = request.headers.get("x-neo4j-namespace");

  if (!orgId || !namespace) {
    return null;
  }

  return { orgId, namespace };
}

/**
 * Add namespace label to Cypher node pattern
 *
 * @example
 * withNamespace("Person", "org_abc123") → "Person:org_abc123"
 * withNamespace("Entity", namespace) → "Entity:org_abc123"
 */
export function withNamespace(label: string, namespace: string): string {
  return `${label}:${namespace}`;
}

/**
 * Validate tenant context or throw error
 */
export function requireTenantContext(request: NextRequest): {
  orgId: string;
  namespace: string;
} {
  const context = getTenantContext(request);

  if (!context) {
    throw new Error(
      "No tenant context. Request must go through tenant middleware."
    );
  }

  return context;
}

/**
 * Add clerk_org_id to node properties for new nodes
 */
export function addOrgIdToProperties<T extends Record<string, any>>(
  properties: T,
  orgId: string
): T & { clerk_org_id: string } {
  return {
    ...properties,
    clerk_org_id: orgId,
  };
}
