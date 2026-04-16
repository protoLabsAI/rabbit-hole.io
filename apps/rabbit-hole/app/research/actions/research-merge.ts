"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getGlobalNeo4jClient } from "@protolabsai/database";
import { logger } from "@protolabsai/logger";
import { convertAllNeo4jParams } from "@protolabsai/utils";

import type { ResearchBundle } from "../lib/bundle-validator";

import type { ActionResult } from "./types";

// Zod schema for validation
const EntitySchema = z.object({
  uid: z.string(),
  name: z.string(),
  type: z.string(),
  properties: z.record(z.string(), z.any()).optional(),
  tags: z.array(z.string()).optional(),
  aliases: z.array(z.string()).optional(),
});

const RelationshipSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.string(),
  properties: z.record(z.string(), z.any()).optional(),
});

const MergeBundleSchema = z.object({
  entities: z.array(EntitySchema),
  relationships: z.array(RelationshipSchema),
  metadata: z
    .object({
      version: z.string(),
      createdAt: z.string(),
      sessionId: z.string().optional(),
      sessionName: z.string().optional(),
      userId: z.string().optional(),
    })
    .optional(),
});

export interface MergeResults {
  totalCreated: number;
  totalUpdated: number;
  totalSkipped: number;
  entities: {
    created: number;
    updated: number;
    skipped: number;
  };
  relationships: {
    created: number;
    updated: number;
    skipped: number;
  };
}

/**
 * Merge Research Bundle to Neo4j
 *
 * Takes a validated research bundle and merges entities and relationships
 * into the Neo4j knowledge graph with proper ID mapping and progress tracking.
 */
export async function mergeResearchToNeo4j(bundle: ResearchBundle): Promise<
  ActionResult<{
    results: MergeResults;
    idMapping: Record<string, string>;
  }>
> {
  try {
    // Auth check
    const userId = "local-user";
    if (!userId) {
      return {
        error: "Unauthorized",
        status: 401,
      };
    }

    // Validate input
    const parsed = MergeBundleSchema.safeParse(bundle);
    if (!parsed.success) {
      return {
        error:
          "Invalid bundle format: " +
          parsed.error.issues.map((e) => e.message).join(", "),
        status: 400,
      };
    }

    const { entities, relationships } = parsed.data;

    if (!entities || !relationships) {
      return {
        error: "Bundle must contain entities and relationships",
        status: 400,
      };
    }

    logger.info(
      {
        userId,
        entityCount: entities.length,
        relationshipCount: relationships.length,
      },
      "Starting research merge to Neo4j"
    );

    const client = getGlobalNeo4jClient();
    const idMapping: Record<string, string> = {};
    let entitiesCreated = 0;
    let entitiesUpdated = 0;
    let entitiesSkipped = 0;
    let relationshipsCreated = 0;
    let relationshipsUpdated = 0;
    let relationshipsSkipped = 0;

    // Merge entities
    for (const entity of entities) {
      try {
        const query = `
          MERGE (n:Entity:${entity.type} {uid: $uid})
          ON CREATE SET
            n.name = $name,
            n.type = $type,
            n.createdAt = timestamp(),
            n.updatedAt = timestamp(),
            n.createdBy = $userId,
            n += $properties
          ON MATCH SET
            n.name = $name,
            n.updatedAt = timestamp(),
            n.lastModifiedBy = $userId,
            n += $properties
          RETURN n.uid as uid, 
                 CASE WHEN n.createdAt = n.updatedAt THEN 'created' ELSE 'updated' END as action
        `;

        // Generate real UID for temp IDs
        const realUid = entity.uid.startsWith("temp-")
          ? `${entity.type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          : entity.uid;

        const params = convertAllNeo4jParams({
          uid: realUid,
          name: entity.name,
          type: entity.type,
          userId,
          properties: {
            ...(entity.properties || {}),
            tags: entity.tags || [],
            aliases: entity.aliases || [],
          },
        });

        const result = await client.executeWrite(query, params);

        if (result && result.records && result.records.length > 0) {
          const record = result.records[0];
          const returnedUid = record.get("uid");
          const action = record.get("action");

          // Map temp ID to real ID
          if (entity.uid !== returnedUid) {
            idMapping[entity.uid] = returnedUid;
          }

          if (action === "created") {
            entitiesCreated++;
          } else {
            entitiesUpdated++;
          }
        } else {
          entitiesSkipped++;
        }
      } catch (error) {
        logger.error({ error, entity: entity.uid }, "Failed to merge entity");
        entitiesSkipped++;
      }
    }

    // Merge relationships (with ID mapping)
    for (const relationship of relationships) {
      try {
        // Apply ID mapping
        const sourceUid = idMapping[relationship.source] || relationship.source;
        const targetUid = idMapping[relationship.target] || relationship.target;

        const query = `
          MATCH (source:Entity {uid: $sourceUid})
          MATCH (target:Entity {uid: $targetUid})
          MERGE (source)-[r:${relationship.type}]->(target)
          ON CREATE SET
            r.createdAt = timestamp(),
            r.createdBy = $userId,
            r += $properties
          ON MATCH SET
            r.updatedAt = timestamp(),
            r.lastModifiedBy = $userId,
            r += $properties
          RETURN r, 
                 CASE WHEN r.createdAt IS NULL OR r.createdAt = r.updatedAt THEN 'created' ELSE 'updated' END as action
        `;

        const params = convertAllNeo4jParams({
          sourceUid,
          targetUid,
          userId,
          properties: relationship.properties || {},
        });

        const result = await client.executeWrite(query, params);

        if (result && result.records && result.records.length > 0) {
          const action = result.records[0].get("action");
          if (action === "created") {
            relationshipsCreated++;
          } else {
            relationshipsUpdated++;
          }
        } else {
          relationshipsSkipped++;
        }
      } catch (error) {
        logger.error(
          {
            error,
            relationship: `${relationship.source} -> ${relationship.target}`,
          },
          "Failed to merge relationship"
        );
        relationshipsSkipped++;
      }
    }

    const results: MergeResults = {
      totalCreated: entitiesCreated + relationshipsCreated,
      totalUpdated: entitiesUpdated + relationshipsUpdated,
      totalSkipped: entitiesSkipped + relationshipsSkipped,
      entities: {
        created: entitiesCreated,
        updated: entitiesUpdated,
        skipped: entitiesSkipped,
      },
      relationships: {
        created: relationshipsCreated,
        updated: relationshipsUpdated,
        skipped: relationshipsSkipped,
      },
    };

    logger.info(
      {
        userId,
        results,
        idMappingCount: Object.keys(idMapping).length,
      },
      "Research merge completed"
    );

    // Revalidate pages that show graph data
    revalidatePath("/atlas");
    revalidatePath("/research");

    return {
      data: {
        results,
        idMapping,
      },
      status: 200,
    };
  } catch (error) {
    logger.error({ error }, "Research merge failed");
    return {
      error: "Failed to merge research data",
      status: 500,
    };
  }
}
