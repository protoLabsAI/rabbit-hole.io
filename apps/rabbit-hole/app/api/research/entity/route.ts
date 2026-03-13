/**
 * Universal Entity Research Agent API Endpoint
 *
 * Handles entity research requests for any entity type (Person, Organization,
 * Platform, Movement, Event) using the unified entity research workflow.
 *
 * TODO: Add public + tenant data isolation
 * - Import: resolveTenantFromHeaders, buildPublicTenantFilter from @proto/utils
 * - Add tenant resolution before queries
 * - Add WHERE clauses with buildPublicTenantFilter() to all Neo4j queries
 * - Add orgId parameter to all query executions
 * See: docs/developer/PUBLIC_TENANT_ISOLATION_GUIDE.md
 */

import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import {
  enforceEntityLimit,
  getUserTier,
  getTierLimits,
  TierLimitError,
} from "@proto/auth";
import { getEntityCount } from "@proto/database";
import { entityResearchTool } from "@proto/llm-tools";
import type {
  EntityResearchInput,
  EntityResearchOutput,
  ResearchableEntityType,
  EntityResearchDepth,
  EntityResearchFocus,
  EntityResearchSource,
} from "@proto/types";
import { RESEARCH_LIMITS } from "@proto/types";
import { getKnowledgeGraphContext } from "@proto/utils";

export async function POST(request: NextRequest) {
  // Check authentication
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication required to perform entity research",
      },
      { status: 401 }
    );
  }

  // Get organization ID and user for tier enforcement
  const clerkOrgId = orgId || request.headers.get("x-clerk-org-id") || "public";
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  // ENFORCE ENTITY LIMIT BEFORE RESEARCH
  try {
    await enforceEntityLimit(user, clerkOrgId);
  } catch (error) {
    if (error instanceof TierLimitError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          limitType: error.limitType,
          currentValue: error.currentValue,
          maxValue: error.maxValue,
          tier: error.tier,
          upgradeUrl: "/pricing",
        },
        { status: 402 } // Payment Required
      );
    }
    throw error;
  }

  /**
   * Extract readable name from entity ID
   * Converts "org:tesla_inc" to "Tesla Inc"
   */
  function extractNameFromEntityId(entityId: string): string {
    // Remove prefix (per:, org:, etc.)
    const namePart = entityId.split(":")[1] || entityId;

    // Convert underscores to spaces and capitalize each word
    return namePart
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  try {
    console.log(
      `🔍 Entity research request from authenticated user: ${userId}`
    );
    const body = (await request.json()) as {
      targetEntityName: string;
      entityType?: ResearchableEntityType; // Optional - will be auto-detected
      existingEntities?: any[];
      existingRelationships?: any[];
      researchDepth?: EntityResearchDepth;
      focusAreas?: EntityResearchFocus[];
      rawData?: EntityResearchSource[];
      dataSourceConfig?: Record<string, any>;
      _cascadeChain?: string[]; // Track cascade research chain to prevent loops
    };

    const {
      targetEntityName,
      entityType,
      existingEntities,
      existingRelationships,
      researchDepth = "detailed",
      focusAreas = ["biographical", "business", "relationships"],
      rawData = [] as EntityResearchSource[],
      dataSourceConfig = { userProvided: { enabled: true } },
      _cascadeChain = [],
    } = body;

    // Prevent infinite cascade loops and excessive depth
    const MAX_CASCADE_DEPTH = RESEARCH_LIMITS.MAX_CASCADE_DEPTH;

    if (_cascadeChain.includes(targetEntityName)) {
      console.log(
        `⚠️ Cascade loop detected for: ${targetEntityName}. Chain: ${_cascadeChain.join(
          " → "
        )}`
      );
      return NextResponse.json(
        {
          success: false,
          error: `Cascade loop prevented for ${targetEntityName}`,
          cascadeChain: _cascadeChain,
        },
        { status: 400 }
      );
    }

    if (_cascadeChain.length >= MAX_CASCADE_DEPTH) {
      console.log(
        `⚠️ Maximum cascade depth reached for: ${targetEntityName}. Chain: ${_cascadeChain.join(
          " → "
        )}`
      );
      return NextResponse.json(
        {
          success: false,
          error: `Maximum cascade depth (${MAX_CASCADE_DEPTH}) reached for ${targetEntityName}`,
          cascadeChain: _cascadeChain,
        },
        { status: 400 }
      );
    }

    console.log(
      `🔬 Entity research request for: ${targetEntityName}${
        _cascadeChain.length > 0
          ? ` (cascade from: ${_cascadeChain.join(" → ")})`
          : ""
      }`
    );
    console.log(
      `📋 Entity type: ${
        entityType || "auto-detect"
      }, Depth: ${researchDepth}, Focus: ${focusAreas.join(", ")}`
    );

    // Auto-fetch knowledge graph context if not provided
    let finalEntities = existingEntities || [];
    let finalRelationships = existingRelationships || [];

    if (!existingEntities || !existingRelationships) {
      console.log("🔄 Auto-fetching knowledge graph context...");
      try {
        const graphContext = await getKnowledgeGraphContext();
        finalEntities = existingEntities || graphContext.personEntities || []; // Fallback to person entities if available
        finalRelationships =
          existingRelationships || graphContext.relationships || [];
        console.log(
          `📊 Auto-fetched: ${finalEntities.length} entities, ${finalRelationships.length} relationships`
        );
      } catch (error) {
        console.warn("⚠️ Could not fetch knowledge graph context:", error);
        // Continue without context
      }
    }

    // Handle automatic Wikipedia research if no rawData provided
    if (rawData.length === 0) {
      console.log(
        `📚 No raw data provided for ${targetEntityName} - will auto-fetch from Wikipedia`
      );
    }

    console.log(
      `📊 Knowledge graph context: ${finalEntities.length} entities, ${finalRelationships.length} relationships`
    );
    console.log(`📄 Raw data sources: ${rawData.length}`);

    // Prepare entity research input
    const researchInput: EntityResearchInput = {
      targetEntityName,
      entityType,
      researchDepth,
      focusAreas,
      rawData,
      existingEntities: finalEntities,
      existingRelationships: finalRelationships,
      dataSourceConfig,
    };

    // Use the unified entity research workflow
    console.log(
      `🚀 Invoking universal entity research workflow for: ${targetEntityName}`
    );

    const workflowResult = (await entityResearchTool.invoke(
      researchInput
    )) as EntityResearchOutput;

    if (!workflowResult.success) {
      console.error(
        `❌ Entity research failed for ${targetEntityName}:`,
        workflowResult.metadata?.warnings
      );
      return NextResponse.json(
        {
          success: false,
          error: `Entity research failed: ${
            (workflowResult.metadata?.warnings || []).join("; ") ||
            "Unknown error"
          }`,
          targetEntityName,
          detectedEntityType: workflowResult.detectedEntityType,
          entities: [],
          relationships: [],
          evidence: [],
          metadata: workflowResult.metadata,
        },
        { status: 500 }
      );
    }

    console.log(
      `✅ Entity research workflow completed successfully for: ${targetEntityName}`
    );
    console.log(
      `📊 Generated: ${workflowResult.entities.length} entities, ${workflowResult.relationships.length} relationships, ${workflowResult.evidence.length} evidence`
    );

    // CHECK IF RESULTS WOULD EXCEED LIMIT
    const currentCount = await getEntityCount(clerkOrgId);
    const tier = getUserTier(user);
    const limits = getTierLimits(tier);
    const totalNewEntities = workflowResult.entities.length;

    if (
      limits.maxEntities !== -1 &&
      currentCount + totalNewEntities > limits.maxEntities
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Research would create ${totalNewEntities} entities, exceeding your ${tier} tier limit of ${limits.maxEntities}. Current usage: ${currentCount}/${limits.maxEntities}.`,
          limitType: "entities",
          currentValue: currentCount,
          maxValue: limits.maxEntities,
          tier,
          upgradeUrl: "/pricing",
          previewData: {
            entitiesGenerated: totalNewEntities,
            relationshipsGenerated: workflowResult.relationships.length,
          },
        },
        { status: 402 }
      );
    }

    // Format response for compatibility with existing systems
    const response = {
      success: true,
      targetEntityName: workflowResult.targetEntityName,
      detectedEntityType: workflowResult.detectedEntityType,

      // Rabbit Hole Bundle Format
      entities: workflowResult.entities,
      relationships: workflowResult.relationships,
      evidence: workflowResult.evidence,
      content: workflowResult.content || [],

      // Research metadata
      metadata: {
        ...workflowResult.metadata,
        cascadeChain: _cascadeChain,
        apiVersion: "2.0",
        timestamp: new Date().toISOString(),
        entityTypes: workflowResult.entities.map((e) => e.type),
        relationshipTypes: workflowResult.relationships.map((r) => r.type),
      },

      // Additional entity research specific data
      researchSummary: {
        entitiesGenerated: workflowResult.entities.length,
        relationshipsDiscovered: workflowResult.relationships.length,
        evidenceSourcesUsed: workflowResult.evidence.length,
        confidenceScore: workflowResult.metadata?.confidenceScore || 0,
        completenessScore:
          1 -
          ((workflowResult.metadata?.dataGaps as string[] | undefined)
            ?.length || 0) /
            10, // Simple completeness metric
        processingTimeMs: workflowResult.metadata?.processingTime || 0,
        researchMethod: workflowResult.metadata?.researchMethod || "unknown",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`❌ Entity research API error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: `Entity research request failed: ${error}`,
        timestamp: new Date().toISOString(),
        apiVersion: "2.0",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      agent: "Universal Entity Research Agent",
      description:
        "AI-powered entity research for all entity types with Rabbit Hole schema compatibility",
      version: "2.0",
      status: "ready",
      capabilities: [
        "Universal entity type research (Person, Organization, Platform, Movement, Event)",
        "Automatic entity type detection from content",
        "AI-powered data extraction using LangExtract service",
        "Rabbit Hole schema compatible output",
        "Relationship discovery and analysis",
        "Evidence source verification and confidence scoring",
        "Knowledge graph integration",
        "Cascade research prevention",
      ],
      supportedEntityTypes: [
        "Person",
        "Organization",
        "Platform",
        "Movement",
        "Event",
      ],
      usage: {
        method: "POST",
        endpoint: "/api/research/entity",
        parameters: {
          targetEntityName: "string (required) - Name of entity to research",
          entityType:
            "ResearchableEntityType (optional) - Type of entity, auto-detected if not provided",
          researchDepth:
            "'basic' | 'detailed' | 'comprehensive' (optional, default: 'detailed')",
          focusAreas: "string[] (optional) - Areas to focus research on",
          rawData: "ResearchSource[] (required) - Raw data sources to analyze",
          existingEntities:
            "Entity[] (optional) - Existing entities for relationship detection",
          existingRelationships:
            "Relationship[] (optional) - Existing relationships for context",
          dataSourceConfig:
            "object (optional) - Configuration for data sources",
        },
      },
      examples: {
        organization: {
          targetEntityName: "Tesla Inc.",
          entityType: "Organization",
          researchDepth: "detailed",
          focusAreas: ["business", "financial", "relationships"],
          rawData: [
            {
              content: "Tesla Inc. is an American electric vehicle company...",
              source: "Company Website",
              sourceType: "corporate_website",
            },
          ],
        },
        platform: {
          targetEntityName: "Twitter",
          researchDepth: "comprehensive",
          focusAreas: ["technological", "business", "social"],
          rawData: [
            {
              content:
                "Twitter is a social media platform acquired by Elon Musk...",
              source: "News Article",
              sourceType: "news_archive",
            },
          ],
        },
        autoDetect: {
          targetEntityName: "January 6 Capitol Attack",
          // No entityType - will auto-detect as Event
          rawData: [
            {
              content: "The January 6, 2021 attack on the Capitol...",
              source: "News Report",
              sourceType: "major_media",
            },
          ],
        },
      },
    },
  });
}
