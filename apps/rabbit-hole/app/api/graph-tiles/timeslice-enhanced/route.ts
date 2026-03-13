/**
 * Enhanced Graph Tiles API - Time Slice View with Pagination & Aggregation
 *
 * Provides scalable time-based graph data access with:
 * - Cursor-based pagination for large datasets
 * - Aggregated event counts for different time granularities
 * - Performance optimization for 10k+ events
 */

import neo4j from "neo4j-driver";
import { NextRequest, NextResponse } from "next/server";

import { getGlobalNeo4jClient, type Neo4jClient } from "@proto/database";

import type {
  CanonicalNode,
  CanonicalEdge,
  CanonicalGraphData,
  CanonicalResponse,
} from "../../../types/canonical-graph";

// Enhanced interfaces for pagination and aggregation
interface TimeSlicePagination {
  cursor?: string; // Base64 encoded: timestamp_eventId
  pageSize: number;
  hasMore: boolean;
  totalCount?: number; // Estimated, not exact for performance
}

interface TimeAggregation {
  granularity: "hour" | "day" | "week" | "month";
  bins: Array<{
    timestamp: string;
    count: number;
    hostileCount: number;
    supportiveCount: number;
    neutralCount: number;
  }>;
  totalEvents: number;
}

interface EnhancedTimesliceResponse
  extends CanonicalResponse<CanonicalGraphData> {
  pagination?: TimeSlicePagination;
  aggregation?: TimeAggregation;
  performance: {
    queryTime: number;
    resultSize: number;
    optimizationHints: string[];
  };
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<EnhancedTimesliceResponse>> {
  const startTime = Date.now();
  const client = getGlobalNeo4jClient();

  try {
    const { searchParams } = new URL(request.url);

    // Parse enhanced query parameters
    const fromDate =
      searchParams.get("from") ||
      (() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split("T")[0];
      })();

    const toDate =
      searchParams.get("to") || new Date().toISOString().split("T")[0];

    // Pagination parameters
    const cursor = searchParams.get("cursor") || undefined;
    const pageSizeInput = parseInt(searchParams.get("pageSize") || "1000");
    const pageSize = Math.min(
      isNaN(pageSizeInput) ? 1000 : pageSizeInput,
      5000
    );

    // Aggregation parameters
    const includeAggregation = searchParams.get("aggregate") === "true";
    const granularityInput = searchParams.get("granularity") || "day";
    const validGranularities = ["hour", "day", "week", "month"];
    const granularity = (
      validGranularities.includes(granularityInput) ? granularityInput : "day"
    ) as "hour" | "day" | "week" | "month";

    // Filter parameters
    const sentiments = searchParams.get("sentiments")?.split(",") || undefined;
    const entityTypes = searchParams.get("types")?.split(",") || undefined;
    const minActivityInput = parseInt(searchParams.get("minActivity") || "1");
    const minActivity = isNaN(minActivityInput) ? 1 : minActivityInput;
    const entityUid = searchParams.get("entityUid") || undefined; // Focus on specific entity

    console.log(
      `⏰ Enhanced timeslice: ${fromDate} to ${toDate}, cursor: ${cursor}, pageSize: ${pageSize}`
    );

    // Validate pageSize
    if (isNaN(pageSize) || pageSize < 1) {
      console.error("Invalid pageSize detected:", pageSize);
      throw new Error(`Invalid pageSize: ${pageSize}`);
    }

    // Validate date range
    const fromDateTime = new Date(fromDate);
    const toDateTime = new Date(toDate);

    if (isNaN(fromDateTime.getTime())) {
      throw new Error(
        `Invalid 'from' date: ${fromDate}. Expected format: YYYY-MM-DD`
      );
    }
    if (isNaN(toDateTime.getTime())) {
      throw new Error(
        `Invalid 'to' date: ${toDate}. Expected format: YYYY-MM-DD`
      );
    }
    if (fromDateTime > toDateTime) {
      throw new Error(
        `'from' date (${fromDate}) must be before or equal to 'to' date (${toDate})`
      );
    }

    // Ensure all numeric parameters are integers for Neo4j
    const queryParams: any = {
      fromDate,
      toDate,
      minActivity,
    };
    if (sentiments) queryParams.sentiments = sentiments;
    if (entityTypes)
      queryParams.entityTypes = entityTypes.map(
        (t) => t.charAt(0).toUpperCase() + t.slice(1)
      );
    if (entityUid) queryParams.entityUid = entityUid;

    let results: {
      nodes: CanonicalNode[];
      edges: CanonicalEdge[];
      pagination: TimeSlicePagination;
      aggregation?: TimeAggregation;
    };

    if (cursor) {
      // Cursor-based pagination for subsequent pages
      results = await fetchPaginatedTimeSlice(
        client,
        queryParams,
        cursor,
        pageSize
      );
    } else {
      // First page - potentially with aggregation
      results = await fetchInitialTimeSlice(
        client,
        queryParams,
        pageSize,
        includeAggregation,
        granularity
      );
    }

    const queryTime = Date.now() - startTime;
    const optimizationHints = generateOptimizationHints(
      results,
      queryTime,
      pageSize
    );

    const graphData: CanonicalGraphData = {
      nodes: results.nodes,
      edges: results.edges,
      meta: {
        nodeCount: results.nodes.length,
        edgeCount: results.edges.length,
        generatedAt: new Date().toISOString(),
        schemaVersion: "canonical-v1",
        viewMode: "timeslice",
        bounded: true,
        filters: {
          timeWindow: { start: fromDate, end: toDate },
        },
      },
    };

    const response: EnhancedTimesliceResponse = {
      success: true,
      data: graphData,
      pagination: results.pagination,
      aggregation: results.aggregation,
      performance: {
        queryTime,
        resultSize: results.nodes.length + results.edges.length,
        optimizationHints,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Enhanced Timeslice API error:", error);

    const errorResponse: EnhancedTimesliceResponse = {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch enhanced timeslice",
      performance: {
        queryTime: Date.now() - startTime,
        resultSize: 0,
        optimizationHints: ["Error occurred - check server logs"],
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
  // No finally block needed - @proto/database handles connection management
}

/**
 * Fetch initial time slice data with optional aggregation
 */
async function fetchInitialTimeSlice(
  client: Neo4jClient,
  params: any,
  pageSize: any,
  includeAggregation: boolean,
  granularity: "hour" | "day" | "week" | "month"
): Promise<{
  nodes: CanonicalNode[];
  edges: CanonicalEdge[];
  pagination: TimeSlicePagination;
  aggregation?: TimeAggregation;
}> {
  const { fromDate, toDate, entityUid, sentiments, entityTypes, minActivity } =
    params;

  // Build optimized query for time-based pagination
  let edgesQuery = `
    MATCH (source)-[r]->(target)
    WHERE r.at >= datetime($fromDate + 'T00:00:00Z')
      AND r.at <= datetime($toDate + 'T23:59:59Z')
  `;

  // Add entity-specific filtering for focused queries
  if (entityUid) {
    edgesQuery += ` AND (source.uid = $entityUid OR target.uid = $entityUid)`;
  }

  if (sentiments) {
    edgesQuery += ` AND (r.sentiment IN $sentiments OR r.sentiment IS NULL)`;
  }

  if (entityTypes) {
    edgesQuery += ` AND (labels(source)[0] IN $entityTypes OR labels(target)[0] IN $entityTypes)`;
  }

  // Order by timestamp for cursor pagination
  edgesQuery += `
    WITH r, source, target
    ORDER BY r.at DESC, r.uid ASC
    LIMIT $pageSize
    
    RETURN 
      r.uid as uid,
      type(r) as type,
      source.uid as sourceUid,
      target.uid as targetUid,
      r.sentiment as sentiment,
      r.category as category,
      r.intensity as intensity,
      r.confidence as confidence,
      r.at as at,
      coalesce(r.text_excerpt, r.excerpt, '') as excerpt,
      source.name as sourceName,
      target.name as targetName,
      labels(source)[0] as sourceType,
      labels(target)[0] as targetType
  `;

  const edgesResult = await client.executeRead(edgesQuery, {
    ...params,
    pageSize: neo4j.int(pageSize),
  });
  const edgeData = processEdgeRecords(edgesResult.records);

  // Extract unique node UIDs and get node details
  const nodeUids = new Set<string>();
  edgeData.forEach((e) => {
    nodeUids.add(e.sourceUid);
    nodeUids.add(e.targetUid);
  });

  const nodes = await fetchNodeDetails(client, Array.from(nodeUids), params);
  const edges = convertEdgesToCanonical(edgeData);

  // Determine pagination cursor
  const hasMore = edgeData.length === pageSize;
  const nextCursor =
    hasMore && edgeData.length > 0
      ? encodeCursor(
          edgeData[edgeData.length - 1].at,
          edgeData[edgeData.length - 1].uid
        )
      : undefined;

  const pagination: TimeSlicePagination = {
    pageSize: pageSize,
    hasMore,
    cursor: nextCursor,
  };

  let aggregation: TimeAggregation | undefined;
  if (includeAggregation) {
    aggregation = await fetchTimeAggregation(client, params, granularity);
  }

  return { nodes, edges, pagination, aggregation };
}

/**
 * Fetch paginated time slice data using cursor
 */
async function fetchPaginatedTimeSlice(
  client: Neo4jClient,
  params: any,
  cursor: string,
  pageSize: any
): Promise<{
  nodes: CanonicalNode[];
  edges: CanonicalEdge[];
  pagination: TimeSlicePagination;
}> {
  const { timestamp, eventId } = decodeCursor(cursor);

  // Cursor-based pagination query
  let edgesQuery = `
    MATCH (source)-[r]->(target)
    WHERE r.at >= datetime($fromDate + 'T00:00:00Z')
      AND r.at <= datetime($toDate + 'T23:59:59Z')
      AND (r.at < datetime($cursorTimestamp) OR (r.at = datetime($cursorTimestamp) AND r.uid > $cursorEventId))
  `;

  if (params.entityUid) {
    edgesQuery += ` AND (source.uid = $entityUid OR target.uid = $entityUid)`;
  }

  if (params.sentiments) {
    edgesQuery += ` AND (r.sentiment IN $sentiments OR r.sentiment IS NULL)`;
  }

  if (params.entityTypes) {
    edgesQuery += ` AND (labels(source)[0] IN $entityTypes OR labels(target)[0] IN $entityTypes)`;
  }

  edgesQuery += `
    WITH r, source, target
    ORDER BY r.at DESC, r.uid ASC
    LIMIT $pageSize
    
    RETURN 
      r.uid as uid,
      type(r) as type,
      source.uid as sourceUid,
      target.uid as targetUid,
      r.sentiment as sentiment,
      r.category as category,
      r.intensity as intensity,
      r.confidence as confidence,
      r.at as at,
      coalesce(r.text_excerpt, r.excerpt, '') as excerpt,
      source.name as sourceName,
      target.name as targetName,
      labels(source)[0] as sourceType,
      labels(target)[0] as targetType
  `;

  const queryParamsWithCursor = {
    ...params,
    cursorTimestamp: timestamp,
    cursorEventId: eventId,
    pageSize: neo4j.int(pageSize),
  };

  const edgesResult = await client.executeRead(
    edgesQuery,
    queryParamsWithCursor
  );
  const edgeData = processEdgeRecords(edgesResult.records);

  // Get node details
  const nodeUids = new Set<string>();
  edgeData.forEach((e) => {
    nodeUids.add(e.sourceUid);
    nodeUids.add(e.targetUid);
  });

  const nodes = await fetchNodeDetails(client, Array.from(nodeUids), params);
  const edges = convertEdgesToCanonical(edgeData);

  // Determine next cursor
  const hasMore = edgeData.length === pageSize;
  const nextCursor =
    hasMore && edgeData.length > 0
      ? encodeCursor(
          edgeData[edgeData.length - 1].at,
          edgeData[edgeData.length - 1].uid
        )
      : undefined;

  const pagination: TimeSlicePagination = {
    cursor: nextCursor,
    pageSize: pageSize,
    hasMore,
  };

  return { nodes, edges, pagination };
}

/**
 * Fetch time-based aggregation data for overview visualization
 */
async function fetchTimeAggregation(
  client: Neo4jClient,
  params: any,
  granularity: "hour" | "day" | "week" | "month"
): Promise<TimeAggregation> {
  const { fromDate, toDate, entityUid, sentiments, entityTypes } = params;

  // Determine aggregation interval in milliseconds
  const intervalMs = getIntervalMs(granularity);

  let aggregationQuery = `
    MATCH (source)-[r]->(target)
    WHERE r.at >= datetime($fromDate + 'T00:00:00Z')
      AND r.at <= datetime($toDate + 'T23:59:59Z')
  `;

  if (entityUid) {
    aggregationQuery += ` AND (source.uid = $entityUid OR target.uid = $entityUid)`;
  }

  if (sentiments) {
    aggregationQuery += ` AND (r.sentiment IN $sentiments OR r.sentiment IS NULL)`;
  }

  if (entityTypes) {
    aggregationQuery += ` AND (labels(source)[0] IN $entityTypes OR labels(target)[0] IN $entityTypes)`;
  }

  // Group by time interval
  aggregationQuery += `
    WITH r, 
         duration.between(datetime($fromDate + 'T00:00:00Z'), r.at).milliseconds as msFromStart
    WITH r,
         toInteger(msFromStart / $intervalMs) as binIndex
    WITH binIndex,
         count(r) as totalCount,
         sum(CASE WHEN r.sentiment = 'hostile' THEN 1 ELSE 0 END) as hostileCount,
         sum(CASE WHEN r.sentiment = 'supportive' THEN 1 ELSE 0 END) as supportiveCount,
         sum(CASE WHEN r.sentiment = 'neutral' OR r.sentiment IS NULL THEN 1 ELSE 0 END) as neutralCount
    ORDER BY binIndex
    
    RETURN 
      binIndex,
      totalCount,
      hostileCount,
      supportiveCount,
      neutralCount
  `;

  const result = await client.executeRead(aggregationQuery, {
    ...params,
    intervalMs: neo4j.int(intervalMs),
  });

  const fromDateTime = new Date(fromDate + "T00:00:00Z");
  const bins = result.records.map((record: any) => {
    const binIndex = (neo4j as any).int(record.get("binIndex")).toNumber();
    const timestamp = new Date(fromDateTime.getTime() + binIndex * intervalMs);

    return {
      timestamp: timestamp.toISOString(),
      count: (neo4j as any).int(record.get("totalCount")).toNumber(),
      hostileCount: (neo4j as any).int(record.get("hostileCount")).toNumber(),
      supportiveCount: (neo4j as any)
        .int(record.get("supportiveCount"))
        .toNumber(),
      neutralCount: (neo4j as any).int(record.get("neutralCount")).toNumber(),
    };
  });

  const totalEvents = bins.reduce(
    (sum: number, bin: any) => sum + bin.count,
    0
  );

  return {
    granularity,
    bins,
    totalEvents,
  };
}

/**
 * Fetch node details for the given UIDs
 */
async function fetchNodeDetails(
  client: Neo4jClient,
  nodeUids: string[],
  params: any
): Promise<CanonicalNode[]> {
  if (nodeUids.length === 0) return [];

  const { fromDate, toDate, minActivity } = params;

  const nodesQuery = `
    UNWIND $nodeUids as uid
    MATCH (n {uid: uid})
    
    // Count activity in time window
    OPTIONAL MATCH (n)-[r]->()
    WHERE r.at >= datetime($fromDate + 'T00:00:00Z')
      AND r.at <= datetime($toDate + 'T23:59:59Z')
    
    WITH n, count(r) as activityCount
    WHERE activityCount >= $minActivity
    
    RETURN 
      n.uid as uid,
      n.name as name,
      labels(n)[0] as type,
      n.speechActs_hostile as speechActs_hostile,
      n.speechActs_supportive as speechActs_supportive,
      n.speechActs_neutral as speechActs_neutral,
      n.speechActs_total as speechActs_total,
      n.degree_in as degree_in,
      n.degree_out as degree_out,
      n.degree_total as degree_total,
      n.communityId as communityId,
      activityCount,
      n.position as position
    ORDER BY activityCount DESC
  `;

  // Ensure all numeric parameters are integers
  const nodeQueryParams = {
    nodeUids,
    fromDate: params.fromDate,
    toDate: params.toDate,
    minActivity: neo4j.int(params.minActivity || 1),
  };

  const result = await client.executeRead(nodesQuery, nodeQueryParams);

  return result.records.map((record: any) => ({
    uid: record.get("uid"),
    name: record.get("name"),
    type: record.get("type").toLowerCase(),
    display: {
      title: record.get("name"),
      subtitle: `${record.get("type")} • ${(neo4j as any).int(record.get("activityCount")).toNumber()} events`,
    },
    metrics: {
      speechActs: {
        hostile: record.get("speechActs_hostile") || 0,
        supportive: record.get("speechActs_supportive") || 0,
        neutral: record.get("speechActs_neutral") || 0,
        total: record.get("speechActs_total") || 0,
      },
      degree: {
        in: record.get("degree_in") || 0,
        out: record.get("degree_out") || 0,
        total: record.get("degree_total") || 0,
      },
      activityInWindow: (neo4j as any)
        .int(record.get("activityCount"))
        .toNumber(),
    },
    metadata: {
      communityId: record.get("communityId")
        ? (neo4j as any).int(record.get("communityId")).toNumber()
        : undefined,
      position: record.get("position") || {
        x: 0,
        y: 0,
      },
    },
  }));
}

/**
 * Helper functions for cursor encoding/decoding
 */
function encodeCursor(timestamp: any, eventId: string): string {
  const cursorData = `${timestamp.toString()}_${eventId}`;
  return Buffer.from(cursorData).toString("base64");
}

function decodeCursor(cursor: string): { timestamp: string; eventId: string } {
  const cursorData = Buffer.from(cursor, "base64").toString("ascii");
  const [timestamp, eventId] = cursorData.split("_");
  return { timestamp, eventId };
}

/**
 * Get interval in milliseconds for different granularities
 */
function getIntervalMs(granularity: "hour" | "day" | "week" | "month"): number {
  switch (granularity) {
    case "hour":
      return 60 * 60 * 1000;
    case "day":
      return 24 * 60 * 60 * 1000;
    case "week":
      return 7 * 24 * 60 * 60 * 1000;
    case "month":
      return 30 * 24 * 60 * 60 * 1000; // Approximate
  }
}

/**
 * Process edge records from Neo4j result
 */
function processEdgeRecords(records: any[]): any[] {
  return records.map((record: any) => ({
    uid: record.get("uid"),
    type: record.get("type"),
    sourceUid: record.get("sourceUid"),
    targetUid: record.get("targetUid"),
    sentiment: record.get("sentiment"),
    category: record.get("category"),
    intensity: record.get("intensity"),
    confidence: record.get("confidence"),
    at: record.get("at"),
    excerpt: record.get("excerpt"),
    sourceName: record.get("sourceName"),
    targetName: record.get("targetName"),
    sourceType: record.get("sourceType"),
    targetType: record.get("targetType"),
  }));
}

/**
 * Convert edge data to canonical format
 */
function convertEdgesToCanonical(edgeData: any[]): CanonicalEdge[] {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "hostile":
        return "#ff4444";
      case "supportive":
        return "#44ff44";
      case "ambiguous":
        return "#ffaa44";
      default:
        return "#666666";
    }
  };

  return edgeData.map((r) => {
    const sentiment = r.sentiment || "neutral";
    const excerpt = r.excerpt || "";
    const truncatedExcerpt =
      excerpt.length > 25 ? excerpt.substring(0, 25) + "..." : excerpt;

    return {
      uid: r.uid,
      source: r.sourceUid,
      target: r.targetUid,
      type: r.type,
      sentiment: sentiment as any,
      intensity: (r.intensity || "medium") as any,
      display: {
        label: r.category || r.type.toLowerCase().replace("_", " "),
        excerpt: truncatedExcerpt,
        color: getSentimentColor(sentiment),
        timestamp: new Date(r.at).toLocaleDateString(),
      },
      metadata: {
        confidence: r.confidence || 0.8,
        at: r.at.toString(),
        category: r.category,
      },
    };
  });
}

/**
 * Generate performance optimization hints
 */
function generateOptimizationHints(
  results: {
    nodes: CanonicalNode[];
    edges: CanonicalEdge[];
    pagination: TimeSlicePagination;
  },
  queryTime: number,
  pageSize: number
): string[] {
  const hints: string[] = [];

  if (queryTime > 1000) {
    hints.push(
      "Consider using smaller time windows or entity-specific filtering"
    );
  }

  if (results.edges.length === pageSize) {
    hints.push("Results truncated - use pagination for complete dataset");
  }

  if (results.nodes.length > 1000) {
    hints.push("Large node count - consider increasing minActivity threshold");
  }

  if (queryTime < 200 && results.edges.length < pageSize / 2) {
    hints.push(
      "Query under-utilized - can increase page size for better throughput"
    );
  }

  return hints;
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: "/api/graph-tiles/timeslice-enhanced",
      description:
        "Enhanced time-windowed subgraph with pagination and aggregation",
      method: "GET",
      parameters: {
        // Basic parameters
        from: "Start date (YYYY-MM-DD, default: 30 days ago)",
        to: "End date (YYYY-MM-DD, default: today)",

        // Pagination parameters
        cursor: "Pagination cursor (base64 encoded timestamp_eventId)",
        pageSize: "Page size (default: 1000, max: 5000)",

        // Aggregation parameters
        aggregate: "Include aggregation data (true/false, default: false)",
        granularity:
          "Aggregation granularity: hour|day|week|month (default: day)",

        // Filtering parameters
        entityUid: "Focus on specific entity (optional)",
        sentiments: "Comma-separated: hostile,supportive,neutral",
        types: "Comma-separated entity types: person,organization,platform",
        minActivity: "Minimum activity count in window (default: 1)",
      },
    },
    usage: {
      examples: [
        "/api/graph-tiles/timeslice-enhanced?from=2024-01-01&to=2024-01-31&aggregate=true",
        "/api/graph-tiles/timeslice-enhanced?entityUid=person:trump&pageSize=2000",
        "/api/graph-tiles/timeslice-enhanced?cursor=eyJhIjoiYiJ9&pageSize=1000",
        "/api/graph-tiles/timeslice-enhanced?granularity=week&aggregate=true",
      ],
    },
    features: {
      pagination: "Cursor-based pagination for large datasets",
      aggregation: "Time-binned event counts for overview visualization",
      performance: "Optimized queries with performance hints",
      entityFocus: "Entity-specific time slice views",
    },
  });
}
