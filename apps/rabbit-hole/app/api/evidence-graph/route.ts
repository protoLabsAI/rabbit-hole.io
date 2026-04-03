/**
 * Evidence Graph Data API
 *
 * Provides graph data from the best available backend (Neo4j or partitions)
 * for client-side consumption since browsers can't connect to Neo4j directly.
 */

import { NextRequest, NextResponse } from "next/server";

import { convertAllNeo4jParams } from "@proto/utils";

// Dynamic import to avoid Turbopack issues with require()
const resolveTenantFromHeaders = async (request: any) => {
  const { resolveTenantFromHeaders: resolver } = await import(
    "@proto/utils/tenancy-server"
  );
  return resolver(request);
};

import { Neo4jService } from "../../evidence/services/Neo4jService";
import type { EvidenceGraphData } from "../../evidence/types/evidence-graph.types";

interface GraphRequest {
  entityTypes?: string[];
  edgeTypes?: string[];
  focusNodes?: string[];
  expandRadius?: number;
  maxNodes?: number;
  includeEvidence?: boolean;
  includeTestData?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const options: GraphRequest = {
      entityTypes: searchParams.get("entityTypes")?.split(","),
      focusNodes: searchParams.get("focusNodes")?.split(","),
      expandRadius: searchParams.get("expandRadius")
        ? parseInt(searchParams.get("expandRadius")!)
        : 2,
      maxNodes: searchParams.get("maxNodes")
        ? parseInt(searchParams.get("maxNodes")!)
        : 2000,
      includeEvidence: searchParams.get("includeEvidence") !== "false",
      includeTestData: searchParams.get("includeTestData") !== "false",
    };

    console.log("📊 Loading graph data via API with options:", options);

    // Try Neo4j first
    let backend: "neo4j" | "partitions" = "partitions";

    const neo4jService = new Neo4jService({
      uri: process.env.NEO4J_URI || "bolt://localhost:7687",
      username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || "neo4j",
      password: process.env.NEO4J_PASSWORD || "",
      database: process.env.NEO4J_DATABASE || "neo4j",
    });

    await neo4jService.connect();

    // Get all data from Neo4j (simplified approach to avoid query issues)
    const graphData = await getAllDataFromNeo4j(neo4jService, options);

    await neo4jService.disconnect();
    backend = "neo4j";

    console.log(
      `✅ Loaded from Neo4j: ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`
    );

    // Filter test data if requested
    if (!options.includeTestData) {
      graphData.nodes = graphData.nodes.filter(
        (node) =>
          !node.tags?.includes("TEST_DATA") && !node.label.includes("[TEST]")
      );

      graphData.edges = graphData.edges.filter(
        (edge) =>
          !edge.notes?.includes("Test relationship") &&
          !edge.label?.includes("[TEST]")
      );

      const nodeIds = new Set(graphData.nodes.map((n) => n.id));
      graphData.edges = graphData.edges.filter(
        (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
      );
    }

    return NextResponse.json({
      success: true,
      data: graphData,
      backend,
      meta: {
        backend,
        nodeCount: graphData.nodes.length,
        edgeCount: graphData.edges.length,
        evidenceCount: graphData.evidence.length,
        options,
      },
    });
  } catch (error) {
    console.error("Graph data API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load graph data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function getAllDataFromNeo4j(
  neo4jService: Neo4jService,
  options: GraphRequest
): Promise<EvidenceGraphData> {
  const session = (neo4jService as any).getSession();

  try {
    // Get all nodes
    const nodesResult = await session.run(
      `
      MATCH (n:GraphNode)
      RETURN n
      LIMIT $maxNodes
    `,
      convertAllNeo4jParams({
        maxNodes: options.maxNodes || 2000,
      })
    );

    const nodes = nodesResult.records.map((record: any) => {
      const props = record.get("n").properties;
      return {
        id: props.id,
        label: props.label,
        entityType: props.entityType,
        dates: {
          ...(props.startDate && { start: props.startDate.toString() }),
          ...(props.endDate && { end: props.endDate.toString() }),
        },
        aka: props.aka || [],
        tags: props.tags || [],
        sources: props.evidenceSources || [],
        ...(props.positionX &&
          props.positionY && {
            position: { x: props.positionX, y: props.positionY },
          }),
      };
    });

    // Get all edges
    const edgesResult = await session.run(`
      MATCH ()-[r:RELATES_TO]->()
      RETURN r, startNode(r).id as sourceId, endNode(r).id as targetId
    `);

    const edges = edgesResult.records.map((record: any) => {
      const props = record.get("r").properties;
      return {
        id: props.id,
        source: record.get("sourceId"),
        target: record.get("targetId"),
        label: props.label,
        type: props.type,
        since: props.since?.toString(),
        until: props.until?.toString(),
        confidence: props.confidence,
        notes: props.notes,
        sources: props.evidenceSources || [],
        // Include sentiment data for hate speech visualization
        sentiment: props.sentiment || undefined,
        speech_category: props.speech_category || undefined,
        intensity: props.intensity || undefined,
        target_groups: props.target_groups || undefined,
        text_excerpt: props.text_excerpt || undefined,
      };
    });

    // Get all evidence
    const evidenceResult = await session.run(`
      MATCH (e:Evidence)
      RETURN e
    `);

    const evidence = evidenceResult.records.map((record: any) => {
      const props = record.get("e").properties;
      return {
        id: props.id,
        title: props.title,
        date: props.date.toString(),
        publisher: props.publisher,
        url: props.url,
        type: props.type,
        notes: props.notes,
      };
    });

    return {
      meta: {
        version: "1.0.0",
        generated_at: new Date().toISOString(),
        description: `Neo4j graph data: ${nodes.length} nodes, ${edges.length} edges, ${evidence.length} evidence`,
      },
      evidence,
      nodes,
      edges,
    };
  } finally {
    await session.close();
  }
}
