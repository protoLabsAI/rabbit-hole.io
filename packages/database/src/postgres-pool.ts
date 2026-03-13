/**
 * Global PostgreSQL Connection Pool
 *
 * Singleton pool instance shared across all API routes to prevent
 * connection exhaustion and improve resource efficiency.
 */

import { Pool } from "pg";

let globalPool: Pool | null = null;

export function getGlobalPostgresPool(): Pool {
  if (!globalPool) {
    globalPool = new Pool({
      connectionString:
        process.env.APP_DATABASE_URL ||
        "postgresql://app_user:rabbit2024@localhost:5432/rabbit_hole_app",
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    globalPool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
    });
  }

  return globalPool;
}

/**
 * Cleanup global pool (for graceful shutdown or testing)
 */
export async function closeGlobalPostgresPool(): Promise<void> {
  if (globalPool) {
    await globalPool.end();
    globalPool = null;
  }
}
