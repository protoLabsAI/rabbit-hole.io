/**
 * Relationship Delete API - Safe Relationship Removal
 *
 * Handles deletion of specific relationships in the knowledge graph
 */

import { NextRequest, NextResponse } from "next/server";

import { getGlobalNeo4jClient } from "@protolabsai/database";

import { requireSuperAdmin, unauthorizedResponse } from "@/lib/auth-guards";

interface RelationshipDeleteRequest {
  relationshipId?: string;
  sourceEntityId?: string;
  targetEntityId?: string;
  relationshipType?: string;
}

interface RelationshipDeleteResponse {
  success: boolean;
  deletedRelationships?: number;
  deletedRelationship?: any;
  error?: string;
  details?: {
    searchCriteria: any;
    relationshipsFound: number;
  };
}

export async function DELETE(
  request: NextRequest
): Promise<NextResponse<RelationshipDeleteResponse>> {
  // Check super admin role
  const auth = await requireSuperAdmin(request);
  if (!auth.authorized) {
    return unauthorizedResponse(auth);
  }

  try {
    console.log(
      `🔗 Relationship delete request from super admin: ${auth.user.id}`
    );

    const body: RelationshipDeleteRequest = await request.json();
    const { relationshipId, sourceEntityId, targetEntityId, relationshipType } =
      body;

    // Validate input - need either relationship ID or source+target
    if (!relationshipId && (!sourceEntityId || !targetEntityId)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Either relationshipId OR both sourceEntityId and targetEntityId are required",
        },
        { status: 400 }
      );
    }

    console.log(`🗑️ Deleting relationship(s):`, {
      relationshipId,
      sourceEntityId,
      targetEntityId,
      relationshipType,
    });

    const client = getGlobalNeo4jClient();

    try {
      let deleteQuery: string;
      let queryParams: any;
      let logDescription: string;

      if (relationshipId) {
        // Delete by relationship UID
        deleteQuery = `
          MATCH ()-[r {uid: $relationshipId}]-()
          WITH r, startNode(r) as source, endNode(r) as target, type(r) as relType, properties(r) as relProps
          DELETE r
          RETURN count(r) as deletedCount, 
                 {uid: relProps.uid, type: relType, source: source.uid, target: target.uid} as deletedRelationship
        `;
        queryParams = { relationshipId };
        logDescription = `relationship ${relationshipId}`;
      } else {
        // Delete by source + target + optional type
        if (relationshipType) {
          deleteQuery = `
            MATCH (source {uid: $sourceId})-[r:${relationshipType}]->(target {uid: $targetId})
            WITH r, properties(r) as relProps
            DELETE r
            RETURN count(r) as deletedCount,
                   {uid: relProps.uid, type: '${relationshipType}', source: $sourceId, target: $targetId} as deletedRelationship
          `;
        } else {
          deleteQuery = `
            MATCH (source {uid: $sourceId})-[r]->(target {uid: $targetId})
            WITH r, type(r) as relType, properties(r) as relProps
            DELETE r
            RETURN count(r) as deletedCount,
                   {uid: relProps.uid, type: relType, source: $sourceId, target: $targetId} as deletedRelationship
          `;
        }

        queryParams = {
          sourceId: sourceEntityId,
          targetId: targetEntityId,
        };
        logDescription = `relationships from ${sourceEntityId} to ${targetEntityId}${relationshipType ? ` (type: ${relationshipType})` : ""}`;
      }

      console.log(`🔍 Searching for ${logDescription}...`);

      const deleteResult = await client.executeWrite(deleteQuery, queryParams);

      if (deleteResult.records.length === 0) {
        return NextResponse.json(
          { success: false, error: "No relationships found to delete" },
          { status: 404 }
        );
      }

      const record = deleteResult.records[0];
      const deletedCountRaw = record.get("deletedCount");
      const deletedCount =
        typeof deletedCountRaw === "number"
          ? deletedCountRaw
          : (deletedCountRaw?.toNumber?.() ?? 0);

      const deletedRelationship = record.get("deletedRelationship");

      if (deletedCount === 0) {
        return NextResponse.json(
          { success: false, error: "No relationships matched the criteria" },
          { status: 404 }
        );
      }

      console.log(`✅ Relationship deletion completed successfully`);
      console.log(`   • Relationships deleted: ${deletedCount}`);
      console.log(`   • Criteria: ${logDescription}`);

      return NextResponse.json({
        success: true,
        deletedRelationships: deletedCount,
        deletedRelationship:
          deletedCount === 1 ? deletedRelationship : undefined,
        details: {
          searchCriteria: {
            relationshipId,
            sourceEntityId,
            targetEntityId,
            relationshipType,
          },
          relationshipsFound: deletedCount,
        },
      });
    } finally {
      // No session cleanup needed - @protolabsai/database handles connection management
    }
  } catch (error) {
    console.error("❌ Relationship deletion failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Relationship deletion failed",
      },
      { status: 500 }
    );
  }
}
