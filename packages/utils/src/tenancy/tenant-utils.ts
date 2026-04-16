/**
 * Multi-Tenancy Utilities
 *
 * Utilities for tenant hash generation, slug validation, and resolution
 * Supports both subdomain and path-based tenant identification
 */

import crypto from "crypto";

import type { Pool } from "pg";

// ====================
// Types & Interfaces
// ====================

export interface TenantContext {
  clerkOrgId: string;
  tenantHash: string;
  tenantSlug: string | null;
  neo4jNamespace: string;
  orgName: string | null;
  createdAt: Date;
}

export interface TenantQuotas {
  entitiesCount: number;
  shareTokensCount: number;
  storageUsedBytes: bigint;
  apiCallsThisHour: number;
  maxEntities: number;
  maxShareTokens: number;
  maxStorageBytes: bigint;
  maxApiCallsPerHour: number;
}

export interface CreateTenantParams {
  clerkOrgId: string;
  orgName?: string;
  orgSlug?: string;
  customSlug?: string; // For Pro+ users choosing their subdomain
}

// ====================
// Hash Generation
// ====================

/**
 * Generate deterministic 12-character hash from Clerk org ID
 * Uses SHA-256 for consistency and collision resistance
 */
export function generateTenantHash(clerkOrgId: string): string {
  const hash = crypto.createHash("sha256").update(clerkOrgId).digest("hex");
  return hash.substring(0, 12); // First 12 chars of SHA-256
}

/**
 * Generate Neo4j namespace identifier
 * Format: org_{hash} for use as Neo4j label
 */
export function generateNeo4jNamespace(tenantHash: string): string {
  return `org_${tenantHash}`;
}

// ====================
// Slug Validation
// ====================

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const RESERVED_SLUGS = [
  "www",
  "api",
  "admin",
  "app",
  "mail",
  "ftp",
  "blog",
  "dev",
  "staging",
  "prod",
  "production",
  "localhost",
  "test",
  "demo",
  "docs",
  "support",
  "help",
  "status",
  "cdn",
  "assets",
  "static",
  "v1",
  "v2",
  "v3",
];

/**
 * Validate tenant slug format and availability
 */
export function validateTenantSlug(slug: string): {
  valid: boolean;
  error?: string;
} {
  // Length check
  if (slug.length < 3 || slug.length > 63) {
    return { valid: false, error: "Slug must be 3-63 characters" };
  }

  // Format check
  if (!SLUG_PATTERN.test(slug)) {
    return {
      valid: false,
      error:
        "Slug must start and end with alphanumeric, contain only lowercase letters, numbers, and hyphens",
    };
  }

  // Reserved words
  if (RESERVED_SLUGS.includes(slug.toLowerCase())) {
    return { valid: false, error: "This slug is reserved" };
  }

  // No consecutive hyphens
  if (slug.includes("--")) {
    return { valid: false, error: "Consecutive hyphens not allowed" };
  }

  return { valid: true };
}

/**
 * Suggest available slug based on organization name
 */
export function suggestTenantSlug(orgName: string): string {
  return orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphen
    .replace(/^-+|-+$/g, "") // Trim hyphens
    .substring(0, 63); // Max length
}

// ====================
// Database Operations
// ====================

/**
 * Get PostgreSQL connection pool for app database
 * @deprecated This function creates a new pool - use getGlobalPostgresPool() from @protolabsai/database instead
 */
async function getAppDbPool(): Promise<Pool> {
  // Dynamic import to avoid circular dependency
  const { getGlobalPostgresPool } = await import("@protolabsai/database");
  return getGlobalPostgresPool();
}

/**
 * Create new tenant for organization
 */
export async function createTenant(
  params: CreateTenantParams
): Promise<TenantContext> {
  const { clerkOrgId, orgName, orgSlug, customSlug } = params;

  const tenantHash = generateTenantHash(clerkOrgId);
  const neo4jNamespace = generateNeo4jNamespace(tenantHash);

  // Validate custom slug if provided
  let tenantSlug: string | null = null;
  if (customSlug) {
    const validation = validateTenantSlug(customSlug);
    if (!validation.valid) {
      throw new Error(`Invalid tenant slug: ${validation.error}`);
    }
    tenantSlug = customSlug;
  }

  const pool = await getAppDbPool();
  // Insert tenant
  const tenantResult = await pool.query(
    `
      INSERT INTO organization_tenants (
        clerk_org_id, 
        tenant_hash, 
        tenant_slug,
        neo4j_namespace,
        org_name,
        org_slug
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (clerk_org_id) DO UPDATE
      SET 
        org_name = EXCLUDED.org_name,
        org_slug = EXCLUDED.org_slug,
        updated_at = NOW()
      RETURNING *
    `,
    [clerkOrgId, tenantHash, tenantSlug, neo4jNamespace, orgName, orgSlug]
  );

  // Initialize quotas with default free tier limits
  await pool.query(
    `
      INSERT INTO organization_quotas (clerk_org_id)
      VALUES ($1)
      ON CONFLICT (clerk_org_id) DO NOTHING
    `,
    [clerkOrgId]
  );

  const row = tenantResult.rows[0];
  return {
    clerkOrgId: row.clerk_org_id,
    tenantHash: row.tenant_hash,
    tenantSlug: row.tenant_slug,
    neo4jNamespace: row.neo4j_namespace,
    orgName: row.org_name,
    createdAt: row.created_at,
  };
}

/**
 * Get tenant by hash
 */
export async function getTenantByHash(
  hash: string
): Promise<TenantContext | null> {
  const pool = await getAppDbPool();
  const result = await pool.query(
    `
      SELECT * FROM organization_tenants
      WHERE tenant_hash = $1
    `,
    [hash]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    clerkOrgId: row.clerk_org_id,
    tenantHash: row.tenant_hash,
    tenantSlug: row.tenant_slug,
    neo4jNamespace: row.neo4j_namespace,
    orgName: row.org_name,
    createdAt: row.created_at,
  };
}

/**
 * Get tenant by slug (for subdomain routing)
 */
export async function getTenantBySlug(
  slug: string
): Promise<TenantContext | null> {
  const pool = await getAppDbPool();
  const result = await pool.query(
    `
      SELECT * FROM organization_tenants
      WHERE tenant_slug = $1
    `,
    [slug]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    clerkOrgId: row.clerk_org_id,
    tenantHash: row.tenant_hash,
    tenantSlug: row.tenant_slug,
    neo4jNamespace: row.neo4j_namespace,
    orgName: row.org_name,
    createdAt: row.created_at,
  };
}

/**
 * Get tenant by Clerk organization ID
 */
export async function getTenantByOrgId(
  clerkOrgId: string
): Promise<TenantContext | null> {
  const pool = await getAppDbPool();
  const result = await pool.query(
    `
      SELECT * FROM organization_tenants
      WHERE clerk_org_id = $1
    `,
    [clerkOrgId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    clerkOrgId: row.clerk_org_id,
    tenantHash: row.tenant_hash,
    tenantSlug: row.tenant_slug,
    neo4jNamespace: row.neo4j_namespace,
    orgName: row.org_name,
    createdAt: row.created_at,
  };
}

/**
 * Update tenant slug (Pro+ feature)
 */
export async function updateTenantSlug(
  clerkOrgId: string,
  newSlug: string
): Promise<TenantContext> {
  // Validate slug
  const validation = validateTenantSlug(newSlug);
  if (!validation.valid) {
    throw new Error(`Invalid slug: ${validation.error}`);
  }

  const pool = await getAppDbPool();
  const result = await pool.query(
    `
      UPDATE organization_tenants
      SET tenant_slug = $1, updated_at = NOW()
      WHERE clerk_org_id = $2
      RETURNING *
    `,
    [newSlug, clerkOrgId]
  );

  if (result.rows.length === 0) {
    throw new Error("Tenant not found");
  }

  const row = result.rows[0];
  return {
    clerkOrgId: row.clerk_org_id,
    tenantHash: row.tenant_hash,
    tenantSlug: row.tenant_slug,
    neo4jNamespace: row.neo4j_namespace,
    orgName: row.org_name,
    createdAt: row.created_at,
  };
}

// ====================
// Quota Management
// ====================

/**
 * Get organization quotas and current usage
 */
export async function getOrgQuotas(
  clerkOrgId: string
): Promise<TenantQuotas | null> {
  const pool = await getAppDbPool();
  const result = await pool.query(
    `
      SELECT * FROM organization_quotas
      WHERE clerk_org_id = $1
    `,
    [clerkOrgId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    entitiesCount: row.entities_count,
    shareTokensCount: row.share_tokens_count,
    storageUsedBytes: BigInt(row.storage_used_bytes),
    apiCallsThisHour: row.api_calls_this_hour,
    maxEntities: row.max_entities,
    maxShareTokens: row.max_share_tokens,
    maxStorageBytes: BigInt(row.max_storage_bytes),
    maxApiCallsPerHour: row.max_api_calls_per_hour,
  };
}

/**
 * Check if organization has quota available
 */
export async function checkQuotaAvailable(
  clerkOrgId: string,
  quotaType: "entities" | "share_tokens" | "api_calls",
  amount: number = 1
): Promise<boolean> {
  const pool = await getAppDbPool();
  const result = await pool.query(
    `SELECT check_quota_available($1, $2, $3) as available`,
    [clerkOrgId, quotaType, amount]
  );
  return result.rows[0].available;
}

/**
 * Increment quota usage
 */
export async function incrementQuotaUsage(
  clerkOrgId: string,
  updates: {
    entitiesDelta?: number;
    shareTokensDelta?: number;
    storageDelta?: bigint;
  }
): Promise<void> {
  const pool = await getAppDbPool();
  await pool.query(`SELECT increment_quota_usage($1, $2, $3, $4)`, [
    clerkOrgId,
    updates.entitiesDelta || 0,
    updates.shareTokensDelta || 0,
    updates.storageDelta?.toString() || "0",
  ]);
}

/**
 * Update quota limits (when plan changes)
 */
export async function updateQuotaLimits(
  clerkOrgId: string,
  limits: {
    maxEntities?: number;
    maxShareTokens?: number;
    maxStorageBytes?: bigint;
    maxApiCallsPerHour?: number;
  }
): Promise<void> {
  const pool = await getAppDbPool();

  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (limits.maxEntities !== undefined) {
    updates.push(`max_entities = $${paramIndex++}`);
    values.push(limits.maxEntities);
  }
  if (limits.maxShareTokens !== undefined) {
    updates.push(`max_share_tokens = $${paramIndex++}`);
    values.push(limits.maxShareTokens);
  }
  if (limits.maxStorageBytes !== undefined) {
    updates.push(`max_storage_bytes = $${paramIndex++}`);
    values.push(limits.maxStorageBytes.toString());
  }
  if (limits.maxApiCallsPerHour !== undefined) {
    updates.push(`max_api_calls_per_hour = $${paramIndex++}`);
    values.push(limits.maxApiCallsPerHour);
  }

  if (updates.length === 0) {
    return;
  }

  updates.push(`updated_at = NOW()`);
  values.push(clerkOrgId);

  await pool.query(
    `
      UPDATE organization_quotas
      SET ${updates.join(", ")}
      WHERE clerk_org_id = $${paramIndex}
    `,
    values
  );
}

// ====================
// Plan-Based Quota Presets
// ====================

export const PLAN_QUOTAS = {
  free: {
    maxEntities: 1000,
    maxShareTokens: 10,
    maxStorageBytes: BigInt(1024 ** 3), // 1 GB
    maxApiCallsPerHour: 100,
  },
  pro: {
    maxEntities: 50000,
    maxShareTokens: 100,
    maxStorageBytes: BigInt(50 * 1024 ** 3), // 50 GB
    maxApiCallsPerHour: 1000,
  },
  enterprise: {
    maxEntities: 1000000,
    maxShareTokens: 1000,
    maxStorageBytes: BigInt(500 * 1024 ** 3), // 500 GB
    maxApiCallsPerHour: 10000,
  },
} as const;

/**
 * Apply plan-based quota limits
 */
export async function applyPlanQuotas(
  clerkOrgId: string,
  plan: "free" | "pro" | "enterprise"
): Promise<void> {
  const quotas = PLAN_QUOTAS[plan];
  await updateQuotaLimits(clerkOrgId, quotas);
}
