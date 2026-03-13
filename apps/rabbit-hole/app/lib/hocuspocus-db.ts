/**
 * Hocuspocus Database Utilities
 *
 * Delegates to global PostgreSQL pool from @proto/database
 */

import { Pool } from "pg";

import { getGlobalPostgresPool } from "@proto/database";

/**
 * @deprecated Use getGlobalPostgresPool() from @proto/database directly
 * This function is kept for backward compatibility
 */
export function getHocuspocusPostgresPool(): Pool {
  return getGlobalPostgresPool();
}
