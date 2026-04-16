/**
 * Graph Tiles API - Ego Network - Canonical Format
 *
 * Returns bounded ego network in standardized canonical format.
 * Eliminates client-side transformation complexity.
 */

import neo4j from "neo4j-driver";
import { NextRequest, NextResponse } from "next/server";

import { getGlobalNeo4jClient, quickHealthCheck } from "@protolabsai/database";
import {
  buildSimpleEgoNetworkQuery,
  getOptimizedEgoLimits,
  validateEgoNetworkParams,
  type EgoNetworkParams,
} from "@protolabsai/utils/atlas";

import { sanitizeQueryParams } from "../../../../lib/graph-presenter";
import type {
  CanonicalNode,
  CanonicalEdge,
  CanonicalGraphData,
  CanonicalResponse,
} from "../../../../types/canonical-graph";

// Now using canonical format - no custom interfaces needed
type EgoNetworkResponse = CanonicalResponse<CanonicalGraphData>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ centerUid: string }> }
): Promise<NextResponse<EgoNetworkResponse>> {
  const client = getGlobalNeo4jClient();

  // Early health check - fail fast if database unavailable
  const healthCheck = await quickHealthCheck(client);
  if (!healthCheck.isHealthy) {
    console.error("❌ Database health check failed:", healthCheck.error);
    return NextResponse.json(
      {
        success: false,
        error: healthCheck.error || "Database connection failed",
      },
      { status: 503 } // Service Unavailable
    );
  }

  try {
    const { centerUid } = await params;
    const { searchParams } = new URL(request.url);

    // Use type-safe parameter sanitization
    const queryParams = sanitizeQueryParams(searchParams);
    const hops = queryParams.hops;
    const baseLimit = Math.min(queryParams.nodeLimit, 100);

    // Get optimized limits for the hop count
    const { limit1, limit2 } = getOptimizedEgoLimits(hops, baseLimit);

    // Get center node - public access to all entities
    const centerQuery = `
      MATCH (center {uid: $centerUid})
      RETURN 
        center.uid as uid,
        center.name as name,
        labels(center)[0] as type,
        center.speechActs_hostile as speechActs_hostile,
        center.speechActs_supportive as speechActs_supportive,
        center.speechActs_neutral as speechActs_neutral,
        center.speechActs_total as speechActs_total,
        center.degree_in as degree_in,
        center.degree_out as degree_out,
        center.degree_total as degree_total,
        center.communityId as communityId,
        center.lastActiveAt as lastActiveAt,
        center.position as position
    `;

    const centerResult = await client.executeRead(centerQuery, {
      centerUid,
    });
    if (centerResult.records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Entity ${centerUid} not found`,
        },
        { status: 404 }
      );
    }

    const centerRecord = centerResult.records[0];
    const centerNode: CanonicalNode = {
      uid: centerRecord.get("uid"),
      name: centerRecord.get("name"),
      type: centerRecord.get("type").toLowerCase(),
      display: {
        title: centerRecord.get("name"),
        subtitle: centerRecord.get("type"),
      },
      metrics: {
        speechActs: {
          hostile: centerRecord.get("speechActs_hostile") || 0,
          supportive: centerRecord.get("speechActs_supportive") || 0,
          neutral: centerRecord.get("speechActs_neutral") || 0,
          total: centerRecord.get("speechActs_total") || 0,
        },
        degree: {
          in: centerRecord.get("degree_in") || 0,
          out: centerRecord.get("degree_out") || 0,
          total: centerRecord.get("degree_total") || 0,
        },
        lastActiveAt: centerRecord.get("lastActiveAt")?.toString(),
      },
      metadata: {
        communityId: centerRecord.get("communityId")
          ? neo4j.int(centerRecord.get("communityId")).toNumber()
          : undefined,
        position: centerRecord.get("position") || { x: 0, y: 0 },
      },
    };

    // Build dynamic ego network query using utility function
    const egoNetworkParams: EgoNetworkParams = {
      centerUid,
      hops: hops, // Keep as number for utility function
      limit1: limit1, // Keep as number for utility function
      limit2: limit2, // Keep as number for utility function
      sentiments: queryParams.sentiments || undefined,
      fromDate: queryParams.fromDate,
      entityTypes: queryParams.entityTypes || undefined,
    };

    // Validate parameters
    const validation = validateEgoNetworkParams(egoNetworkParams);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid parameters: ${validation.errors.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Build query using utility (public access - no tenant filtering)
    const { query: egoQuery, params: cypherParams } =
      buildSimpleEgoNetworkQuery({
        ...egoNetworkParams,
        orgId: undefined, // No tenant filtering for public Atlas
      });

    // Force all numeric parameters to Neo4j integers to prevent floating point conversion
    const safeParams = { ...cypherParams };
    Object.keys(safeParams).forEach((key) => {
      if (
        typeof safeParams[key] === "number" &&
        Number.isInteger(safeParams[key])
      ) {
        safeParams[key] = neo4j.int(safeParams[key]);
      }
    });

    const egoResult = await client.executeRead(egoQuery, safeParams);

    if (egoResult.records.length === 0) {
      const emptyGraphData: CanonicalGraphData = {
        nodes: [centerNode],
        edges: [],
        meta: {
          nodeCount: 1,
          edgeCount: 0,
          generatedAt: new Date().toISOString(),
          schemaVersion: "canonical-v1",
          viewMode: "ego",
          bounded: true,
          filters: {
            centerEntity: centerUid,
            hops,
            sentiments: queryParams.sentiments,
            entityTypes: queryParams.entityTypes,
          },
        },
      };

      const response: CanonicalResponse<CanonicalGraphData> = {
        success: true,
        data: emptyGraphData,
      };

      return NextResponse.json(response);
    }

    const record = egoResult.records[0];
    const nodeData = record.get("nodeData");
    const edgeData = record.get("edgeData");

    // Convert to canonical format directly
    const neighborNodes: CanonicalNode[] = nodeData.map((n: any) => ({
      uid: n.uid,
      name: n.name,
      type: n.type?.toLowerCase() || "unknown",
      display: {
        title: n.name,
        subtitle: n.type,
      },
      metrics: {
        speechActs: {
          hostile: n.speechActs_hostile || 0,
          supportive: n.speechActs_supportive || 0,
          neutral: n.speechActs_neutral || 0,
          total: n.speechActs_total || 0,
        },
        degree: {
          in: n.degree_in || 0,
          out: n.degree_out || 0,
          total: n.degree_total || 0,
        },
        lastActiveAt: n.lastActiveAt?.toString(),
      },
      metadata: {
        communityId: n.communityId,
        position: n.position || {
          x: Math.random() * 400,
          y: Math.random() * 400,
        },
      },
    }));

    const edges: CanonicalEdge[] = edgeData.map((r: any) => {
      const sentiment = r.sentiment || "neutral";
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

      return {
        uid: r.uid,
        source: r.sourceUid,
        target: r.targetUid,
        type: r.type,
        sentiment: sentiment as any,
        intensity: (r.intensity || "medium") as any,
        display: {
          label: r.category || r.type.toLowerCase().replace(/_/g, " "),
          excerpt: r.excerpt?.slice(0, 50),
          color: getSentimentColor(sentiment),
        },
        metadata: {
          confidence: r.confidence || 0.8,
          at: r.at?.toString(),
          category: r.category,
        },
      };
    });

    const nodes: CanonicalNode[] = [centerNode, ...neighborNodes];

    const graphData: CanonicalGraphData = {
      nodes,
      edges,
      meta: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        generatedAt: new Date().toISOString(),
        schemaVersion: "canonical-v1",
        viewMode: "ego",
        bounded: true,
        filters: {
          centerEntity: centerUid,
          hops,
          nodeLimit: queryParams.nodeLimit,
          sentiments: queryParams.sentiments,
          entityTypes: queryParams.entityTypes,
        },
      },
    };

    const response: CanonicalResponse<CanonicalGraphData> = {
      success: true,
      data: graphData,
    };

    return NextResponse.json(response);
  } catch (error) {
    const errorResponse: CanonicalResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch ego network",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
  // No finally block needed - @protolabsai/database handles connection management
}

// getToneColor now handled by graph-presenter.ts

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: "/api/graph-tiles/ego/[centerUid]",
      description:
        "Dynamic ego network for million-scale visualization with configurable hop depth",
      method: "GET",
      parameters: {
        centerUid: "Entity UID (required)",
        hops: "Number of hops (1-10, default: 1)",
        nodeLimit: "Node limit (max 500, default: 50)",
        sentiments: "Comma-separated: hostile,supportive,neutral",
        from: "Start date filter (YYYY-MM-DD)",
        types: "Comma-separated entity types: person,organization,platform",
      },
    },
    usage: {
      examples: [
        "/api/graph-tiles/ego/person:elon_musk",
        "/api/graph-tiles/ego/person:elon_musk?hops=3&nodeLimit=100",
        "/api/graph-tiles/ego/person:bernie_sanders?hops=2&sentiments=hostile&nodeLimit=75",
        "/api/graph-tiles/ego/org:trump_org?hops=5&from=2024-01-01&types=person,platform",
      ],
    },
  });
}
