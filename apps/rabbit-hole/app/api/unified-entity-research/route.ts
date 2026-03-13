/**
 * Unified Entity Research API
 *
 * Consolidates atlas-details, entity, entity-research, and entity-research-agent
 * into a single endpoint using @proto/llm-tools and @proto/database.
 *
 * Reduces 4 endpoints (800+ lines) to 1 endpoint (~100 lines).
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuthAndLogging } from "@proto/auth";
import { getGlobalNeo4jClient, buildEntityDetailsQuery } from "@proto/database";
import { entityResearchTool } from "@proto/llm-tools";
import {
  validateRabbitHoleBundle,
  type EntityResearchInput,
  type EntityResearchOutput,
} from "@proto/types";

interface UnifiedEntityResponse {
  success: boolean;
  data?: {
    entity: any;
    research?: any;
    existingData: boolean;
    source: "database" | "ai_research" | "hybrid";
  };
  error?: string;
}

export const POST = withAuthAndLogging("unified entity research")(async (
  request: NextRequest
): Promise<NextResponse<UnifiedEntityResponse>> => {
  try {
    const input = (await request.json()) as {
      targetEntityName?: string;
      entityUid?: string;
      entityId?: string; // Legacy support
      entityType?: string;
      researchDepth?: "basic" | "detailed" | "comprehensive";
      rawData?: any[];
      skipAIResearch?: boolean;
    };

    // Flexible entity identification
    const identifier =
      input.entityUid || input.entityId || input.targetEntityName;

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: "Entity identifier required" },
        { status: 400 }
      );
    }

    const client = getGlobalNeo4jClient();

    // First, check if entity exists in database
    let existingEntity = null;
    try {
      const { query, params } = buildEntityDetailsQuery({
        uid: input.entityUid,
        id: input.entityId,
        limit: 1,
      });

      const result = await client.executeRead(query, params);
      if (result.records.length > 0) {
        existingEntity = result.records[0].get("entityData");
      }
    } catch (dbError) {
      console.warn(
        "Database lookup failed, proceeding with AI research:",
        dbError
      );
    }

    // If entity exists and no AI research requested, return existing data
    if (existingEntity && input.skipAIResearch) {
      return NextResponse.json({
        success: true,
        data: {
          entity: existingEntity,
          existingData: true,
          source: "database",
        },
      });
    }

    // If no existing entity or AI research requested, use @proto/llm-tools
    if (!existingEntity || !input.skipAIResearch) {
      const researchInput: EntityResearchInput = {
        targetEntityName: input.targetEntityName || identifier,
        entityType: input.entityType as any,
        researchDepth: input.researchDepth || "detailed",
        rawData: input.rawData || [],
        focusAreas: ["biographical", "business", "relationships"],
      };

      try {
        const research = (await entityResearchTool.invoke(
          researchInput
        )) as EntityResearchOutput;

        if (research.success) {
          // Auto-ingest research results if valid
          const bundle = {
            entities: research.entities,
            relationships: research.relationships,
            evidence: research.evidence,
            content: [],
            files: [],
          };

          // Validate before ingesting
          const validation = validateRabbitHoleBundle(bundle);
          if (validation.isValid) {
            // TODO: Integrate with ingest-bundle endpoint
            console.log("✅ Research results validated, ready for ingest");
          }

          return NextResponse.json({
            success: true,
            data: {
              entity: research.entities[0],
              research,
              existingData: !!existingEntity,
              source: existingEntity ? "hybrid" : "ai_research",
            },
          });
        }
      } catch (researchError) {
        console.error("AI research failed:", researchError);

        // Fallback to existing data if available
        if (existingEntity) {
          return NextResponse.json({
            success: true,
            data: {
              entity: existingEntity,
              existingData: true,
              source: "database",
            },
          });
        }
      }
    }

    return NextResponse.json(
      { success: false, error: "Entity not found and research failed" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Unified entity research failed:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
