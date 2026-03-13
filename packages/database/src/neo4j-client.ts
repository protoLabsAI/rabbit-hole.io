/**
 * Neo4j Database Client
 *
 * Centralized Neo4j client with connection pooling, transaction management,
 * and query utilities for the Rabbit Hole platform.
 */

import neo4j, { Driver, Session, QueryResult } from "neo4j-driver";

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database: string;
  maxConnectionPoolSize?: number;
  connectionTimeout?: number;
  disableLosslessIntegers?: boolean;
}

export interface QueryOptions {
  timeout?: number;
  database?: string;
  bookmarks?: string[];
}

export interface TransactionOptions extends QueryOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

export class Neo4jClient {
  private driver: Driver;
  private config: Neo4jConfig;

  constructor(config: Neo4jConfig) {
    this.config = {
      maxConnectionPoolSize: 50,
      connectionTimeout: 20000,
      disableLosslessIntegers: true,
      ...config,
    };

    this.driver = neo4j.driver(
      this.config.uri,
      neo4j.auth.basic(this.config.username, this.config.password),
      {
        maxConnectionPoolSize: this.config.maxConnectionPoolSize,
        connectionTimeout: this.config.connectionTimeout,
        disableLosslessIntegers: this.config.disableLosslessIntegers,
      }
    );
  }

  /**
   * Execute a read query with automatic session management
   */
  async executeRead(
    query: string,
    parameters: Record<string, any> = {},
    options: QueryOptions = {}
  ): Promise<QueryResult> {
    const session = this.getSession(options);
    try {
      return await session.executeRead((tx) => tx.run(query, parameters));
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a write query with automatic session management
   */
  async executeWrite(
    query: string,
    parameters: Record<string, any> = {},
    options: QueryOptions = {}
  ): Promise<QueryResult> {
    const session = this.getSession(options);
    try {
      return await session.executeWrite((tx) => tx.run(query, parameters));
    } finally {
      await session.close();
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async executeTransaction(
    queries: Array<{ query: string; parameters?: Record<string, any> }>,
    options: TransactionOptions = {}
  ): Promise<QueryResult[]> {
    const session = this.getSession(options);

    try {
      return await session.executeWrite(async (tx) => {
        const results: QueryResult[] = [];
        for (const { query, parameters = {} } of queries) {
          const result = await tx.run(query, parameters);
          results.push(result);
        }
        return results;
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Get a managed session for complex operations
   */
  getSession(options: QueryOptions = {}): Session {
    return this.driver.session({
      database: options.database || this.config.database,
      bookmarks: options.bookmarks,
    });
  }

  /**
   * Health check - verify database connectivity
   */
  async healthCheck(): Promise<{
    isHealthy: boolean;
    responseTime: number;
    stats?: { nodeCount: number; relationshipCount: number };
    error?: string;
  }> {
    const startTime = Date.now();
    const session = this.getSession();

    try {
      // Test basic connectivity
      const testResult = await session.run("RETURN 1 as test");

      if (testResult.records.length === 0) {
        throw new Error("Database returned no results for health check");
      }

      // Get basic stats
      const statsResult = await session.run(`
        CALL apoc.meta.stats() YIELD nodeCount, relCount
        RETURN nodeCount, relCount
      `);

      const responseTime = Date.now() - startTime;

      let stats;
      if (statsResult.records.length > 0) {
        const record = statsResult.records[0];
        stats = {
          nodeCount: record.get("nodeCount")?.toNumber() || 0,
          relationshipCount: record.get("relCount")?.toNumber() || 0,
        };
      }

      return {
        isHealthy: true,
        responseTime,
        stats,
      };
    } catch (error) {
      return {
        isHealthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Stream large result sets with memory management
   */
  async streamQuery<T>(
    query: string,
    parameters: Record<string, any> = {},
    onBatch: (batch: T[]) => Promise<void>,
    batchSize = 1000
  ): Promise<void> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const session = this.getSession();
      try {
        const paginatedQuery = `${query} SKIP $offset LIMIT $batchSize`;
        const result = await session.executeRead((tx) =>
          tx.run(paginatedQuery, {
            ...parameters,
            offset: neo4j.int(offset),
            batchSize: neo4j.int(batchSize),
          })
        );

        const batch = result.records.map((record) => record.toObject() as T);
        await onBatch(batch);

        hasMore = result.records.length === batchSize;
        offset += batchSize;
      } finally {
        await session.close();
      }
    }
  }

  /**
   * Execute batch queries with transaction safety
   */
  async executeBatch<T>(
    queries: Array<{
      query: string;
      parameters?: Record<string, any>;
    }>,
    batchSize = 100
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);

      const session = this.getSession();
      try {
        const batchResults = await session.executeWrite(async (tx) => {
          const batchPromises = batch.map(({ query, parameters = {} }) =>
            tx.run(query, parameters)
          );
          return Promise.all(batchPromises);
        });

        results.push(
          ...batchResults.flatMap((r) =>
            r.records.map((record) => record.toObject() as T)
          )
        );
      } finally {
        await session.close();
      }
    }

    return results;
  }

  /**
   * Progressive graph loading with cursor-based pagination
   */
  async loadGraphBatched(
    nodeQuery: string,
    edgeQuery: string,
    parameters: Record<string, any> = {},
    options: {
      batchSize?: number;
      maxNodes?: number;
      onProgress?: (loaded: number, estimated: number) => void;
    } = {}
  ): Promise<{
    nodes: any[];
    edges: any[];
    pagination: { hasMore: boolean; cursor?: string };
  }> {
    const { batchSize = 500, maxNodes = 5000, onProgress } = options;

    const allNodes: any[] = [];
    let cursor: string | undefined;
    let hasMore = true;
    let loadedCount = 0;

    // Load nodes in batches
    while (hasMore && loadedCount < maxNodes) {
      const session = this.getSession();
      try {
        let paginatedNodeQuery = nodeQuery;
        const queryParams = { ...parameters };

        if (cursor) {
          paginatedNodeQuery += ` AND n.name > $cursorName`;
          queryParams.cursorName = Buffer.from(cursor, "base64").toString();
        }

        paginatedNodeQuery += ` ORDER BY n.name LIMIT ${Math.floor(batchSize)}`;

        const result = await session.executeRead((tx) =>
          tx.run(paginatedNodeQuery, queryParams)
        );

        const batch = result.records.map((record) => record.toObject());
        allNodes.push(...batch);
        loadedCount += batch.length;

        hasMore = batch.length === batchSize;
        if (hasMore && batch.length > 0) {
          cursor = Buffer.from(
            batch[batch.length - 1].label || batch[batch.length - 1].name
          ).toString("base64");
        }

        onProgress?.(loadedCount, Math.max(loadedCount, maxNodes));
      } finally {
        await session.close();
      }
    }

    // Load edges for the collected nodes
    const nodeUids = allNodes.map((n) => n.id || n.uid);
    let allEdges: any[] = [];

    if (nodeUids.length > 0) {
      const session = this.getSession();
      try {
        const edgeQueryWithFilter = `${edgeQuery} AND source.uid IN $nodeUids AND target.uid IN $nodeUids`;
        const result = await session.executeRead((tx) =>
          tx.run(edgeQueryWithFilter, { ...parameters, nodeUids })
        );

        allEdges = result.records.map((record) => record.toObject());
      } finally {
        await session.close();
      }
    }

    return {
      nodes: allNodes,
      edges: allEdges,
      pagination: {
        hasMore: hasMore && loadedCount < maxNodes,
        cursor: hasMore ? cursor : undefined,
      },
    };
  }

  /**
   * Close the driver and all connections
   */
  async close(): Promise<void> {
    await this.driver.close();
  }

  /**
   * Get driver statistics
   */
  getDriverMetrics() {
    return {
      connectionPoolSize: this.config.maxConnectionPoolSize,
      database: this.config.database,
      uri: this.config.uri.replace(/\/\/.*@/, "//***@"), // Mask credentials
    };
  }
}

/**
 * Create a Neo4j client from environment variables
 */
export function createNeo4jClient(config?: Partial<Neo4jConfig>): Neo4jClient {
  const defaultConfig: Neo4jConfig = {
    uri: process.env.NEO4J_URI || "bolt://localhost:7687",
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || "neo4j",
    password: process.env.NEO4J_PASSWORD || "evidencegraph2024",
    database: process.env.NEO4J_DATABASE || "neo4j",
  };

  return new Neo4jClient({ ...defaultConfig, ...config });
}

/**
 * Singleton client instance for API routes
 */
let globalClient: Neo4jClient | null = null;

export function getGlobalNeo4jClient(): Neo4jClient {
  if (!globalClient) {
    globalClient = createNeo4jClient();
  }
  return globalClient;
}

/**
 * Cleanup global client (for testing or graceful shutdown)
 */
export async function closeGlobalClient(): Promise<void> {
  if (globalClient) {
    await globalClient.close();
    globalClient = null;
  }
}
