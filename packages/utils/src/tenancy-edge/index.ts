/**
 * Edge-Compatible Tenant Utilities
 *
 * NO database imports - safe for Edge runtime (middleware)
 */

export {
  extractTenantIdentifiers,
  type TenantIdentifiers,
} from "../tenancy/tenant-resolver";
