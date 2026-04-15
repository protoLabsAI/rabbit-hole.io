/**
 * Database Configuration
 *
 * Centralized configuration for database connections and performance settings
 */

export interface DatabaseConfig {
  type: "partitions" | "neo4j" | "hybrid";
  neo4j?: {
    uri: string;
    username: string;
    password: string;
    database: string;
    maxConnectionPoolSize: number;
    connectionTimeout: number;
  };
  partitions?: {
    basePath: string;
    enableCaching: boolean;
    cacheTtl: number;
  };
  performance?: {
    maxNodes: number;
    batchSize: number;
    queryTimeout: number;
  };
}

export const getDefaultConfig = (): DatabaseConfig => ({
  type: (process.env.DATABASE_TYPE as any) || "neo4j",
  neo4j: {
    uri: process.env.NEO4J_URI || "bolt://localhost:7687",
    username: process.env.NEO4J_USERNAME || "neo4j",
    password: process.env.NEO4J_PASSWORD || "",
    database: process.env.NEO4J_DATABASE || "neo4j",
    maxConnectionPoolSize: parseInt(process.env.NEO4J_POOL_SIZE || "50"),
    connectionTimeout: parseInt(process.env.NEO4J_TIMEOUT || "20000"),
  },
  partitions: {
    basePath: process.env.PARTITIONS_PATH || "/evidence-graphs/partitioned",
    enableCaching: process.env.ENABLE_CACHING !== "false",
    cacheTtl: parseInt(process.env.CACHE_TTL || "600000"), // 10 minutes
  },
  performance: {
    maxNodes: parseInt(process.env.MAX_GRAPH_NODES || "10000"),
    batchSize: parseInt(process.env.BATCH_SIZE || "1000"),
    queryTimeout: parseInt(process.env.QUERY_TIMEOUT || "30000"),
  },
});

export const validateConfig = (
  config: DatabaseConfig
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (config.type === "neo4j" || config.type === "hybrid") {
    if (!config.neo4j?.uri) {
      errors.push("Neo4j URI is required when using Neo4j backend");
    }
    if (!config.neo4j?.username || !config.neo4j?.password) {
      errors.push("Neo4j credentials are required");
    }
  }

  if (config.performance?.maxNodes && config.performance.maxNodes < 100) {
    errors.push("Maximum nodes should be at least 100 for meaningful graphs");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
