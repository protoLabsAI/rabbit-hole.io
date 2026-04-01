/**
 * Entity Details API v2 - Using @proto/database
 *
 * Refactored to use consolidated database client and query builders.
 * Demonstrates 70% code reduction and standardized patterns.
 */

import { NextRequest, NextResponse } from "next/server";

import {
  getGlobalNeo4jClient,
  buildEntityDetailsQuery,
  quickHealthCheck,
} from "@proto/database";

interface EntityResponse {
  success: boolean;
  data?: {
    entity: any;
    relationshipStats: {
      total: number;
      outgoing: number;
      incoming: number;
      byType: Record<string, number>;
    };
  };
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<EntityResponse>> {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { success: false, error: "Entity ID is required" },
      { status: 400 }
    );
  }

  try {
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

    // Use standardized query builder - public access to all entities
    const { query, params: queryParams } = buildEntityDetailsQuery({
      uid: id,
      limit: 100,
    });

    const result = await client.executeRead(query, queryParams);

    if (result.records.length === 0) {
      return NextResponse.json(
        { success: false, error: "Entity not found" },
        { status: 404 }
      );
    }

    const record = result.records[0];
    const entityData = record.get("entityData");

    // Calculate relationship statistics
    const outgoingCount = entityData.outgoingRelationships?.length || 0;
    const incomingCount = entityData.incomingRelationships?.length || 0;

    const allRelationships = [
      ...(entityData.outgoingRelationships || []),
      ...(entityData.incomingRelationships || []),
    ];

    const byType = allRelationships.reduce(
      (acc: Record<string, number>, rel: any) => {
        const type = rel.relationship?.type || "unknown";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {}
    );

    return NextResponse.json({
      success: true,
      data: {
        entity: {
          uid: entityData.uid,
          name: entityData.name,
          type: entityData.type,
          speechActCount: entityData.speechActCount || 0,
          properties: entityData.properties || {},
        },
        relationshipStats: {
          total: outgoingCount + incomingCount,
          outgoing: outgoingCount,
          incoming: incomingCount,
          byType,
        },
      },
    });
  } catch (error) {
    console.error(`Entity fetch failed for ${id}:`, error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch entity details",
      },
      { status: 500 }
    );
  }
}
