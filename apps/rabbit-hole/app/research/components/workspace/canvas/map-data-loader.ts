/**
 * Map Data Loader - Neo4j Geographic Entities
 *
 * Utility to fetch entities with geospatial data from Neo4j knowledge graph.
 * Converts Neo4j entities to Graphology graph structure for Sigma.js + Leaflet visualization.
 */

import Graph from "graphology";
import type { Record as Neo4jRecord } from "neo4j-driver";

import { getGlobalNeo4jClient } from "@proto/database";
import type { EntityType } from "@proto/types";
import { getEntityColor } from "@proto/utils/atlas";

export interface GeographicEntity {
  uid: string;
  name: string;
  type: EntityType;
  latitude: number;
  longitude: number;
  altitude?: number;
  address?: string;
  tags?: string[];
  properties?: Record<string, any>;
}

export interface GeographicRelationship {
  uid: string;
  source: string;
  target: string;
  type: string;
  label?: string;
  confidence?: number;
}

/**
 * Fetch entities with geographic coordinates from Neo4j
 * Query entities that have latitude/longitude properties
 */
export async function fetchGeographicEntities(options: {
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  limit?: number;
}): Promise<{
  entities: GeographicEntity[];
  relationships: GeographicRelationship[];
}> {
  const client = getGlobalNeo4jClient();
  const session = client.getSession();

  try {
    const { bounds, limit = 100 } = options;

    // Build Cypher query to fetch entities with geospatial data
    let query = `
      MATCH (e)
      WHERE e.latitude IS NOT NULL AND e.longitude IS NOT NULL
    `;

    // Add bounding box filter if provided
    if (bounds) {
      query += `
        AND e.latitude >= $south AND e.latitude <= $north
        AND e.longitude >= $west AND e.longitude <= $east
      `;
    }

    query += `
      WITH e
      OPTIONAL MATCH (e)-[r]->(related)
      WHERE related.latitude IS NOT NULL AND related.longitude IS NOT NULL
      RETURN 
        e.uid as uid,
        e.name as name,
        e.type as type,
        e.latitude as latitude,
        e.longitude as longitude,
        e.altitude as altitude,
        e.address as address,
        e.tags as tags,
        properties(e) as properties,
        collect(DISTINCT {
          uid: r.uid,
          source: e.uid,
          target: related.uid,
          type: type(r),
          label: r.label,
          confidence: r.confidence
        }) as relationships
      LIMIT $limit
    `;

    const result = await session.run(query, {
      north: bounds?.north,
      south: bounds?.south,
      east: bounds?.east,
      west: bounds?.west,
      limit,
    });

    const entities: GeographicEntity[] = [];
    const relationships: GeographicRelationship[] = [];

    result.records.forEach((record: Neo4jRecord) => {
      const entity: GeographicEntity = {
        uid: record.get("uid"),
        name: record.get("name"),
        type: record.get("type") as EntityType,
        latitude: record.get("latitude"),
        longitude: record.get("longitude"),
        altitude: record.get("altitude") || undefined,
        address: record.get("address") || undefined,
        tags: record.get("tags") || [],
        properties: record.get("properties") || {},
      };

      entities.push(entity);

      const rels = record.get("relationships") || [];
      rels.forEach((rel: any) => {
        if (rel.uid) {
          relationships.push({
            uid: rel.uid,
            source: rel.source,
            target: rel.target,
            type: rel.type,
            label: rel.label,
            confidence: rel.confidence,
          });
        }
      });
    });

    return { entities, relationships };
  } finally {
    await session.close();
  }
}

/**
 * Convert geographic entities to Graphology graph
 * Ready for Sigma.js + Leaflet rendering
 */
export function entitiesToGraph(
  entities: GeographicEntity[],
  relationships: GeographicRelationship[]
): Graph {
  const graph = new Graph();

  // Add nodes with geographic attributes
  entities.forEach((entity) => {
    graph.addNode(entity.uid, {
      x: 0, // Will be set by Leaflet layer
      y: 0,
      lat: entity.latitude,
      lng: entity.longitude,
      size: 20,
      color: getEntityColor(entity.type),
      label: entity.name,
      entityType: entity.type, // Use entityType to avoid Sigma.js conflicts
      altitude: entity.altitude,
      address: entity.address,
      tags: entity.tags,
      properties: entity.properties,
    });
  });

  // Add edges
  relationships.forEach((rel) => {
    if (graph.hasNode(rel.source) && graph.hasNode(rel.target)) {
      try {
        graph.addEdge(rel.source, rel.target, {
          label: rel.label || rel.type,
          type: rel.type,
          confidence: rel.confidence,
        });
      } catch (error) {
        // Edge might already exist, skip
        console.warn(`Skipping duplicate edge: ${rel.uid}`);
      }
    }
  });

  return graph;
}

/**
 * Load geographic entities into existing graph
 * Useful for updating the graph without recreating it
 */
export async function loadGeographicGraph(options: {
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  limit?: number;
}): Promise<Graph> {
  const { entities, relationships } = await fetchGeographicEntities(options);
  return entitiesToGraph(entities, relationships);
}
