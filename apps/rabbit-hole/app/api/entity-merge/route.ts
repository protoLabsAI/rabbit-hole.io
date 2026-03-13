/**
 * Entity Merge API - Smart Entity Deduplication
 *
 * Handles merging of duplicate entities by:
 * 1. Combining properties intelligently
 * 2. Transferring all relationships from source to target
 * 3. Removing the source entity
 * 4. Updating entity references across the system
 */

import { NextRequest, NextResponse } from "next/server";

import { getGlobalNeo4jClient } from "@proto/database";

import { requireSuperAdmin, unauthorizedResponse } from "@/lib/auth-guards";

interface EntityMergeRequest {
  sourceEntityId: string;
  targetEntityId: string;
  mergeStrategy: "smart" | "preserve_target" | "preserve_source";
}

interface EntityMergeResponse {
  success: boolean;
  mergedEntity?: any;
  transferredRelationships?: number;
  error?: string;
  details?: {
    sourceEntity: any;
    targetEntity: any;
    combinedProperties: any;
    relationshipTransfers: number;
    sourceRemoved: boolean;
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<EntityMergeResponse>> {
  // Check super admin role
  const auth = await requireSuperAdmin(request);
  if (!auth.authorized) {
    return unauthorizedResponse(auth);
  }

  try {
    console.log(`🔄 Entity merge request from super admin: ${auth.user.id}`);

    const body: EntityMergeRequest = await request.json();
    const { sourceEntityId, targetEntityId, mergeStrategy = "smart" } = body;

    if (!sourceEntityId || !targetEntityId) {
      return NextResponse.json(
        {
          success: false,
          error: "Both sourceEntityId and targetEntityId are required",
        },
        { status: 400 }
      );
    }

    if (sourceEntityId === targetEntityId) {
      return NextResponse.json(
        { success: false, error: "Cannot merge entity with itself" },
        { status: 400 }
      );
    }

    console.log(
      `🔄 Starting entity merge: ${sourceEntityId} → ${targetEntityId}`
    );

    const client = getGlobalNeo4jClient();

    try {
      // STEP 1: Fetch both entities with their current properties
      console.log("📋 Fetching source and target entities...");

      const fetchQuery = `
        MATCH (source {uid: $sourceId})
        MATCH (target {uid: $targetId})
        RETURN source, target, labels(source) as sourceLabels, labels(target) as targetLabels
      `;

      const fetchResult = await client.executeWrite(fetchQuery, {
        sourceId: sourceEntityId,
        targetId: targetEntityId,
      });

      if (fetchResult.records.length === 0) {
        return NextResponse.json(
          { success: false, error: "One or both entities not found" },
          { status: 404 }
        );
      }

      const record = fetchResult.records[0];
      const sourceEntity = record.get("source").properties;
      const targetEntity = record.get("target").properties;
      const sourceLabels = record.get("sourceLabels");
      const targetLabels = record.get("targetLabels");

      console.log(
        `📊 Source: ${sourceEntity.name} (${sourceLabels.join(", ")})`
      );
      console.log(
        `📊 Target: ${targetEntity.name} (${targetLabels.join(", ")})`
      );

      // STEP 2: Combine properties based on merge strategy (exclude uid!)
      const combinedProperties = combineProperties(
        sourceEntity,
        targetEntity,
        mergeStrategy
      );

      // CRITICAL: Never merge system fields that should remain from target entity
      delete combinedProperties.uid; // Unique identifier must not change
      delete combinedProperties.createdAt; // Keep target's creation time
      delete combinedProperties.updatedAt; // Will be set by Neo4j automatically

      console.log(
        `🔄 Merging properties (excluding system fields): ${Object.keys(combinedProperties).join(", ")}`
      );

      // STEP 3: Update target entity with combined properties
      console.log("📝 Updating target entity with combined properties...");

      const updateQuery = `
        MATCH (target {uid: $targetId})
        SET target += $properties
        SET target.updatedAt = datetime()
        SET target.mergedFrom = COALESCE(target.mergedFrom, []) + [$sourceId]
        RETURN target
      `;

      const updateResult = await client.executeWrite(updateQuery, {
        targetId: targetEntityId,
        sourceId: sourceEntityId,
        properties: combinedProperties,
      });

      const updatedEntity = updateResult.records[0]?.get("target").properties;

      // STEP 4: Transfer all relationships from source to target
      console.log("🔗 Transferring relationships from source to target...");

      // Transfer outgoing relationships
      const transferOutgoingQuery = `
        MATCH (source {uid: $sourceId})-[r]->(other)
        WHERE other.uid <> $targetId
        WITH source, r, other, type(r) as relType, properties(r) as relProps
        MATCH (target {uid: $targetId})
        WHERE NOT EXISTS((target)-[:${""}{relType}]->(other))
        CREATE (target)-[newRel:${""}{relType}]->(other)
        SET newRel = relProps
        SET newRel.transferredFrom = $sourceId
        SET newRel.transferredAt = datetime()
        DELETE r
        RETURN count(newRel) as outgoingTransferred
      `;

      // Transfer incoming relationships
      const transferIncomingQuery = `
        MATCH (other)-[r]->(source {uid: $sourceId})
        WHERE other.uid <> $targetId
        WITH other, r, source, type(r) as relType, properties(r) as relProps
        MATCH (target {uid: $targetId})
        WHERE NOT EXISTS((other)-[:${""}{relType}]->(target))
        CREATE (other)-[newRel:${""}{relType}]->(target)
        SET newRel = relProps
        SET newRel.transferredFrom = $sourceId
        SET newRel.transferredAt = datetime()
        DELETE r
        RETURN count(newRel) as incomingTransferred
      `;

      // Note: Neo4j doesn't support dynamic relationship types in a single query,
      // so we'll do a more complex transfer
      const transferRelationshipsQuery = `
        // Get all outgoing relationships from source
        MATCH (source {uid: $sourceId})-[r]->(other)
        WHERE other.uid <> $targetId
        WITH source, r, other, type(r) as relType, properties(r) as relProps
        MATCH (target {uid: $targetId})
        
        // Create new relationship with same type and properties
        CALL apoc.create.relationship(target, relType, relProps, other) YIELD rel as newRel
        SET newRel.transferredFrom = $sourceId
        SET newRel.transferredAt = datetime()
        DELETE r
        
        RETURN count(*) as outgoingCount
        
        UNION ALL
        
        // Get all incoming relationships to source
        MATCH (other)-[r]->(source {uid: $sourceId})
        WHERE other.uid <> $targetId
        WITH other, r, source, type(r) as relType, properties(r) as relProps
        MATCH (target {uid: $targetId})
        
        // Create new relationship with same type and properties
        CALL apoc.create.relationship(other, relType, relProps, target) YIELD rel as newRel
        SET newRel.transferredFrom = $sourceId  
        SET newRel.transferredAt = datetime()
        DELETE r
        
        RETURN count(*) as incomingCount
      `;

      // Simpler approach - manually transfer each relationship type
      const getRelationshipsQuery = `
        MATCH (source {uid: $sourceId})-[r]-(other)
        WHERE other.uid <> $targetId
        RETURN type(r) as relType, properties(r) as relProps, 
               startNode(r).uid as startUid, endNode(r).uid as endUid,
               id(r) as relId
      `;

      const relationshipsResult = await client.executeWrite(
        getRelationshipsQuery,
        {
          sourceId: sourceEntityId,
          targetId: targetEntityId,
        }
      );

      let transferredCount = 0;

      // Process each relationship individually
      for (const relRecord of relationshipsResult.records) {
        const relType = relRecord.get("relType");
        const relProps = relRecord.get("relProps");
        const startUid = relRecord.get("startUid");
        const endUid = relRecord.get("endUid");

        // Determine direction and create new relationship
        let transferQuery;
        let params;

        if (startUid === sourceEntityId) {
          // Outgoing relationship: source -> other becomes target -> other
          transferQuery = `
            MATCH (target {uid: $targetId})
            MATCH (other {uid: $otherUid})
            WHERE NOT EXISTS((target)-[:${relType}]->(other))
            CREATE (target)-[newRel:${relType}]->(other)
            SET newRel = $relProps
            SET newRel.transferredFrom = $sourceId
            SET newRel.transferredAt = datetime()
            RETURN id(newRel) as newRelId
          `;
          params = {
            targetId: targetEntityId,
            otherUid: endUid,
            sourceId: sourceEntityId,
            relProps: relProps || {},
          };
        } else {
          // Incoming relationship: other -> source becomes other -> target
          transferQuery = `
            MATCH (other {uid: $otherUid})
            MATCH (target {uid: $targetId})
            WHERE NOT EXISTS((other)-[:${relType}]->(target))
            CREATE (other)-[newRel:${relType}]->(target)
            SET newRel = $relProps
            SET newRel.transferredFrom = $sourceId
            SET newRel.transferredAt = datetime()
            RETURN id(newRel) as newRelId
          `;
          params = {
            otherUid: startUid,
            targetId: targetEntityId,
            sourceId: sourceEntityId,
            relProps: relProps || {},
          };
        }

        try {
          const transferResult = await client.executeWrite(
            transferQuery,
            params
          );
          if (transferResult.records.length > 0) {
            transferredCount++;
          }
        } catch (error) {
          console.warn(`Failed to transfer relationship ${relType}:`, error);
        }
      }

      // Delete old relationships
      const deleteOldRelsQuery = `
        MATCH (source {uid: $sourceId})-[r]-()
        DELETE r
        RETURN count(r) as deletedCount
      `;

      await client.executeWrite(deleteOldRelsQuery, {
        sourceId: sourceEntityId,
      });

      console.log(`🔗 Transferred ${transferredCount} relationships`);

      // STEP 5: Remove source entity
      console.log("🗑️ Removing source entity...");

      const deleteSourceQuery = `
        MATCH (source {uid: $sourceId})
        DELETE source
        RETURN count(source) as deletedCount
      `;

      const deleteResult = await client.executeWrite(deleteSourceQuery, {
        sourceId: sourceEntityId,
      });

      // Safe conversion for deletedCount
      const deletedCountRaw = deleteResult.records[0]?.get("deletedCount");
      const deletedCount =
        typeof deletedCountRaw === "number"
          ? deletedCountRaw
          : (deletedCountRaw?.toNumber?.() ?? 0);

      console.log(`✅ Entity merge completed successfully`);
      console.log(
        `   • Combined properties: ${Object.keys(combinedProperties).length} fields`
      );
      console.log(`   • Transferred relationships: ${transferredCount}`);
      console.log(`   • Source entity removed: ${deletedCount > 0}`);

      return NextResponse.json({
        success: true,
        mergedEntity: updatedEntity,
        transferredRelationships: transferredCount,
        details: {
          sourceEntity,
          targetEntity,
          combinedProperties,
          relationshipTransfers: transferredCount,
          sourceRemoved: deletedCount > 0,
        },
      });
    } finally {
      // No session cleanup needed - @proto/database handles connection management
    }
  } catch (error) {
    console.error("❌ Entity merge failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Entity merge failed",
      },
      { status: 500 }
    );
  }
}

/**
 * Combines properties from two entities based on merge strategy
 */
function combineProperties(
  sourceProps: Record<string, any>,
  targetProps: Record<string, any>,
  strategy: "smart" | "preserve_target" | "preserve_source"
): Record<string, any> {
  const combined = { ...targetProps };

  switch (strategy) {
    case "preserve_target":
      // Only add properties that don't exist in target
      for (const [key, value] of Object.entries(sourceProps)) {
        if (!(key in combined) && value !== null && value !== undefined) {
          combined[key] = value;
        }
      }
      break;

    case "preserve_source":
      // Source properties override target
      Object.assign(combined, sourceProps);
      break;

    case "smart":
    default:
      // Intelligent merging based on property types and values
      for (const [key, sourceValue] of Object.entries(sourceProps)) {
        if (sourceValue === null || sourceValue === undefined) continue;

        const targetValue = combined[key];

        if (!targetValue) {
          // Target doesn't have this property, use source
          combined[key] = sourceValue;
        } else if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
          // Merge arrays, removing duplicates
          const merged = [...new Set([...targetValue, ...sourceValue])];
          combined[key] = merged;
        } else if (key === "aliases" && Array.isArray(sourceValue)) {
          // Special handling for aliases - always merge
          const existingAliases = Array.isArray(targetValue)
            ? targetValue
            : [targetValue];
          combined[key] = [...new Set([...existingAliases, ...sourceValue])];
        } else if (key === "tags" && Array.isArray(sourceValue)) {
          // Special handling for tags - always merge
          const existingTags = Array.isArray(targetValue)
            ? targetValue
            : [targetValue];
          combined[key] = [...new Set([...existingTags, ...sourceValue])];
        } else if (
          typeof sourceValue === "string" &&
          typeof targetValue === "string"
        ) {
          // For string properties, prefer longer/more detailed values
          if (sourceValue.length > targetValue.length) {
            combined[key] = sourceValue;
          }
        } else if (typeof sourceValue === "number" && !targetValue) {
          // Use source number if target doesn't have one
          combined[key] = sourceValue;
        }
        // For other cases, keep target value
      }

      // Add merge metadata
      combined.mergedAt = new Date().toISOString();
      combined.mergeStrategy = strategy;
      break;
  }

  return combined;
}
