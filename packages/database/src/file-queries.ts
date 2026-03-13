/**
 * File Entity Query Utilities
 *
 * Neo4j queries for file entity operations and ownership verification
 */

import { getGlobalNeo4jClient } from "./neo4j-client";
import { convertParametersToNeo4j } from "./neo4j-conversion";

export interface FileEntityWithOwnership {
  uid: string;
  name: string;
  canonicalKey: string;
  uploadedBy: string;
  workspaceId: string;
  orgId: string;
  accessLevel: "private" | "workspace" | "org" | "public";
}

/**
 * Fetch file entity by canonicalKey
 */
export async function fetchFileByCanonicalKey(
  canonicalKey: string
): Promise<FileEntityWithOwnership | null> {
  const client = getGlobalNeo4jClient();

  const query = `
    MATCH (f:File {canonicalKey: $canonicalKey})
    RETURN f {
      .uid,
      .name,
      .canonicalKey,
      .uploadedBy,
      .workspaceId,
      .orgId,
      .accessLevel
    } as file
  `;

  const params = convertParametersToNeo4j({ canonicalKey });
  const result = await client.executeRead(query, params);

  if (result.records.length === 0) {
    return null;
  }

  return result.records[0].get("file");
}

/**
 * Fetch file entity by UID
 */
export async function fetchFileByUid(
  uid: string
): Promise<FileEntityWithOwnership | null> {
  const client = getGlobalNeo4jClient();

  const query = `
    MATCH (f:File {uid: $uid})
    RETURN f {
      .uid,
      .name,
      .canonicalKey,
      .uploadedBy,
      .workspaceId,
      .orgId,
      .accessLevel
    } as file
  `;

  const params = convertParametersToNeo4j({ uid });
  const result = await client.executeRead(query, params);

  if (result.records.length === 0) {
    return null;
  }

  return result.records[0].get("file");
}
