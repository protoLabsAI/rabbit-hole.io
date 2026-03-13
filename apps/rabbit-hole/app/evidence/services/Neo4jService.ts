/**
 * Neo4j Graph Database Service
 *
 * High-performance graph database integration for evidence graphs at scale.
 * Handles 100k+ nodes with complex relationship queries and real-time updates.
 */

import neo4j, { Driver, Session } from "neo4j-driver";

import type {
  EvidenceGraphData,
  GraphNode,
  GraphEdge,
  EvidenceEntry,
  EntityType,
} from "../types/evidence-graph.types";

interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;
}

interface QueryOptions {
  limit?: number;
  skip?: number;
  orderBy?: string;
  direction?: "ASC" | "DESC";
}

interface PathQuery {
  startNodeId: string;
  endNodeId: string;
  maxDepth: number;
  relationshipTypes?: string[];
}

interface NeighborhoodQuery {
  centerNodeId: string;
  radius: number;
  entityTypes?: EntityType[];
  minConfidence?: number;
}

export class Neo4jService {
  private driver: Driver | null = null;
  private config: Neo4jConfig;
  private isConnected = false;

  constructor(config?: Partial<Neo4jConfig>) {
    this.config = {
      uri: config?.uri || process.env.NEO4J_URI || "bolt://localhost:7687",
      username: config?.username || process.env.NEO4J_USERNAME || "neo4j",
      password:
        config?.password || process.env.NEO4J_PASSWORD || "evidencegraph2024",
      database: config?.database || process.env.NEO4J_DATABASE || "neo4j",
    };
  }

  /**
   * Initialize database connection and create constraints
   */
  async connect(): Promise<void> {
    try {
      this.driver = neo4j.driver(
        this.config.uri,
        neo4j.auth.basic(this.config.username, this.config.password),
        {
          // Optimized for large graphs
          connectionAcquisitionTimeout: 60000,
          maxConnectionPoolSize: 50,
          connectionTimeout: 20000,
        }
      );

      // Test connection
      await this.driver.verifyConnectivity();
      this.isConnected = true;

      // Initialize schema
      await this.initializeSchema();

      console.log(`✅ Connected to Neo4j at ${this.config.uri}`);
    } catch (error) {
      console.error("❌ Failed to connect to Neo4j:", error);
      throw new Error(`Neo4j connection failed: ${error}`);
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.isConnected = false;
      console.log("🔌 Disconnected from Neo4j");
    }
  }

  /**
   * Create database schema constraints and indexes
   */
  private async initializeSchema(): Promise<void> {
    const session = this.getSession();

    try {
      // Create constraints for unique IDs
      await session.run(`
        CREATE CONSTRAINT evidence_id IF NOT EXISTS
        FOR (e:Evidence) REQUIRE e.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT node_id IF NOT EXISTS  
        FOR (n:GraphNode) REQUIRE n.id IS UNIQUE
      `);

      // Create indexes for performance
      await session.run(`
        CREATE INDEX node_entity_type IF NOT EXISTS
        FOR (n:GraphNode) ON (n.entityType)
      `);

      await session.run(`
        CREATE INDEX node_label IF NOT EXISTS
        FOR (n:GraphNode) ON (n.label)
      `);

      await session.run(`
        CREATE INDEX evidence_publisher IF NOT EXISTS
        FOR (e:Evidence) ON (e.publisher)
      `);

      await session.run(`
        CREATE INDEX evidence_date IF NOT EXISTS
        FOR (e:Evidence) ON (e.date)
      `);

      await session.run(`
        CREATE INDEX relationship_type IF NOT EXISTS
        FOR ()-[r:RELATES_TO]-() ON (r.type)
      `);

      await session.run(`
        CREATE INDEX relationship_confidence IF NOT EXISTS
        FOR ()-[r:RELATES_TO]-() ON (r.confidence)
      `);

      console.log("📊 Neo4j schema initialized with constraints and indexes");
    } finally {
      await session.close();
    }
  }

  /**
   * Get database session
   */
  private getSession(): Session {
    if (!this.driver || !this.isConnected) {
      throw new Error("Neo4j not connected. Call connect() first.");
    }
    return this.driver.session({ database: this.config.database });
  }

  /**
   * Add evidence entry to database
   */
  async addEvidence(evidence: EvidenceEntry): Promise<void> {
    const session = this.getSession();

    try {
      await session.run(
        `
        CREATE (e:Evidence {
          id: $id,
          title: $title,
          date: date($date),
          publisher: $publisher,
          url: $url,
          type: $type,
          notes: $notes,
          created_at: datetime()
        })
      `,
        evidence
      );

      console.log(`✅ Added evidence: ${evidence.id}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Add graph node to database
   */
  async addNode(node: GraphNode): Promise<void> {
    const session = this.getSession();

    try {
      // Create node with dynamic label based on entity type
      const entityLabel =
        node.entityType.charAt(0).toUpperCase() + node.entityType.slice(1);

      await session.run(
        `
        CREATE (n:GraphNode:${entityLabel} {
          id: $id,
          label: $label,
          entityType: $entityType,
          startDate: CASE WHEN $startDate IS NOT NULL THEN date($startDate) ELSE NULL END,
          endDate: CASE WHEN $endDate IS NOT NULL THEN date($endDate) ELSE NULL END,
          aka: $aka,
          tags: $tags,
          positionX: $positionX,
          positionY: $positionY,
          created_at: datetime()
        })
      `,
        {
          ...node,
          startDate: node.dates?.start || null,
          endDate: node.dates?.end || null,
          positionX: node.position?.x || null,
          positionY: node.position?.y || null,
        }
      );

      // Create relationships to evidence sources
      if (node.sources && node.sources.length > 0) {
        await session.run(
          `
          MATCH (n:GraphNode {id: $nodeId})
          MATCH (e:Evidence) WHERE e.id IN $sources
          CREATE (n)-[:SUPPORTED_BY]->(e)
        `,
          { nodeId: node.id, sources: node.sources }
        );
      }

      console.log(`✅ Added node: ${node.id} (${node.entityType})`);
    } finally {
      await session.close();
    }
  }

  /**
   * Add relationship edge to database
   */
  async addEdge(edge: GraphEdge): Promise<void> {
    const session = this.getSession();

    try {
      await session.run(
        `
        MATCH (source:GraphNode {id: $sourceId})
        MATCH (target:GraphNode {id: $targetId})
        CREATE (source)-[r:RELATES_TO {
          id: $id,
          label: $label,
          type: $type,
          since: CASE WHEN $since IS NOT NULL THEN date($since) ELSE NULL END,
          until: CASE WHEN $until IS NOT NULL THEN date($until) ELSE NULL END,
          confidence: $confidence,
          notes: $notes,
          created_at: datetime()
        }]->(target)
      `,
        {
          sourceId: edge.source,
          targetId: edge.target,
          ...edge,
          confidence: edge.confidence || 0.8,
        }
      );

      // Link to evidence sources
      if (edge.sources && edge.sources.length > 0) {
        await session.run(
          `
          MATCH (source:GraphNode {id: $sourceId})-[r:RELATES_TO {id: $edgeId}]->(target:GraphNode {id: $targetId})
          MATCH (e:Evidence) WHERE e.id IN $sources  
          CREATE (r)-[:SUPPORTED_BY]->(e)
        `,
          {
            sourceId: edge.source,
            targetId: edge.target,
            edgeId: edge.id,
            sources: edge.sources,
          }
        );
      }

      console.log(
        `✅ Added edge: ${edge.id} (${edge.source} → ${edge.target})`
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Find shortest path between two nodes
   */
  async findPath(
    query: PathQuery
  ): Promise<Array<{ nodes: GraphNode[]; edges: GraphEdge[] }>> {
    const session = this.getSession();

    try {
      const relationshipFilter = query.relationshipTypes
        ? `WHERE ALL(r IN relationships(path) WHERE r.type IN $relationshipTypes)`
        : "";

      const result = await session.run(
        `
        MATCH path = shortestPath(
          (start:GraphNode {id: $startNodeId})-[:RELATES_TO*1..${query.maxDepth}]-(end:GraphNode {id: $endNodeId})
        )
        ${relationshipFilter}
        RETURN path
        LIMIT 10
      `,
        {
          startNodeId: query.startNodeId,
          endNodeId: query.endNodeId,
          relationshipTypes: query.relationshipTypes || [],
        }
      );

      return result.records.map((record) => {
        const path = record.get("path");
        return {
          nodes: path.segments.flatMap((segment: any) => [
            this.recordToNode(segment.start),
            this.recordToNode(segment.end),
          ]),
          edges: path.segments.map((segment: any) =>
            this.recordToEdge(segment.relationship)
          ),
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Get neighborhood around a node
   */
  async getNeighborhood(query: NeighborhoodQuery): Promise<EvidenceGraphData> {
    const session = this.getSession();

    try {
      // Simplified query to avoid syntax issues
      const result = await session.run(
        `
        MATCH (center:GraphNode {id: $centerNodeId})-[r:RELATES_TO*1..${query.radius}]-(n:GraphNode)
        ${query.entityTypes && query.entityTypes.length > 0 ? "WHERE n.entityType IN $entityTypes" : ""}
        RETURN DISTINCT n, r, center
        LIMIT 1000
      `,
        {
          centerNodeId: query.centerNodeId,
          entityTypes: query.entityTypes || [],
        }
      );

      // Process results into EvidenceGraphData format
      const nodes = new Map<string, GraphNode>();
      const edges = new Map<string, GraphEdge>();

      result.records.forEach((record) => {
        const node = this.recordToNode(record.get("n"));
        nodes.set(node.id, node);

        const relationships = record.get("r");
        if (Array.isArray(relationships)) {
          relationships.forEach((rel: any) => {
            const edge = this.recordToEdge(rel);
            edges.set(edge.id, edge);
          });
        }
      });

      // Get evidence for all nodes and edges
      const evidence = await this.getEvidenceForEntities([
        ...nodes.keys(),
        ...edges.keys(),
      ]);

      return {
        meta: {
          version: "1.0.0",
          generated_at: new Date().toISOString(),
          description: `Neighborhood of ${query.centerNodeId} (radius: ${query.radius})`,
        },
        evidence,
        nodes: Array.from(nodes.values()),
        edges: Array.from(edges.values()),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Search nodes by label or properties
   */
  async searchNodes(
    query: string,
    options: QueryOptions = {}
  ): Promise<GraphNode[]> {
    const session = this.getSession();

    try {
      const result = await session.run(
        `
        MATCH (n:GraphNode)
        WHERE n.label CONTAINS $query
           OR any(alias IN n.aka WHERE alias CONTAINS $query)
           OR any(tag IN n.tags WHERE tag CONTAINS $query)
        RETURN n
        ORDER BY n.label ${options.direction || "ASC"}
        SKIP $skip
        LIMIT $limit
      `,
        {
          query,
          skip: options.skip || 0,
          limit: options.limit || 100,
        }
      );

      return result.records.map((record) => this.recordToNode(record.get("n")));
    } finally {
      await session.close();
    }
  }

  /**
   * Get graph statistics
   */
  async getStatistics(): Promise<{
    nodeCount: number;
    edgeCount: number;
    evidenceCount: number;
    entityBreakdown: { [key: string]: number };
    relationshipBreakdown: { [key: string]: number };
  }> {
    // Use separate sessions for each query to avoid transaction conflicts
    let nodeCount = 0;
    let edgeCount = 0;
    let evidenceCount = 0;
    const entityBreakdown: { [key: string]: number } = {};
    const relationshipBreakdown: { [key: string]: number } = {};

    try {
      // Get node count
      const nodeSession = this.getSession();
      try {
        const nodeStats = await nodeSession.run(
          "MATCH (n:GraphNode) RETURN count(n) as count"
        );
        nodeCount = nodeStats.records[0]?.get("count").toNumber() || 0;
      } finally {
        await nodeSession.close();
      }

      // Get edge count
      const edgeSession = this.getSession();
      try {
        const edgeStats = await edgeSession.run(
          "MATCH ()-[r:RELATES_TO]->() RETURN count(r) as count"
        );
        edgeCount = edgeStats.records[0]?.get("count").toNumber() || 0;
      } finally {
        await edgeSession.close();
      }

      // Get evidence count
      const evidenceSession = this.getSession();
      try {
        const evidenceStats = await evidenceSession.run(
          "MATCH (e:Evidence) RETURN count(e) as count"
        );
        evidenceCount = evidenceStats.records[0]?.get("count").toNumber() || 0;
      } finally {
        await evidenceSession.close();
      }

      // Get entity breakdown
      const entitySession = this.getSession();
      try {
        const entityStats = await entitySession.run(`
          MATCH (n:GraphNode) 
          RETURN n.entityType as type, count(n) as count 
          ORDER BY count DESC
        `);
        entityStats.records.forEach((record) => {
          entityBreakdown[record.get("type") as EntityType] = record
            .get("count")
            .toNumber();
        });
      } finally {
        await entitySession.close();
      }

      // Get relationship breakdown
      const relationshipSession = this.getSession();
      try {
        const relationshipStats = await relationshipSession.run(`
          MATCH ()-[r:RELATES_TO]->() 
          WHERE r.type IS NOT NULL
          RETURN r.type as type, count(r) as count 
          ORDER BY count DESC
        `);
        relationshipStats.records.forEach((record) => {
          const type = record.get("type");
          if (type) {
            relationshipBreakdown[type] = record.get("count").toNumber();
          }
        });
      } finally {
        await relationshipSession.close();
      }

      return {
        nodeCount,
        edgeCount,
        evidenceCount,
        entityBreakdown,
        relationshipBreakdown,
      };
    } catch (error) {
      console.error("Failed to get statistics:", error);
      throw error;
    }
  }

  /**
   * Delete node and all connected edges
   */
  async deleteNode(
    nodeId: string
  ): Promise<{ deletedNode: GraphNode | null; deletedEdges: GraphEdge[] }> {
    const session = this.getSession();

    try {
      // Get node before deletion
      const nodeResult = await session.run(
        "MATCH (n:GraphNode {id: $id}) RETURN n",
        { id: nodeId }
      );
      const deletedNode =
        nodeResult.records.length > 0
          ? this.recordToNode(nodeResult.records[0].get("n"))
          : null;

      // Get connected edges before deletion
      const edgesResult = await session.run(
        `
        MATCH (n:GraphNode {id: $id})-[r:RELATES_TO]-() 
        RETURN r
      `,
        { id: nodeId }
      );
      const deletedEdges = edgesResult.records.map((record) =>
        this.recordToEdge(record.get("r"))
      );

      // Delete node and all relationships
      await session.run("MATCH (n:GraphNode {id: $id}) DETACH DELETE n", {
        id: nodeId,
      });

      console.log(
        `🗑️ Deleted node: ${nodeId} and ${deletedEdges.length} connected edges`
      );

      return { deletedNode, deletedEdges };
    } finally {
      await session.close();
    }
  }

  /**
   * Bulk import data from JSON partitions
   */
  async importFromPartitions(data: EvidenceGraphData): Promise<{
    imported: { evidence: number; nodes: number; edges: number };
    errors: string[];
  }> {
    const errors: string[] = [];
    const importCounts = { evidence: 0, nodes: 0, edges: 0 };

    try {
      // Import evidence first (separate transactions for better error handling)
      console.log("📚 Importing evidence sources...");
      for (const evidence of data.evidence) {
        const session = this.getSession();
        try {
          await session.run(
            `
            MERGE (e:Evidence {id: $id})
            SET e.title = $title,
                e.date = date($date),
                e.publisher = $publisher,
                e.url = $url,
                e.type = $type,
                e.notes = $notes,
                e.updated_at = datetime()
          `,
            {
              id: evidence.id,
              title: evidence.title,
              date: evidence.date,
              publisher: evidence.publisher,
              url: evidence.url,
              type: evidence.type || null,
              notes: evidence.notes || null,
            }
          );
          importCounts.evidence++;
        } catch (error) {
          errors.push(`Evidence ${evidence.id}: ${error}`);
          console.error(`❌ Failed to import evidence ${evidence.id}:`, error);
        } finally {
          await session.close();
        }
      }

      // Import nodes second
      console.log("👥 Importing graph nodes...");
      for (const node of data.nodes) {
        const session = this.getSession();
        try {
          const entityLabel =
            node.entityType.charAt(0).toUpperCase() + node.entityType.slice(1);

          await session.run(
            `
            MERGE (n:GraphNode {id: $id})
            SET n:${entityLabel},
                n.label = $label,
                n.entityType = $entityType,
                n.startDate = CASE WHEN $startDate IS NOT NULL THEN date($startDate) ELSE NULL END,
                n.endDate = CASE WHEN $endDate IS NOT NULL THEN date($endDate) ELSE NULL END,
                n.aka = $aka,
                n.tags = $tags,
                n.positionX = $positionX,
                n.positionY = $positionY,
                n.evidenceSources = $evidenceSources,
                n.updated_at = datetime()
          `,
            {
              id: node.id,
              label: node.label,
              entityType: node.entityType,
              startDate: node.dates?.start || null,
              endDate: node.dates?.end || null,
              aka: node.aka || [],
              tags: node.tags || [],
              positionX: node.position?.x || null,
              positionY: node.position?.y || null,
              evidenceSources: node.sources || [],
            }
          );

          importCounts.nodes++;
        } catch (error) {
          errors.push(`Node ${node.id}: ${error}`);
          console.error(`❌ Failed to import node ${node.id}:`, error);
        } finally {
          await session.close();
        }
      }

      // Import edges last
      console.log("🔗 Importing relationships...");
      for (const edge of data.edges) {
        const session = this.getSession();
        try {
          await session.run(
            `
            MATCH (source:GraphNode {id: $sourceId})
            MATCH (target:GraphNode {id: $targetId})
            MERGE (source)-[r:RELATES_TO {id: $id}]->(target)
            SET r.label = $label,
                r.type = $type,
                r.since = CASE WHEN $since IS NOT NULL THEN date($since) ELSE NULL END,
                r.until = CASE WHEN $until IS NOT NULL THEN date($until) ELSE NULL END,
                r.confidence = $confidence,
                r.notes = $notes,
                r.evidenceSources = $evidenceSources,
                r.updated_at = datetime()
          `,
            {
              sourceId: edge.source,
              targetId: edge.target,
              id: edge.id,
              label: edge.label,
              type: edge.type || null,
              since: edge.since || null,
              until: edge.until || null,
              confidence: edge.confidence || 0.8,
              notes: edge.notes || null,
              evidenceSources: edge.sources || [],
            }
          );

          importCounts.edges++;
        } catch (error) {
          errors.push(`Edge ${edge.id}: ${error}`);
          console.error(`❌ Failed to import edge ${edge.id}:`, error);
        } finally {
          await session.close();
        }
      }

      console.log(
        `✅ Import completed: ${importCounts.evidence} evidence, ${importCounts.nodes} nodes, ${importCounts.edges} edges`
      );
    } catch (error) {
      console.error("❌ Import failed:", error);
      errors.push(`Import failed: ${error}`);
    }

    return { imported: importCounts, errors };
  }

  // Helper methods for converting Neo4j records to our types

  private recordToNode(record: any): GraphNode {
    const props = record.properties;
    return {
      id: props.id,
      label: props.label,
      entityType: props.entityType,
      dates: {
        ...(props.startDate && { start: props.startDate.toString() }),
        ...(props.endDate && { end: props.endDate.toString() }),
      },
      aka: props.aka || [],
      tags: props.tags || [],
      sources: [], // Will be populated separately
      ...(props.positionX &&
        props.positionY && {
          position: { x: props.positionX, y: props.positionY },
        }),
    };
  }

  private recordToEdge(record: any): GraphEdge {
    const props = record.properties;
    return {
      id: props.id,
      source: record.startNodeElementId, // Will need to map to actual node IDs
      target: record.endNodeElementId,
      label: props.label,
      type: props.type,
      since: props.since?.toString(),
      until: props.until?.toString(),
      confidence: props.confidence,
      notes: props.notes,
      sources: [], // Will be populated separately
    };
  }

  private async getEvidenceForEntities(
    entityIds: string[]
  ): Promise<EvidenceEntry[]> {
    const session = this.getSession();

    try {
      const result = await session.run(
        `
        MATCH (entity)-[:SUPPORTED_BY]->(e:Evidence)
        WHERE entity.id IN $entityIds
        RETURN DISTINCT e
      `,
        { entityIds }
      );

      return result.records.map((record) => {
        const props = record.get("e").properties;
        return {
          id: props.id,
          title: props.title,
          date: props.date.toString(),
          publisher: props.publisher,
          url: props.url,
          type: props.type,
          notes: props.notes,
        };
      });
    } finally {
      await session.close();
    }
  }
}
