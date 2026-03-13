/**
 * Geographic Entities API Route
 *
 * Fetch entities with geographic coordinates from Neo4j knowledge graph.
 * Supports bounding box filtering for viewport-based queries.
 */

import { NextRequest, NextResponse } from "next/server";

import { fetchGeographicEntities } from "@/research/components/workspace/canvas/map-data-loader";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse bounding box parameters
    const north = parseFloat(searchParams.get("north") || "90");
    const south = parseFloat(searchParams.get("south") || "-90");
    const east = parseFloat(searchParams.get("east") || "180");
    const west = parseFloat(searchParams.get("west") || "-180");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // Validate bounds
    if (
      north < -90 ||
      north > 90 ||
      south < -90 ||
      south > 90 ||
      east < -180 ||
      east > 180 ||
      west < -180 ||
      west > 180
    ) {
      return NextResponse.json(
        { error: "Invalid bounding box coordinates" },
        { status: 400 }
      );
    }

    if (north <= south) {
      return NextResponse.json(
        { error: "North must be greater than south" },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 1000" },
        { status: 400 }
      );
    }

    // Fetch geographic entities from Neo4j
    const data = await fetchGeographicEntities({
      bounds: { north, south, east, west },
      limit,
    });

    return NextResponse.json({
      success: true,
      data,
      metadata: {
        bounds: { north, south, east, west },
        entityCount: data.entities.length,
        relationshipCount: data.relationships.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching geographic entities:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch geographic entities",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
