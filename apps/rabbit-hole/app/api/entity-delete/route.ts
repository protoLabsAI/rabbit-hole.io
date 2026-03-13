/**
 * Entity Delete API - Safe Entity Removal
 *
 * Handles deletion of entities with comprehensive relationship cleanup
 */

import { NextRequest, NextResponse } from "next/server";

import { getGlobalNeo4jClient } from "@proto/database";

import { requireSuperAdmin, unauthorizedResponse } from "@/lib/auth-guards";

interface EntityDeleteRequest {
  entityId: string;
  force?: boolean; // If true, deletes even if entity has relationships
}

interface EntityDeleteResponse {
  success: boolean;
  deletedEntity?: any;
  deletedRelationships?: number;
  error?: string;
  details?: {
    entityFound: boolean;
    relationshipCount: number;
    cascadeDeleted: boolean;
  };
}

export async function DELETE(
  request: NextRequest
): Promise<NextResponse<EntityDeleteResponse>> {
  // Check super admin role
  const auth = await requireSuperAdmin(request);
  if (!auth.authorized) {
    return unauthorizedResponse(auth);
  }

  try {
    console.log(`🗑️ Entity delete request from super admin: ${auth.user.id}`);

    const body: EntityDeleteRequest = await request.json();
    const { entityId, force = false } = body;

    if (!entityId) {
      return NextResponse.json(
        { success: false, error: "entityId is required" },
        { status: 400 }
      );
    }

    console.log(`🗑️ Deleting entity: ${entityId} (force: ${force})`);

    const client = getGlobalNeo4jClient();

    try {
      // STEP 1: Check if entity exists and get relationship count
      const checkQuery = `
        MATCH (entity {uid: $entityId})
        OPTIONAL MATCH ( entity: any)-[r]-()
        RETURN entity, count(r) as relationshipCount
      `;

      const checkResult = await client.executeRead(checkQuery, { entityId });

      if (checkResult.records.length === 0) {
        return NextResponse.json(
          { success: false, error: "Entity not found" },
          { status: 404 }
        );
      }

      const record = checkResult.records[0];
      const entity = record.get("entity").properties;
      const relationshipCountRaw = record.get("relationshipCount");
      const relationshipCount =
        typeof relationshipCountRaw === "number"
          ? relationshipCountRaw
          : (relationshipCountRaw?.toNumber?.() ?? 0);

      console.log(
        `📊 Entity "${entity.name}" has ${relationshipCount} relationships`
      );

      // STEP 2: Safety check for entities with relationships
      if (relationshipCount > 0 && !force) {
        return NextResponse.json(
          {
            success: false,
            error: `Entity has ${relationshipCount} relationships. Use force=true to delete anyway.`,
            details: {
              entityFound: true,
              relationshipCount,
              cascadeDeleted: false,
            },
          },
          { status: 409 } // Conflict
        );
      }

      // STEP 3: Delete all relationships first (cascade delete)
      let deletedRelationships = 0;
      if (relationshipCount > 0) {
        console.log(`🔗 Deleting ${relationshipCount} relationships...`);

        const deleteRelationshipsQuery = `
          MATCH (entity {uid: $entityId})-[r]-()
          DELETE r
          RETURN count(r) as deletedCount
        `;

        const deleteRelsResult = await client.executeRead(
          deleteRelationshipsQuery,
          {
            entityId,
          }
        );
        const deletedCountRaw =
          deleteRelsResult.records[0]?.get("deletedCount");
        deletedRelationships =
          typeof deletedCountRaw === "number"
            ? deletedCountRaw
            : (deletedCountRaw?.toNumber?.() ?? 0);

        console.log(`✅ Deleted ${deletedRelationships} relationships`);
      }

      // STEP 4: Delete the entity itself
      console.log(`🗑️ Deleting entity...`);

      const deleteEntityQuery = `
        MATCH (entity {uid: $entityId})
        DELETE entity
        RETURN count( entity: any) as deletedCount
      `;

      const deleteEntityResult = await client.executeRead(deleteEntityQuery, {
        entityId,
      });
      const entityDeletedCountRaw =
        deleteEntityResult.records[0]?.get("deletedCount");
      const entityDeleted =
        typeof entityDeletedCountRaw === "number"
          ? entityDeletedCountRaw
          : (entityDeletedCountRaw?.toNumber?.() ?? 0);

      if (entityDeleted === 0) {
        return NextResponse.json(
          { success: false, error: "Failed to delete entity" },
          { status: 500 }
        );
      }

      console.log(`✅ Entity deletion completed successfully`);
      console.log(`   • Entity removed: ${entity.name}`);
      console.log(`   • Relationships deleted: ${deletedRelationships}`);

      return NextResponse.json({
        success: true,
        deletedEntity: entity,
        deletedRelationships,
        details: {
          entityFound: true,
          relationshipCount,
          cascadeDeleted: relationshipCount > 0,
        },
      });
    } finally {
      // No session cleanup needed - @proto/database handles connection management
    }
  } catch (error) {
    console.error("❌ Entity deletion failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Entity deletion failed",
      },
      { status: 500 }
    );
  }
}
