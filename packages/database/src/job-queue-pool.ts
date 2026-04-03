/**
 * Job Queue PostgreSQL Connection Pool
 *
 * Dedicated pool for Sidequest.js job queue operations.
 * Separate from app database to enable multi-app, scalable architecture.
 */

import { Pool } from "pg";

let jobQueuePool: Pool | null = null;

/**
 * Get global job queue database pool
 *
 * Connects to the dedicated job processor PostgreSQL database,
 * which is isolated from the main application database.
 */
export function getJobQueuePool(): Pool {
  if (!jobQueuePool) {
    // eslint-disable-next-line no-restricted-syntax -- Legitimate separate pool for isolated job queue database
    jobQueuePool = new Pool({
      connectionString:
        process.env.JOB_QUEUE_DATABASE_URL ||
        process.env.DATABASE_URL || // Fallback to main DB in dev
        process.env.JOB_QUEUE_DATABASE_URL ||
        "",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    jobQueuePool.on("error", (err) => {
      console.error("Unexpected error on idle job queue client:", err);
    });
  }

  return jobQueuePool;
}

/**
 * Cleanup job queue pool (for graceful shutdown or testing)
 */
export async function closeJobQueuePool(): Promise<void> {
  if (jobQueuePool) {
    await jobQueuePool.end();
    jobQueuePool = null;
  }
}
