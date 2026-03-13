/**
 * Usage Tracking Utilities
 *
 * Track user resource usage for tier limit enforcement.
 * Uses Neo4j for entity counting and stubs for future features.
 */

import { getGlobalNeo4jClient } from "./neo4j-client";
import { convertParametersToNeo4j } from "./neo4j-conversion";

interface Neo4jClient {
  executeRead: (
    query: string,
    parameters?: Record<string, any>
  ) => Promise<any>;
  executeWrite?: (
    query: string,
    parameters?: Record<string, any>
  ) => Promise<any>;
}

/**
 * Create a Neo4j client wrapper that automatically converts integer parameters
 */
function createNeo4jClientWithIntegerConversion(
  client: Neo4jClient
): Neo4jClient {
  return {
    executeRead: async (query: string, parameters?: Record<string, any>) => {
      const convertedParams = convertParametersToNeo4j(parameters || {});
      return await client.executeRead(query, convertedParams);
    },
    executeWrite: client.executeWrite
      ? async (query: string, parameters?: Record<string, any>) => {
          const convertedParams = convertParametersToNeo4j(parameters || {});
          return await client.executeWrite!(query, convertedParams);
        }
      : undefined,
  };
}

/**
 * Get entity count for a user's current organization
 *
 * Excludes File, Content, and Evidence nodes from the count as these are
 * supporting entities that don't count against tier limits.
 *
 * @param clerkOrgId - Organization ID from Clerk (tenant scope)
 * @returns Total number of entities in the organization
 */
export async function getEntityCount(clerkOrgId: string): Promise<number> {
  const baseClient = getGlobalNeo4jClient();
  const client = createNeo4jClientWithIntegerConversion(baseClient);

  try {
    const result = await client.executeRead(
      `
      MATCH (e)
      WHERE e.clerk_org_id = $clerkOrgId
        AND NOT e:Content
        AND NOT e:Evidence
        AND NOT e:File
      RETURN count(e) as count
      `,
      { clerkOrgId }
    );

    if (result.records.length === 0) {
      return 0;
    }

    const count = result.records[0].get("count");
    return typeof count === "number" ? count : Number(count) || 0;
  } catch (error) {
    console.error("Failed to get entity count:", error);
    throw new Error("Unable to retrieve entity count");
  }
}

/**
 * Get relationship count for organization
 *
 * @param clerkOrgId - Organization ID from Clerk (tenant scope)
 * @returns Total number of relationships in the organization
 */
export async function getRelationshipCount(
  clerkOrgId: string
): Promise<number> {
  const baseClient = getGlobalNeo4jClient();
  const client = createNeo4jClientWithIntegerConversion(baseClient);

  try {
    const result = await client.executeRead(
      `
      MATCH ()-[r]->()
      WHERE r.clerk_org_id = $clerkOrgId
      RETURN count(r) as count
      `,
      { clerkOrgId }
    );

    if (result.records.length === 0) {
      return 0;
    }

    const count = result.records[0].get("count");
    return typeof count === "number" ? count : Number(count) || 0;
  } catch (error) {
    console.error("Failed to get relationship count:", error);
    throw new Error("Unable to retrieve relationship count");
  }
}

/**
 * Get workspace count for a user
 *
 * STUB: Workspaces are stored in Yjs/IndexedDB with no central registry.
 * Returns 1 for MVP. Will implement proper counting in Phase 2.
 *
 * @param userId - Clerk user ID
 * @returns Workspace count (stubbed to 1)
 */
export async function getWorkspaceCount(userId: string): Promise<number> {
  // TODO: Implement when workspace registry is available
  return 1;
}

/**
 * Get storage usage for a user's organization
 *
 * STUB: File storage tracking not yet implemented.
 * Returns 0 for MVP.
 *
 * @param clerkOrgId - Organization ID
 * @returns Storage used in bytes (stubbed to 0)
 */
export async function getStorageUsed(clerkOrgId: string): Promise<number> {
  // TODO: Implement file storage tracking
  return 0;
}

/**
 * Get active room count for a user
 *
 * STUB: Collaboration rooms not yet implemented.
 * Returns 0 for MVP.
 *
 * @param userId - Clerk user ID
 * @returns Active room count (stubbed to 0)
 */
export async function getRoomCount(userId: string): Promise<number> {
  // TODO: Implement when room management is available
  return 0;
}
