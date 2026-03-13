/**
 * Application Database Connection
 *
 * Delegates to global PostgreSQL pool from @proto/database
 * Separate from SideQuest.js job processing database (sidequest)
 */

import { getGlobalPostgresPool } from "@proto/database";

export async function testAppDatabaseConnection(): Promise<boolean> {
  const pool = getGlobalPostgresPool();
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT NOW() as current_time, current_database() as database_name"
      );
      console.log("✅ Application database connected:", result.rows[0]);
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Application database connection failed:", error);
    return false;
  }
}
