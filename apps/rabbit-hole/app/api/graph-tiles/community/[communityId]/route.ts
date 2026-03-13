/**
 * Graph Tiles API - Community View
 *
 * Returns bounded community subgraph with time filtering.
 * Uses precomputed communityId from Louvain detection.
 */

import neo4j from "neo4j-driver";
import { NextRequest, NextResponse } from "next/server";

import { getGlobalNeo4jClient } from "@proto/database";

import type {
  CanonicalNode,
  CanonicalEdge,
  CanonicalGraphData,
  CanonicalResponse,
} from "../../../../types/canonical-graph";

// Using canonical format - no custom interfaces needed
type CommunityResponse = CanonicalResponse<CanonicalGraphData>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ communityId: string }> }
): Promise<NextResponse<CommunityResponse>> {
  const client = getGlobalNeo4jClient();

  try {
    const { communityId } = await params;
    const communityIdParam = parseInt(communityId);
    const { searchParams } = new URL(request.url);

    // Parse query parameters (ensure proper integers for Neo4j)
    const nodeLimit = Math.min(
      parseInt(searchParams.get("nodeLimit") || "100"),
      500
    );
    const edgeLimit = Math.min(
      parseInt(searchParams.get("edgeLimit") || "200"),
      1000
    );
    const fromDate = searchParams.get("from") || "2020-01-01"; // Default to include relationships from 2020 onwards
    const toDate =
      searchParams.get("to") || new Date().toISOString().split("T")[0];
    const sentiments = searchParams.get("sentiments")?.split(",") || undefined;

    if (isNaN(communityIdParam)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid community ID - must be a number",
        },
        { status: 400 }
      );
    }

    console.log(`🏘️ Fetching community ${communityIdParam} subgraph`);

    // Get community nodes with limits
    const nodesQuery = `
      MATCH (n) 
      WHERE n.communityId = $communityId
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
        n.lastActiveAt as lastActiveAt,
        n.position as position
      ORDER BY coalesce(n.degree_total, 0) DESC
      LIMIT $nodeLimit
    `;

    const nodesResult = await client.executeRead(nodesQuery, {
      communityId: neo4j.int(communityIdParam),
      nodeLimit: neo4j.int(nodeLimit),
    });

    if (nodesResult.records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Community ${communityIdParam} not found or empty`,
        },
        { status: 404 }
      );
    }

    // Convert nodes to canonical format
    const nodes: CanonicalNode[] = nodesResult.records.map((record: any) => ({
      uid: record.get("uid"),
      name: record.get("name"),
      type: record.get("type").toLowerCase(),
      display: {
        title: record.get("name"),
        subtitle: record.get("type"),
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
        lastActiveAt: record.get("lastActiveAt")?.toString(),
      },
      metadata: {
        communityId: neo4j.int(record.get("communityId")).toNumber(),
        position: record.get("position") || {
          x: Math.random() * 600 - 300,
          y: Math.random() * 600 - 300,
        },
      },
    }));

    // Get community edges with time and sentiment filters
    const nodeUids = nodes.map((n) => n.uid);
    let edgesQuery = `
      MATCH (source)-[r]->(target)
      WHERE source.uid IN $nodeUids 
        AND target.uid IN $nodeUids
        AND r.at >= datetime($fromDate + 'T00:00:00Z')
        AND r.at <= datetime($toDate + 'T23:59:59Z')
    `;

    if (sentiments) {
      edgesQuery += ` AND (r.sentiment IN $sentiments OR r.sentiment IS NULL)`;
    }

    edgesQuery += `
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
        r.narrative as narrative
      ORDER BY r.at DESC
      LIMIT $edgeLimit
    `;

    const queryParams: any = {
      nodeUids,
      fromDate,
      toDate,
      edgeLimit: neo4j.int(edgeLimit),
    };

    if (sentiments) queryParams.sentiments = sentiments;

    const edgesResult = await client.executeRead(edgesQuery, queryParams);

    // Convert edges
    // Convert edges to canonical format
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

    const edges: CanonicalEdge[] = edgesResult.records.map((record: any) => {
      const sentiment = record.get("sentiment") || "neutral";
      const excerpt = record.get("excerpt") || "";
      const truncatedExcerpt =
        excerpt.length > 25 ? excerpt.substring(0, 25) + "..." : excerpt;

      return {
        uid: record.get("uid"),
        source: record.get("sourceUid"),
        target: record.get("targetUid"),
        type: record.get("type"),
        sentiment: sentiment as any,
        intensity: (record.get("intensity") || "medium") as any,
        display: {
          label:
            record.get("category") ||
            record.get("type").toLowerCase().replace("_", " "),
          excerpt: truncatedExcerpt,
          color: getSentimentColor(sentiment),
        },
        metadata: {
          confidence: record.get("confidence") || 0.8,
          at: record.get("at")?.toString(),
          category: record.get("category"),
        },
      };
    });

    // Calculate community metadata
    const typeCount = nodes.reduce(
      (acc, node) => {
        acc[node.type] = (acc[node.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const topTypes = Object.entries(typeCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    // Calculate centroid for layout
    const centroid =
      nodes.length > 0
        ? {
            x:
              nodes.reduce((sum, n) => sum + (n.metadata.position?.x || 0), 0) /
              nodes.length,
            y:
              nodes.reduce((sum, n) => sum + (n.metadata.position?.y || 0), 0) /
              nodes.length,
          }
        : { x: 0, y: 0 };

    console.log(
      `📊 Community ${communityIdParam}: ${nodes.length} nodes, ${edges.length} edges`
    );
    console.log(`🏷️ Top types: ${topTypes.join(", ")}`);

    const graphData: CanonicalGraphData = {
      nodes,
      edges,
      meta: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        generatedAt: new Date().toISOString(),
        schemaVersion: "canonical-v1",
        viewMode: "community",
        bounded: true,
        filters: {
          communityId: communityIdParam,
          timeWindow: { start: fromDate, end: toDate },
          nodeLimit,
        },
      },
    };

    const response: CanonicalResponse<CanonicalGraphData> = {
      success: true,
      data: graphData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Community API error:", error);

    const errorResponse: CanonicalResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch community",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
  // No finally block needed - @proto/database handles connection management
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: "/api/graph-tiles/community/[communityId]",
      description: "Bounded community subgraph for million-scale visualization",
      method: "GET",
      parameters: {
        communityId: "Community ID from Louvain detection (required)",
        nodeLimit: "Max nodes (default: 100, max: 500)",
        edgeLimit: "Max edges (default: 200, max: 1000)",
        from: "Start date filter (YYYY-MM-DD, default: 2020-01-01)",
        to: "End date filter (YYYY-MM-DD, default: today)",
        sentiments: "Comma-separated: hostile,supportive,neutral",
      },
    },
    usage: {
      examples: [
        "/api/graph-tiles/community/42",
        "/api/graph-tiles/community/42?nodeLimit=150&edgeLimit=300",
        "/api/graph-tiles/community/42?from=2024-01-01&sentiments=hostile",
      ],
    },
    notes: {
      prerequisites:
        "Run pnpm run db:communities to compute communityId values",
      performance: "Responses bounded to prevent browser memory issues",
      layout: "Includes centroid for community-aware positioning",
    },
  });
}
