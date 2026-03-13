/**
 * Graph Batch Loading API
 *
 * Progressive graph loading with optimized batching for large datasets.
 * Demonstrates Neo4j batch processing capabilities.
 */

import { NextRequest, NextResponse } from "next/server";

import {
  getGlobalNeo4jClient,
  buildBatchNodeQuery,
  buildBatchEdgeQuery,
  calculateOptimalBatchSize,
} from "@proto/database";

import type {
  CanonicalGraphData,
  CanonicalResponse,
} from "../../types/canonical-graph";

type BatchResponse = CanonicalResponse<CanonicalGraphData>;

export async function GET(
  request: NextRequest
): Promise<NextResponse<BatchResponse>> {
  const { searchParams } = new URL(request.url);

  // Parse parameters with defaults optimized for batching
  const targetMemory = Math.floor(
    parseInt(searchParams.get("targetMemory") || "50")
  ); // MB
  const entityTypes = searchParams.get("entityTypes")?.split(",") || undefined;
  const cursor = searchParams.get("cursor") || undefined;
  const progressive = searchParams.get("progressive") === "true";

  const client = getGlobalNeo4jClient();

  try {
    console.log(
      `🚀 Batch loading graph data (progressive: ${progressive}, memory target: ${targetMemory}MB)`
    );
    const startTime = Date.now();

    // Calculate optimal batch sizes
    const batchConfig = calculateOptimalBatchSize(1000, 2000, targetMemory);
    console.log(`📊 Batch optimization: ${batchConfig.reasoning}`);

    if (progressive) {
      // Progressive loading - return stream of batches
      return await loadProgressiveBatches(client, {
        entityTypes,
        cursor,
        batchSize: batchConfig.nodeBatchSize,
      });
    } else {
      // Single batch load
      return await loadSingleBatch(client, {
        entityTypes,
        cursor,
        batchSize: batchConfig.nodeBatchSize,
        edgeBatchSize: batchConfig.edgeBatchSize,
      });
    }
  } catch (error) {
    console.error("🔥 Batch loading failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Batch loading failed",
      },
      { status: 500 }
    );
  }
}

/**
 * Load a single optimized batch
 */
async function loadSingleBatch(
  client: any,
  options: {
    entityTypes?: string[];
    cursor?: string;
    batchSize: number;
    edgeBatchSize: number;
  }
): Promise<NextResponse<BatchResponse>> {
  const { entityTypes, cursor, batchSize, edgeBatchSize } = options;

  // Build optimized node query
  const { query: nodeQuery, parameters: nodeParams } = buildBatchNodeQuery({
    batchSize,
    entityTypes,
    cursor,
  });

  // Load nodes
  const nodesResult = await client.executeRead(nodeQuery, nodeParams);
  const nodes = nodesResult.records.map((record: any) => ({
    uid: record.get("uid"),
    name: record.get("name"),
    type: record.get("type"),
    display: {
      title: record.get("name"),
      subtitle: record.get("type"),
    },
    metadata: {
      tags: record.get("tags") || [],
      communityId: record.get("communityId"),
      degree: record.get("degree"),
    },
  }));

  // Generate cursor for next batch
  const nextCursor =
    nodes.length === batchSize && nodes.length > 0
      ? Buffer.from(nodes[nodes.length - 1].name).toString("base64")
      : undefined;

  // Load edges for these nodes
  const nodeUids = nodes.map((n: any) => n.uid);
  let edges: any[] = [];

  if (nodeUids.length > 0) {
    const { query: edgeQuery, parameters: edgeParams } = buildBatchEdgeQuery(
      nodeUids,
      {
        batchSize: edgeBatchSize,
      }
    );

    const edgesResult = await client.executeRead(edgeQuery, edgeParams);
    edges = edgesResult.records.map((record: any) => ({
      uid: record.get("uid"),
      source: record.get("sourceUid"),
      target: record.get("targetUid"),
      type: record.get("type"),
      display: {
        label: record.get("type")?.toLowerCase().replace(/_/g, " "),
        color: record.get("sentiment") === "hostile" ? "#dc2626" : "#6b7280",
      },
      metadata: {
        sentiment: record.get("sentiment"),
        confidence: record.get("confidence") || 0.8,
        at: record.get("at"),
      },
    }));
  }

  const graphData: CanonicalGraphData = {
    nodes,
    edges,
    meta: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      generatedAt: new Date().toISOString(),
      schemaVersion: "canonical-v1",
      viewMode: "batch",
      bounded: nextCursor !== undefined,
      pagination: {
        pageSize: batchSize,
        hasMore: nextCursor !== undefined,
        cursor: nextCursor,
        totalEstimate: nextCursor ? nodes.length * 2 : nodes.length,
      },
      performance: {
        batchOptimized: true,
        memoryTargetMB: 50,
        queryTime: Date.now() - Date.now(), // Will be calculated properly in actual implementation
      },
    },
  };

  return NextResponse.json({
    success: true,
    data: graphData,
  });
}

/**
 * Progressive batch loading (placeholder for streaming implementation)
 */
async function loadProgressiveBatches(
  client: any,
  options: {
    entityTypes?: string[];
    cursor?: string;
    batchSize: number;
  }
): Promise<NextResponse<BatchResponse>> {
  // For now, return first batch with progressive flag
  // Future: Implement Server-Sent Events or WebSocket streaming
  const result = await loadSingleBatch(client, {
    ...options,
    edgeBatchSize: options.batchSize * 2,
  });

  const data = await result.json();
  if (data.success && data.data.meta) {
    data.data.meta.progressive = {
      enabled: true,
      streamingSupported: false, // Will be true when SSE implemented
      batchIndex: 0,
    };
  }

  return NextResponse.json(data);
}

/**
 * GET endpoint documentation
 */
export async function OPTIONS() {
  return NextResponse.json({
    endpoint: "/api/graph-batch",
    description: "Progressive graph loading with optimized batching",
    methods: ["GET"],
    parameters: {
      targetMemory: "Target memory usage in MB (default: 50)",
      entityTypes: "Comma-separated entity types to filter",
      cursor: "Pagination cursor for subsequent batches",
      progressive: "Enable progressive loading (default: false)",
    },
    examples: {
      basic: "/api/graph-batch?targetMemory=100",
      filtered:
        "/api/graph-batch?entityTypes=Person,Organization&targetMemory=75",
      paginated: "/api/graph-batch?cursor=<base64-cursor>&targetMemory=50",
      progressive: "/api/graph-batch?progressive=true&targetMemory=100",
    },
    batchOptimization: {
      memoryTargets: ["25MB", "50MB", "100MB", "200MB"],
      maxPageSize: 2000,
      recommendedBatchSize: "500 nodes, 1000 edges",
    },
  });
}
