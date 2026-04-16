/**
 * Graph Tiles API - Time Slice View - Canonical Format
 *
 * Returns bounded subgraph in standardized canonical format.
 * Eliminates client-side transformation complexity.
 */

import neo4j from "neo4j-driver";
import { NextRequest, NextResponse } from "next/server";

import { getGlobalNeo4jClient } from "@protolabsai/database";

import type {
  CanonicalNode,
  CanonicalEdge,
  CanonicalGraphData,
  CanonicalResponse,
} from "../../../types/canonical-graph";

// Using canonical format - no custom interfaces needed
type TimesliceResponse = CanonicalResponse<CanonicalGraphData>;

export async function GET(
  request: NextRequest
): Promise<NextResponse<TimesliceResponse>> {
  const client = getGlobalNeo4jClient();

  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters (ensure proper integers for Neo4j)
    const fromDate =
      searchParams.get("from") ||
      (() => {
        const date = new Date();
        date.setDate(date.getDate() - 30); // Default: last 30 days
        return date.toISOString().split("T")[0];
      })();

    const toDate =
      searchParams.get("to") || new Date().toISOString().split("T")[0];
    const nodeLimit = Math.min(
      parseInt(searchParams.get("nodeLimit") || "200"),
      1000
    );
    const edgeLimit = Math.min(
      parseInt(searchParams.get("edgeLimit") || "500"),
      2000
    );
    const sentiments = searchParams.get("sentiments")?.split(",") || undefined;
    const entityTypes = searchParams.get("types")?.split(",") || undefined;
    const minActivity = parseInt(searchParams.get("minActivity") || "1");

    console.log(`⏰ Fetching timeslice: ${fromDate} to ${toDate}`);

    // Calculate duration
    const fromDateTime = new Date(fromDate);
    const toDateTime = new Date(toDate);
    const durationDays = Math.ceil(
      (toDateTime.getTime() - fromDateTime.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Get edges within time window with filters - public access to all entities
    let edgesQuery = `
      MATCH (source)-[r]->(target)
      WHERE r.at >= datetime($fromDate + 'T00:00:00Z')
        AND r.at <= datetime($toDate + 'T23:59:59Z')
    `;

    if (sentiments) {
      edgesQuery += ` AND (r.sentiment IN $sentiments OR r.sentiment IS NULL)`;
    }

    if (entityTypes) {
      const capitalizedTypes = entityTypes.map(
        (t) => t.charAt(0).toUpperCase() + t.slice(1)
      );
      edgesQuery += ` AND (labels(source)[0] IN $entityTypes OR labels(target)[0] IN $entityTypes)`;
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
        source.name as sourceName,
        target.name as targetName,
        labels(source)[0] as sourceType,
        labels(target)[0] as targetType
      ORDER BY r.at DESC
      LIMIT $edgeLimit
    `;

    const queryParams: any = {
      fromDate,
      toDate,
      edgeLimit: neo4j.int(edgeLimit),
    };

    if (sentiments) queryParams.sentiments = sentiments;
    if (entityTypes)
      queryParams.entityTypes = entityTypes.map(
        (t) => t.charAt(0).toUpperCase() + t.slice(1)
      );

    const edgesResult = await client.executeRead(edgesQuery, queryParams);

    // Extract unique node UIDs from edges
    const nodeUids = new Set<string>();
    const edgeData = edgesResult.records.map((record: any) => {
      const sourceUid = record.get("sourceUid");
      const targetUid = record.get("targetUid");
      nodeUids.add(sourceUid);
      nodeUids.add(targetUid);

      return {
        uid: record.get("uid"),
        type: record.get("type"),
        sourceUid,
        targetUid,
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
      };
    });

    // Get node details for active entities
    const nodeUidsList = Array.from(nodeUids).slice(0, nodeLimit);

    if (nodeUidsList.length === 0) {
      const emptyGraphData: CanonicalGraphData = {
        nodes: [],
        edges: [],
        meta: {
          nodeCount: 0,
          edgeCount: 0,
          generatedAt: new Date().toISOString(),
          schemaVersion: "canonical-v1",
          viewMode: "timeslice",
          bounded: true,
          filters: {
            timeWindow: { start: fromDate, end: toDate },
          },
        },
      };

      const response: CanonicalResponse<CanonicalGraphData> = {
        success: true,
        data: emptyGraphData,
      };

      return NextResponse.json(response);
    }

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
      LIMIT $nodeLimit
    `;

    const nodesResult = await client.executeRead(nodesQuery, {
      nodeUids: nodeUidsList,
      fromDate,
      toDate,
      minActivity: neo4j.int(minActivity),
      nodeLimit: neo4j.int(nodeLimit),
    });

    // Convert to canonical format
    const nodes: CanonicalNode[] = nodesResult.records.map((record: any) => ({
      uid: record.get("uid"),
      name: record.get("name"),
      type: record.get("type").toLowerCase(),
      display: {
        title: record.get("name"),
        subtitle: `${record.get("type")} • ${neo4j.int(record.get("activityCount")).toNumber()} events`,
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
        activityInWindow: neo4j.int(record.get("activityCount")).toNumber(),
      },
      metadata: {
        communityId: record.get("communityId")
          ? neo4j.int(record.get("communityId")).toNumber()
          : undefined,
        position: record.get("position") || {
          x: Math.random() * 800 - 400,
          y: Math.random() * 800 - 400,
        },
      },
    }));

    // Filter edges to only include nodes we're returning
    const activeNodeUids = new Set(nodes.map((n) => n.uid));
    const filteredEdgeData = edgeData.filter(
      (e) => activeNodeUids.has(e.sourceUid) && activeNodeUids.has(e.targetUid)
    );

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

    const edges: CanonicalEdge[] = filteredEdgeData.map((r) => {
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

    // Generate timeline data (daily buckets)
    const timelineMap = new Map<
      string,
      { total: number; hostile: number; supportive: number }
    >();

    for (const edge of edges) {
      const dateKey = edge.metadata.at!.split("T")[0];
      const existing = timelineMap.get(dateKey) || {
        total: 0,
        hostile: 0,
        supportive: 0,
      };
      existing.total++;
      if (edge.sentiment === "hostile") existing.hostile++;
      if (edge.sentiment === "supportive") existing.supportive++;
      timelineMap.set(dateKey, existing);
    }

    const timeline = Array.from(timelineMap.entries())
      .map(([date, counts]) => ({
        date,
        eventCount: counts.total,
        hostileCount: counts.hostile,
        supportiveCount: counts.supportive,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Find peak activity
    const peakActivity = timeline.reduce(
      (max, day) =>
        day.eventCount > max.count
          ? { date: day.date, count: day.eventCount }
          : max,
      { date: fromDate, count: 0 }
    );

    console.log(`📊 Timeslice: ${nodes.length} nodes, ${edges.length} edges`);
    console.log(
      `📈 Peak activity: ${peakActivity.count} events on ${peakActivity.date}`
    );

    const graphData: CanonicalGraphData = {
      nodes,
      edges,
      meta: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        generatedAt: new Date().toISOString(),
        schemaVersion: "canonical-v1",
        viewMode: "timeslice",
        bounded: true,
        filters: {
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
    console.error("Timeslice API error:", error);

    const errorResponse: CanonicalResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch timeslice",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
  // No finally block needed - @protolabsai/database handles connection management
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: "/api/graph-tiles/timeslice",
      description: "Time-windowed subgraph for temporal analysis",
      method: "GET",
      parameters: {
        from: "Start date (YYYY-MM-DD, default: 30 days ago)",
        to: "End date (YYYY-MM-DD, default: today)",
        nodeLimit: "Max nodes (default: 200, max: 1000)",
        edgeLimit: "Max edges (default: 500, max: 2000)",
        sentiments: "Comma-separated: hostile,supportive,neutral",
        types: "Comma-separated entity types: person,organization,platform",
        minActivity: "Minimum activity count in window (default: 1)",
      },
    },
    usage: {
      examples: [
        "/api/graph-tiles/timeslice?from=2024-01-01&to=2024-01-31",
        "/api/graph-tiles/timeslice?from=2024-06-01&sentiments=hostile&minActivity=3",
        "/api/graph-tiles/timeslice?types=person,platform&nodeLimit=100",
      ],
    },
    returns: {
      timeline: "Daily event counts for timeline visualization",
      peakActivity: "Date and count of highest activity",
      activityInWindow: "Per-node activity count within time window",
    },
  });
}
