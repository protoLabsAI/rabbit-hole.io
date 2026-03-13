/**
 * Neo4j Sync Layer
 *
 * Handles persistence of graph data to Neo4j database
 * Uses centralized neo4j.int() utilities from @proto/utils
 */

import type Graph from "graphology";

import type { Neo4jClient } from "@proto/database";
import { toNeo4jInt, convertAllNeo4jParams } from "@proto/utils";

import type { GraphNodeAttributes, GraphEdgeAttributes } from "../model/graph";

/**
 * Load a subgraph from Neo4j and populate Graphology
 */
export async function loadSubgraph(
  client: Neo4jClient,
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  options: {
    entityUid?: string;
    hops?: number;
    nodeLimit?: number;
    communityId?: number;
  }
): Promise<void> {
  const { entityUid, hops = 2, nodeLimit = 100, communityId } = options;

  let query: string;
  let params: Record<string, any>;

  if (entityUid) {
    // Ego network query
    query = `
      MATCH path = (center:Entity {uid: $entityUid})-[*1..${hops}]-(neighbor:Entity)
      WITH center, neighbor, path
      ORDER BY length(path)
      LIMIT $nodeLimit
      RETURN DISTINCT center, neighbor, 
             [r in relationships(path) | {
               uid: r.uid,
               type: type(r),
               source: startNode(r).uid,
               target: endNode(r).uid,
               properties: properties(r)
             }] as relationships
    `;
    params = convertAllNeo4jParams({ entityUid, nodeLimit });
  } else if (communityId !== undefined) {
    // Community query
    query = `
      MATCH (n:Entity)
      WHERE n.communityId = $communityId
      WITH n LIMIT $nodeLimit
      MATCH (n)-[r]-(m:Entity)
      WHERE m.communityId = $communityId
      RETURN DISTINCT n, m, r
    `;
    params = convertAllNeo4jParams({ communityId, nodeLimit });
  } else {
    throw new Error("Must provide either entityUid or communityId");
  }

  const result = await client.executeRead(query, params);

  // Process results and populate graph
  // (Implementation depends on Neo4j client result format)
}

/**
 * Create a node in Neo4j
 */
export async function createNode(
  client: Neo4jClient,
  nodeData: {
    uid: string;
    name: string;
    type: string;
    x?: number;
    y?: number;
    properties?: Record<string, any>;
    tags?: string[];
    aliases?: string[];
  }
): Promise<void> {
  const query = `
    CREATE (n:Entity:${nodeData.type} {
      uid: $uid,
      name: $name,
      type: $type,
      x: $x,
      y: $y,
      createdAt: timestamp(),
      updatedAt: timestamp()
    })
    SET n += $properties
    RETURN n
  `;

  const params = convertAllNeo4jParams({
    uid: nodeData.uid,
    name: nodeData.name,
    type: nodeData.type,
    x: nodeData.x || 0,
    y: nodeData.y || 0,
    properties: {
      ...(nodeData.properties || {}),
      tags: nodeData.tags || [],
      aliases: nodeData.aliases || [],
    },
  });

  await client.executeWrite!(query, params);
}

/**
 * Create an edge in Neo4j
 */
export async function createEdge(
  client: Neo4jClient,
  edgeData: {
    uid: string;
    type: string;
    source: string;
    target: string;
    sentiment?: string;
    confidence?: number;
    properties?: Record<string, any>;
  }
): Promise<void> {
  const query = `
    MATCH (source:Entity {uid: $source})
    MATCH (target:Entity {uid: $target})
    CREATE (source)-[r:${edgeData.type} {
      uid: $uid,
      type: $type,
      sentiment: $sentiment,
      confidence: $confidence,
      createdAt: timestamp(),
      updatedAt: timestamp()
    }]->(target)
    SET r += $properties
    RETURN r
  `;

  const params = convertAllNeo4jParams({
    uid: edgeData.uid,
    type: edgeData.type,
    source: edgeData.source,
    target: edgeData.target,
    sentiment: edgeData.sentiment,
    confidence: edgeData.confidence,
    properties: edgeData.properties || {},
  });

  await client.executeWrite!(query, params);
}

/**
 * Update node position in Neo4j
 */
export async function moveNode(
  client: Neo4jClient,
  nodeId: string,
  x: number,
  y: number
): Promise<void> {
  const query = `
    MATCH (n:Entity {uid: $uid})
    SET n.x = $x, n.y = $y, n.updatedAt = timestamp()
    RETURN n
  `;

  const params = convertAllNeo4jParams({ uid: nodeId, x, y });
  await client.executeWrite!(query, params);
}

/**
 * Update node properties in Neo4j
 */
export async function updateNode(
  client: Neo4jClient,
  nodeId: string,
  updates: Partial<{
    name: string;
    x: number;
    y: number;
    properties: Record<string, any>;
    tags: string[];
    aliases: string[];
  }>
): Promise<void> {
  const setClauses: string[] = ["n.updatedAt = timestamp()"];
  const params: Record<string, any> = { uid: nodeId };

  if (updates.name !== undefined) {
    setClauses.push("n.name = $name");
    params.name = updates.name;
  }

  if (updates.x !== undefined) {
    setClauses.push("n.x = $x");
    params.x = updates.x;
  }

  if (updates.y !== undefined) {
    setClauses.push("n.y = $y");
    params.y = updates.y;
  }

  if (updates.properties) {
    setClauses.push("n += $properties");
    params.properties = updates.properties;
  }

  if (updates.tags) {
    setClauses.push("n.tags = $tags");
    params.tags = updates.tags;
  }

  if (updates.aliases) {
    setClauses.push("n.aliases = $aliases");
    params.aliases = updates.aliases;
  }

  const query = `
    MATCH (n:Entity {uid: $uid})
    SET ${setClauses.join(", ")}
    RETURN n
  `;

  const convertedParams = convertAllNeo4jParams(params);
  await client.executeWrite!(query, convertedParams);
}

/**
 * Delete a node from Neo4j
 */
export async function deleteNode(
  client: Neo4jClient,
  nodeId: string
): Promise<void> {
  const query = `
    MATCH (n:Entity {uid: $uid})
    DETACH DELETE n
  `;

  const params = convertAllNeo4jParams({ uid: nodeId });
  await client.executeWrite!(query, params);
}

/**
 * Delete an edge from Neo4j
 */
export async function deleteEdge(
  client: Neo4jClient,
  edgeId: string
): Promise<void> {
  const query = `
    MATCH ()-[r {uid: $uid}]->()
    DELETE r
  `;

  const params = convertAllNeo4jParams({ uid: edgeId });
  await client.executeWrite!(query, params);
}

/**
 * Batch update node positions in Neo4j
 */
export async function batchMoveNodes(
  client: Neo4jClient,
  updates: Array<{ nodeId: string; x: number; y: number }>
): Promise<void> {
  const query = `
    UNWIND $updates as update
    MATCH (n:Entity {uid: update.nodeId})
    SET n.x = update.x, n.y = update.y, n.updatedAt = timestamp()
  `;

  const params = {
    updates: updates.map((u) => ({
      nodeId: u.nodeId,
      x: toNeo4jInt(u.x),
      y: toNeo4jInt(u.y),
    })),
  };

  await client.executeWrite!(query, params);
}
