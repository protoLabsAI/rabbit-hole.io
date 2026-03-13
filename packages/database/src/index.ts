/**
 * @proto/database - Database Client Package
 *
 * Centralized database access for Neo4j operations across the platform.
 */

// Main client exports
export {
  Neo4jClient,
  createNeo4jClient,
  getGlobalNeo4jClient,
  closeGlobalClient,
  type Neo4jConfig,
  type QueryOptions,
  type TransactionOptions,
} from "./neo4j-client";

// PostgreSQL pool exports
export {
  getGlobalPostgresPool,
  closeGlobalPostgresPool,
} from "./postgres-pool";

// Job queue pool exports
export { getJobQueuePool, closeJobQueuePool } from "./job-queue-pool";

// Query builders
export {
  buildEntityDetailsQuery,
  buildAtlasOverviewQuery,
  buildEntitySearchQuery,
  buildIngestQueries,
  buildHealthCheckQuery,
  type EntityQueryParams,
  type RelationshipQueryParams,
  type GraphQueryParams,
} from "./query-builders";

// Configuration utilities
export {
  type DatabaseConfig,
  getDefaultConfig as getDefaultDatabaseConfig,
  validateConfig as validateDatabaseConfig,
} from "./config";

// Batch processing utilities
export {
  buildBatchNodeQuery,
  buildBatchEdgeQuery,
  buildStreamingQuery,
  calculateOptimalBatchSize,
  BatchPerformanceMonitor,
  type BatchQueryOptions,
  type GraphBatch,
} from "./batch-queries";

// Health check utilities
export {
  quickHealthCheck,
  getCachedHealthCheck,
  clearHealthCheckCache,
  type HealthCheckResult,
} from "./health-check";

// File query utilities
export {
  fetchFileByCanonicalKey,
  fetchFileByUid,
  type FileEntityWithOwnership,
} from "./file-queries";

// Usage tracking utilities
export {
  getEntityCount,
  getRelationshipCount,
  getWorkspaceCount,
  getStorageUsed,
  getRoomCount,
} from "./usage-tracking";
