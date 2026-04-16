/**
 * Atlas Graph Payload API
 *
 * GET /api/atlas/graph-payload
 * Returns cached or freshly computed graph with GDS metrics
 */

import { NextRequest, NextResponse } from "next/server";

import { getGlobalNeo4jClient } from "@protolabsai/database";
import { convertAllNeo4jParams } from "@protolabsai/utils";

interface GraphPayload {
  success: boolean;
  data?: {
    nodes: any[];
    edges: any[];
    metrics?: {
      communities?: Record<string, number>;
      pageRank?: Record<string, number>;
    };
    layout: {
      algorithm: string;
      computed: boolean;
    };
  };
  cached: boolean;
  error?: string;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<GraphPayload>> {
  console.log(
    "🌐 API /api/atlas/graph-payload: Request received (public access)"
  );

  try {
    const { searchParams } = new URL(request.url);

    const viewMode = searchParams.get("viewMode") || "full-atlas";
    const centerEntity = searchParams.get("centerEntity");
    const hops = parseInt(searchParams.get("hops") || "2");
    const limit = parseInt(searchParams.get("limit") || "500");
    const communityId = searchParams.get("communityId")
      ? parseInt(searchParams.get("communityId")!)
      : undefined;

    console.log("🔍 API: Request parameters:", {
      viewMode,
      centerEntity,
      hops,
      limit,
      communityId,
    });

    const client = getGlobalNeo4jClient();

    // Transform results
    let nodes: any[] = [];
    let edges: any[] = [];

    // Build query based on view mode
    let query: string;
    let queryParams: Record<string, any>;

    if (viewMode === "ego" && centerEntity) {
      // Ego network - fetch center + neighbors and their relationships
      query = `
        MATCH path = (center {uid: $entityUid})-[*1..${hops}]-(neighbor)
        WHERE center.name IS NOT NULL 
          AND neighbor.name IS NOT NULL
          AND NOT neighbor:Evidence
          AND NOT neighbor:File
          AND NOT neighbor:Content
        WITH center, neighbor, path
        ORDER BY length(path)
        LIMIT $limit
        
        WITH collect(DISTINCT center) + collect(DISTINCT neighbor) as allNodes
        
        UNWIND allNodes as node
        OPTIONAL MATCH (node)-[r]-(m)
        WHERE m IN allNodes AND m.name IS NOT NULL
        
        WITH allNodes, collect(DISTINCT r) as allRels
        
        RETURN 
          [n IN allNodes | {
            uid: n.uid,
            name: n.name,
            type: coalesce(n.type, labels(n)[0]),
            x: coalesce(n.x, rand() * 1000),
            y: coalesce(n.y, rand() * 1000),
            communityId: n.communityId
          }] as nodeList,
          [rel IN allRels WHERE rel IS NOT NULL | {
            uid: rel.uid,
            type: type(rel),
            source: startNode(rel).uid,
            target: endNode(rel).uid,
            sentiment: rel.sentiment,
            confidence: rel.confidence
          }] as relationshipList
      `;
      queryParams = convertAllNeo4jParams({
        entityUid: centerEntity,
        limit,
      });
    } else if (viewMode === "community" && communityId !== undefined) {
      // Community view - fetch all nodes in community and their relationships
      query = `
        MATCH (n)
        WHERE n.communityId = $communityId
          AND n.name IS NOT NULL 
          AND n.uid IS NOT NULL
          AND NOT n:Evidence
          AND NOT n:File
          AND NOT n:Content
        WITH collect(n) as allNodes LIMIT $limit
        
        UNWIND allNodes as node
        OPTIONAL MATCH (node)-[r]-(m)
        WHERE m IN allNodes AND m.name IS NOT NULL
        
        WITH allNodes, collect(DISTINCT r) as allRels
        
        RETURN 
          [n IN allNodes | {
            uid: n.uid,
            name: n.name,
            type: coalesce(n.type, labels(n)[0]),
            x: coalesce(n.x, rand() * 1000),
            y: coalesce(n.y, rand() * 1000),
            communityId: n.communityId
          }] as nodeList,
          [rel IN allRels WHERE rel IS NOT NULL | {
            uid: rel.uid,
            type: type(rel),
            source: startNode(rel).uid,
            target: endNode(rel).uid,
            sentiment: rel.sentiment,
            confidence: rel.confidence
          }] as relationshipList
      `;
      queryParams = convertAllNeo4jParams({
        communityId,
        limit,
      });
    } else {
      // Full atlas - use two-query pattern (proven working from v2 endpoint)
      // Check what labels exist first
      const labelCheckQuery = `CALL db.labels() YIELD label RETURN collect(label) as labels`;
      const labelResult = await client.executeRead(labelCheckQuery, {});
      const allLabels = labelResult.records[0]?.get("labels") || [];
      console.log(`🔍 API: All labels in database:`, allLabels);

      // Check entity count by label
      const countQuery = `MATCH (n) WHERE n.uid IS NOT NULL RETURN labels(n) as nodeLabels, count(n) as count`;
      const countResult = await client.executeRead(countQuery, {});
      console.log(
        `🔍 API: Node counts by label:`,
        countResult.records.map((r: any) => ({
          labels: r.get("nodeLabels"),
          count: r.get("count")?.toInt?.() || r.get("count"),
        }))
      );

      // Query 1: Get all nodes (don't filter by :Entity label - use uid instead)
      const nodesQuery = `
        MATCH (n)
        WHERE n.uid IS NOT NULL
          AND n.name IS NOT NULL
          AND NOT n:Evidence
          AND NOT n:File
          AND NOT n:Content
        RETURN
          n.uid as uid,
          n.name as name,
          labels(n) as nodeLabels,
          coalesce(n.type, labels(n)[0]) as type,
          coalesce(n.x, rand() * 1000) as x,
          coalesce(n.y, rand() * 1000) as y,
          n.communityId as communityId,
          coalesce(n.degree_total, 0) as degree_total
        ORDER BY coalesce(n.degree_total, 0) DESC
        LIMIT $limit
      `;

      const nodesResult = await client.executeRead(
        nodesQuery,
        convertAllNeo4jParams({ limit })
      );
      nodes = nodesResult.records.map((record: any) => {
        const labels = record.get("nodeLabels") || [];
        const typeValue = record.get("type");
        const degreeRaw = record.get("degree_total");
        return {
          uid: record.get("uid"),
          name: record.get("name"),
          type:
            typeValue?.toLowerCase() || labels[0]?.toLowerCase() || "unknown",
          x: record.get("x"),
          y: record.get("y"),
          communityId: record.get("communityId"),
          degree_total:
            typeof degreeRaw === "number"
              ? degreeRaw
              : (degreeRaw?.toInt?.() ?? 0),
        };
      });

      console.log(`🔍 API: Query 1 fetched ${nodes.length} nodes`);
      console.log(
        `🔍 API: Sample node UIDs:`,
        nodes.slice(0, 3).map((n) => n.uid)
      );

      // Query 2: Get all relationships between those nodes
      if (nodes.length > 0) {
        const nodeUids = nodes.map((n) => n.uid);

        // Check total relationships in DB
        const checkQuery = `MATCH ()-[r]->() RETURN count(r) as total`;
        const checkResult = await client.executeRead(checkQuery, {});
        const totalRelsRaw = checkResult.records[0]?.get("total");
        const totalRels =
          typeof totalRelsRaw === "number"
            ? totalRelsRaw
            : totalRelsRaw?.toInt?.() || 0;
        console.log(`🔍 API: Total relationships in database: ${totalRels}`);

        const edgesQuery = `
          MATCH (source)-[r]->(target)
          WHERE source.uid IN $nodeUids 
            AND target.uid IN $nodeUids
          RETURN DISTINCT
            r.uid as uid,
            type(r) as type,
            source.uid as source,
            target.uid as target,
            r.sentiment as sentiment,
            r.confidence as confidence
          LIMIT $edgeLimit
        `;

        console.log(
          `🔍 API: Searching edges between ${nodeUids.length} node UIDs`
        );
        const edgesResult = await client.executeRead(
          edgesQuery,
          convertAllNeo4jParams({
            nodeUids,
            edgeLimit: limit * 3,
          })
        );

        console.log(
          `🔍 API: Edge query returned ${edgesResult.records.length} records`
        );

        edges = edgesResult.records.map((record: any) => {
          const relType = record.get("type");
          const sentiment = record.get("sentiment") || "neutral";

          // Create display-ready edge
          return {
            uid: record.get("uid"),
            type: relType,
            source: record.get("source"),
            target: record.get("target"),
            sentiment,
            confidence: record.get("confidence") || 0.8,
            display: {
              label: relType?.replace(/_/g, " ").toLowerCase() || "related",
              color:
                sentiment === "hostile"
                  ? "#ff4444"
                  : sentiment === "supportive"
                    ? "#44ff44"
                    : "#666666",
            },
            metadata: {
              confidence: record.get("confidence") || 0.8,
            },
          };
        });

        console.log(`🔍 API: Query 2 fetched ${edges.length} edges`);

        if (edges.length === 0 && totalRels > 0) {
          console.error(
            `❌ API: ${totalRels} relationships exist but 0 match our node UIDs`
          );
          // Sample a few relationships to see their structure
          const sampleQuery = `MATCH (s)-[r]->(t) RETURN s.uid as suid, t.uid as tuid, type(r) as rtype LIMIT 3`;
          const sampleResult = await client.executeRead(sampleQuery, {});
          console.log(
            `🔍 API: Sample relationships:`,
            sampleResult.records.map((rec: any) => ({
              source: rec.get("suid"),
              target: rec.get("tuid"),
              type: rec.get("rtype"),
            }))
          );
        }
      }

      // Skip the normal query/transform flow since we already have data
      console.log("📊 API: Two-query pattern complete:", {
        nodeCount: nodes.length,
        edgeCount: edges.length,
      });

      return NextResponse.json({
        success: true,
        data: {
          nodes,
          edges,
          layout: { algorithm: "neo4j-positions", computed: true },
        },
        cached: false,
      });
    }

    console.log("🔍 API: Executing Neo4j query with params:", queryParams);
    const result = await client.executeRead(query, queryParams);
    console.log(
      "✅ API: Query executed, processing",
      result.records.length,
      "records"
    );

    // Transform results for ego/community view modes (single record pattern)
    if (result.records.length > 0) {
      const record = result.records[0];
      nodes = record.get("nodeList") || [];
      edges = record.get("relationshipList") || [];

      console.log("🔍 API: Extracted from query result:", {
        viewMode,
        recordCount: result.records.length,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        sampleNode: nodes[0],
        sampleEdge: edges[0],
      });
    } else {
      console.warn("⚠️ API: Query returned no records");
    }

    console.log("📊 API: Transformed data:", {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      hasLayout: nodes.some((n) => n.x !== null && n.y !== null),
    });

    const response = {
      success: true,
      data: {
        nodes,
        edges,
        layout: {
          algorithm: "neo4j-positions",
          computed: nodes.some((n) => n.x !== null && n.y !== null),
        },
      },
      cached: false,
    };

    console.log("✅ API: Sending successful response");
    return NextResponse.json(response, {
      headers: {
        // Aggressive caching for public data
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("❌ API: Graph payload error:", error);
    console.error(
      "❌ API: Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );

    return NextResponse.json(
      {
        success: false,
        cached: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
