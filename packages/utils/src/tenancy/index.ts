/**
 * Multi-Tenancy Utilities - Public Exports
 */

export {
  // Types
  type TenantContext,
  type TenantQuotas,
  type CreateTenantParams,
  // Hash & Slug Functions
  generateTenantHash,
  generateNeo4jNamespace,
  validateTenantSlug,
  suggestTenantSlug,
  // Tenant CRUD
  createTenant,
  getTenantByHash,
  getTenantBySlug,
  getTenantByOrgId,
  updateTenantSlug,
  // Quota Management
  getOrgQuotas,
  checkQuotaAvailable,
  incrementQuotaUsage,
  updateQuotaLimits,
  applyPlanQuotas,
  PLAN_QUOTAS,
} from "./tenant-utils";

export {
  extractTenantIdentifiers,
  type TenantIdentifiers,
} from "./tenant-resolver";

export {
  resolveTenantFromHeaders,
  requireTenant,
  getNamespaceFromHeaders,
} from "./tenant-helpers";

export {
  getTenantContext,
  requireTenantContext,
  withNamespace,
  addOrgIdToProperties,
} from "./neo4j-helpers";
