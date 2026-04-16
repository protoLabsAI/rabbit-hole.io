/**
 * Hocuspocus Database Utilities
 *
 * Delegates to global PostgreSQL pool from @protolabsai/database
 */

import { Pool } from "pg";

import { getGlobalPostgresPool } from "@protolabsai/database";

/**
 * @deprecated Use getGlobalPostgresPool() from @protolabsai/database directly
 * This function is kept for backward compatibility
 */
export function getHocuspocusPostgresPool(): Pool {
  return getGlobalPostgresPool();
}
