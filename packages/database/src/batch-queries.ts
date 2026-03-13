/**
 * Batch Query Builders for Large Graph Loading
 *
 * Optimized query patterns for progressive graph loading with memory management.
 */

export interface BatchQueryOptions {
  batchSize?: number;
  maxTotal?: number;
  entityTypes?: string[];
  cursor?: string;
}

export interface GraphBatch {
  nodes: any[];
  edges: any[];
  cursor?: string;
  hasMore: boolean;
  batchIndex: number;
  totalLoaded: number;
}

/**
 * Build optimized node query for batch loading
 */
export function buildBatchNodeQuery(options: BatchQueryOptions = {}): {
  query: string;
  parameters: Record<string, any>;
} {
  const { batchSize = 500, entityTypes, cursor } = options;

  let query = `
    MATCH (n)
    WHERE n.uid IS NOT NULL 
      AND NOT n:Evidence 
      AND NOT n:File 
      AND NOT n:Content
      AND n.name IS NOT NULL
  `;

  const parameters: Record<string, any> = {};

  // Add entity type filtering
  if (entityTypes && entityTypes.length > 0) {
    query += ` AND labels(n)[0] IN $entityTypes`;
    parameters.entityTypes = entityTypes;
  }

  // Add cursor-based pagination
  if (cursor) {
    const cursorName = Buffer.from(cursor, "base64").toString();
    query += ` AND n.name > $cursorName`;
    parameters.cursorName = cursorName;
  }

  query += `
    RETURN n.uid as uid,
           n.name as name,
           labels(n)[0] as type,
           labels(n) as labels,
           n.tags as tags,
           n.aliases as aliases,
           n.communityId as communityId,
           n.degree_total as degree
    ORDER BY n.name
    LIMIT ${Math.floor(batchSize)}
  `;

  return { query, parameters };
}

/**
 * Build optimized edge query for specific node sets
 */
export function buildBatchEdgeQuery(
  nodeUids: string[],
  options: BatchQueryOptions = {}
): {
  query: string;
  parameters: Record<string, any>;
} {
  const { batchSize = 1000 } = options;

  const query = `
    MATCH (source)-[r]->(target)
    WHERE source.uid IN $nodeUids 
      AND target.uid IN $nodeUids
      AND NOT source:Evidence 
      AND NOT source:File 
      AND NOT source:Content
      AND NOT target:Evidence 
      AND NOT target:File 
      AND NOT target:Content
    RETURN DISTINCT
      r.uid as uid,
      type(r) as type,
      source.uid as sourceUid,
      target.uid as targetUid,
      r.sentiment as sentiment,
      r.category as category,
      r.intensity as intensity,
      r.confidence as confidence,
      r.at as at,
      coalesce(r.text_excerpt, r.excerpt, '') as excerpt
    ORDER BY source.uid, target.uid
    LIMIT ${Math.floor(batchSize)}
  `;

  return {
    query,
    parameters: { nodeUids },
  };
}

/**
 * Build streaming query for large dataset processing
 */
export function buildStreamingQuery(
  baseQuery: string,
  orderBy: string = "n.name",
  options: { batchSize?: number } = {}
): {
  query: string;
  getBatch: (offset: number) => {
    query: string;
    parameters: Record<string, any>;
  };
} {
  const { batchSize = 1000 } = options;

  const query = `${baseQuery} ORDER BY ${orderBy}`;

  const getBatch = (offset: number) => ({
    query: `${query} SKIP $offset LIMIT $batchSize`,
    parameters: {
      offset: offset,
      batchSize: Math.floor(batchSize),
    },
  });

  return { query, getBatch };
}

/**
 * Calculate optimal batch size based on dataset characteristics
 */
export function calculateOptimalBatchSize(
  estimatedNodes: number,
  estimatedEdges: number,
  targetMemoryMB: number = 100
): {
  nodeBatchSize: number;
  edgeBatchSize: number;
  reasoning: string;
} {
  // Estimate memory usage: ~1KB per node, ~0.5KB per edge
  const nodeMemoryPerItem = 1024; // bytes
  const edgeMemoryPerItem = 512; // bytes
  const targetMemoryBytes = targetMemoryMB * 1024 * 1024;

  // Calculate batch sizes to stay under memory target
  const maxNodeBatch = Math.floor(targetMemoryBytes / nodeMemoryPerItem / 2); // 50% for nodes
  const maxEdgeBatch = Math.floor(targetMemoryBytes / edgeMemoryPerItem / 2); // 50% for edges

  // Apply reasonable bounds
  const nodeBatchSize = Math.min(Math.max(maxNodeBatch, 100), 2000);
  const edgeBatchSize = Math.min(Math.max(maxEdgeBatch, 200), 5000);

  return {
    nodeBatchSize,
    edgeBatchSize,
    reasoning: `Optimized for ${targetMemoryMB}MB memory target: ${nodeBatchSize} nodes, ${edgeBatchSize} edges per batch`,
  };
}

/**
 * Performance monitoring for batch operations
 */
export class BatchPerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  recordBatchTime(operation: string, timeMs: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(timeMs);
  }

  getAverageTime(operation: string): number {
    const times = this.metrics.get(operation) || [];
    return times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;
  }

  getPerformanceReport(): {
    operations: Array<{
      name: string;
      averageTime: number;
      batchCount: number;
      totalTime: number;
    }>;
    totalOperations: number;
  } {
    const operations = Array.from(this.metrics.entries()).map(
      ([name, times]) => ({
        name,
        averageTime: Math.round(
          times.reduce((a, b) => a + b, 0) / times.length
        ),
        batchCount: times.length,
        totalTime: times.reduce((a, b) => a + b, 0),
      })
    );

    return {
      operations,
      totalOperations: operations.reduce((sum, op) => sum + op.batchCount, 0),
    };
  }
}
