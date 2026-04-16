/**
 * Research Bundle Merge API
 *
 * POST /api/research/merge
 * Accepts validated bundle, upserts to Neo4j, returns ID mapping
 */

import { NextRequest, NextResponse } from "next/server";

import { getGlobalNeo4jClient } from "@protolabsai/database";
import { convertAllNeo4jParams } from "@protolabsai/utils";

import type { ResearchBundle } from "../../../research/lib/bundle-validator";

interface MergeResult {
  success: boolean;
  results: {
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
  };
  idMapping: Record<string, string>; // temp-id → real-id
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<MergeResult>> {
  try {
    const bundle: ResearchBundle = await request.json();

    if (!bundle.entities || !bundle.relationships) {
      return NextResponse.json(
        {
          success: false,
          results: {
            totalCreated: 0,
            totalUpdated: 0,
            totalSkipped: 0,
            entities: { created: 0, updated: 0, skipped: 0 },
            relationships: { created: 0, updated: 0, skipped: 0 },
          },
          idMapping: {},
          error: "Invalid bundle format",
        },
        { status: 400 }
      );
    }

    const client = getGlobalNeo4jClient();
    const idMapping: Record<string, string> = {};
    let entitiesCreated = 0;
    let entitiesUpdated = 0;
    let entitiesSkipped = 0;
    let relationshipsCreated = 0;
    let relationshipsUpdated = 0;
    let relationshipsSkipped = 0;

    // Merge entities
    for (const entity of bundle.entities) {
      const query = `
        MERGE (n:Entity:${entity.type} {uid: $uid})
        ON CREATE SET
          n.name = $name,
          n.type = $type,
          n.createdAt = timestamp(),
          n.updatedAt = timestamp(),
          n += $properties
        ON MATCH SET
          n.name = $name,
          n.updatedAt = timestamp(),
          n += $properties
        RETURN n.uid as uid, 
               CASE WHEN n.createdAt = n.updatedAt THEN 'created' ELSE 'updated' END as action
      `;

      const params = convertAllNeo4jParams({
        uid: entity.uid.startsWith("temp-")
          ? `${entity.type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          : entity.uid,
        name: entity.name,
        type: entity.type,
        properties: {
          ...(entity.properties || {}),
          tags: entity.tags || [],
          aliases: entity.aliases || [],
        },
      });

      const result = await client.executeWrite(query, params);

      if (result && result.records && result.records.length > 0) {
        const record = result.records[0];
        const realUid = record.get("uid");
        const action = record.get("action");

        // Map temp ID to real ID
        if (entity.uid !== realUid) {
          idMapping[entity.uid] = realUid;
        }

        if (action === "created") {
          entitiesCreated++;
        } else {
          entitiesUpdated++;
        }
      } else {
        entitiesSkipped++;
      }
    }

    // Merge relationships (with ID mapping)
    for (const rel of bundle.relationships) {
      const sourceUid = idMapping[rel.source] || rel.source;
      const targetUid = idMapping[rel.target] || rel.target;
      const relUid = rel.uid.startsWith("temp-")
        ? `${sourceUid}-${rel.type}-${targetUid}`
        : rel.uid;

      const query = `
        MATCH (source:Entity {uid: $sourceUid})
        MATCH (target:Entity {uid: $targetUid})
        MERGE (source)-[r:${rel.type} {uid: $uid}]->(target)
        ON CREATE SET
          r.type = $type,
          r.createdAt = timestamp(),
          r.updatedAt = timestamp(),
          r += $properties
        ON MATCH SET
          r.updatedAt = timestamp(),
          r += $properties
        RETURN r.uid as uid,
               CASE WHEN r.createdAt = r.updatedAt THEN 'created' ELSE 'updated' END as action
      `;

      const params = convertAllNeo4jParams({
        sourceUid,
        targetUid,
        uid: relUid,
        type: rel.type,
        properties: {
          ...(rel.properties || {}),
        },
      });

      const result = await client.executeWrite(query, params);

      if (result && result.records && result.records.length > 0) {
        const record = result.records[0];
        const action = record.get("action");

        if (action === "created") {
          relationshipsCreated++;
        } else {
          relationshipsUpdated++;
        }
      } else {
        relationshipsSkipped++;
      }
    }

    return NextResponse.json({
      success: true,
      results: {
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
      },
      idMapping,
    });
  } catch (error) {
    console.error("Merge API error:", error);
    return NextResponse.json(
      {
        success: false,
        results: {
          totalCreated: 0,
          totalUpdated: 0,
          totalSkipped: 0,
          entities: { created: 0, updated: 0, skipped: 0 },
          relationships: { created: 0, updated: 0, skipped: 0 },
        },
        idMapping: {},
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
