/**
 * Person Research Agent API Endpoint
 *
 * Handles person entity research requests using the specialized
 * person research agent with knowledge graph context.
 *
 * TEMPORARILY DISABLED - Agent integration needs refactoring
 * See: handoffs/2025-10-11_YOUTUBE_ROUTES_DISABLED.md
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Disabled route with preserved code
/* eslint-disable */

import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { enforceEntityLimit, TierLimitError } from "@proto/auth";
import {
  WikipediaExtraction,
  PersonResearchDepth,
  PersonResearchFocus,
  RESEARCH_LIMITS,
  CONFIDENCE_DEFAULTS,
} from "@proto/types";
import { getKnowledgeGraphContext } from "@proto/utils";

export async function POST(request: NextRequest) {
  // TEMPORARY: Disabled pending agent refactor
  // TODO: Remove this return statement to re-enable
  return NextResponse.json(
    {
      error: "Person research temporarily disabled",
      message: "Agent integration under refactoring",
    },
    { status: 503 }
  );

  // Check authentication
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication required to perform person research",
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
   * Converts "per:hillary_clinton" to "Hillary Clinton"
   */
  function extractNameFromEntityId(entityId: string): string {
    // Remove prefix (per:, org:, etc.)
    const namepart = entityId.split(":")[1] || entityId;

    // Convert underscores to spaces and capitalize each word
    return namepart
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  try {
    console.log(
      `🔍 Person research request from authenticated user: ${userId}`
    );
    const body = (await request.json()) as {
      targetPersonName: string;
      existingPersonEntities?: any[];
      existingRelationships?: any[];
      researchDepth?: PersonResearchDepth;
      focusAreas?: PersonResearchFocus[];
      _cascadeChain?: string[]; // Track cascade research chain to prevent loops
    };
    const {
      targetPersonName,
      existingPersonEntities,
      existingRelationships,
      researchDepth = "detailed",
      focusAreas = ["biographical", "political", "business", "relationships"],
      _cascadeChain = [],
    } = body;

    // Prevent infinite cascade loops and excessive depth
    const MAX_CASCADE_DEPTH = RESEARCH_LIMITS.MAX_CASCADE_DEPTH;

    if (_cascadeChain.includes(targetPersonName)) {
      console.log(
        `⚠️ Cascade loop detected for: ${targetPersonName}. Chain: ${_cascadeChain.join(" → ")}`
      );
      return NextResponse.json(
        {
          success: false,
          error: `Cascade loop prevented for ${targetPersonName}`,
          cascadeChain: _cascadeChain,
        },
        { status: 400 }
      );
    }

    if (_cascadeChain.length >= MAX_CASCADE_DEPTH) {
      console.log(
        `⚠️ Maximum cascade depth reached for: ${targetPersonName}. Chain: ${_cascadeChain.join(" → ")}`
      );
      return NextResponse.json(
        {
          success: false,
          error: `Maximum cascade depth (${MAX_CASCADE_DEPTH}) reached for ${targetPersonName}`,
          cascadeChain: _cascadeChain,
        },
        { status: 400 }
      );
    }

    console.log(
      `🔍 Person research request for: ${targetPersonName}${_cascadeChain.length > 0 ? ` (cascade from: ${_cascadeChain.join(" → ")})` : ""}`
    );

    // Auto-fetch knowledge graph context if not provided
    let finalPersonEntities = existingPersonEntities || [];
    let finalRelationships = existingRelationships || [];

    if (!existingPersonEntities || !existingRelationships) {
      console.log("🔄 Auto-fetching knowledge graph context...");
      const graphContext = await getKnowledgeGraphContext();
      finalPersonEntities =
        existingPersonEntities || graphContext.personEntities;
      finalRelationships = existingRelationships || graphContext.relationships;
      console.log(
        `📊 Auto-fetched: ${finalPersonEntities.length} entities, ${finalRelationships.length} relationships`
      );
    }

    console.log(
      `📊 Knowledge graph context: ${finalPersonEntities.length} entities, ${finalRelationships.length} relationships`
    );

    // Call the actual Wikipedia research tool
    const entityNames = finalPersonEntities.map(
      (e: any) => e.name || e.label || e.id
    );

    // Dynamic import to avoid OpenAI instantiation on module load
    /* DISABLED - agent import
    const { researchPersonEntity } = await import(
      "../../../../agent/src/person-research-agent/tools/person-research"
    );
    */
    const researchPersonEntity = null as any;

    const researchResult = await researchPersonEntity.invoke({
      targetPersonName,
      existingEntities: entityNames,
      focusAreas,
      researchDepth,
    });

    console.log(`✅ Wikipedia research completed for: ${targetPersonName}`);
    console.log(`📚 Research output: ${researchResult.substring(0, 200)}...`);

    // Parse the research result if it contains structured data
    let structuredData: WikipediaExtraction | null = null;
    let createdEntity: any = null;
    const createdRelationships: any[] = [];

    try {
      // Try to extract JSON from the research result
      const jsonMatch = researchResult.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        structuredData = JSON.parse(jsonMatch[1]) as WikipediaExtraction;

        // Auto-create entity in knowledge graph if extraction successful
        if (structuredData?.person) {
          console.log(`🚀 Auto-creating entity: ${structuredData.person.name}`);

          // Map Wikipedia entity to graph mutations format
          const entityForGraph = {
            id: structuredData.person.id,
            label: structuredData.person.name,
            entityType: "person",
            tags: structuredData.person.tags || [
              "wikipedia_sourced",
              "ai_researched",
            ],
            aka: structuredData.person.aliases || [],
            // Include all biographical data as properties
            bio: structuredData.person.bio,
            birthDate: structuredData.person.birthDate,
            birthPlace: structuredData.person.birthPlace,
            nationality: structuredData.person.nationality,
            occupation: structuredData.person.occupation,
            politicalParty: structuredData.person.politicalParty,
            education: structuredData.person.education,
            netWorth: structuredData.person.netWorth,
            residence: structuredData.person.residence,
            subtype: structuredData.person.subtype,
          };

          const createEntityResponse = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/atlas-crud`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "add-entity",
                data: entityForGraph,
              }),
            }
          );

          if (createEntityResponse.ok) {
            const createResult = await createEntityResponse.json();
            createdEntity = createResult.data;
            console.log(
              `✅ Entity created successfully: ${structuredData.person.id}`
            );

            // Create discovered relationships with cascade research
            if (structuredData?.relationships?.length > 0) {
              console.log(
                `🔗 Processing ${structuredData.relationships.length} discovered relationships...`
              );

              for (const relationship of structuredData.relationships) {
                try {
                  // First, try to create the relationship
                  const relResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/atlas-crud`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "add-relationship",
                        data: {
                          ...relationship,
                          source: structuredData.person.id, // Use the created entity as source
                        },
                      }),
                    }
                  );

                  if (relResponse.ok) {
                    const relResult = await relResponse.json();
                    createdRelationships.push(relResult.data);
                    console.log(
                      `✅ Relationship created: ${relationship.type}`
                    );
                  } else if (relResponse.status === 404) {
                    // Target entity doesn't exist - cascade research it
                    const targetEntityId = relationship.target;
                    const targetName = extractNameFromEntityId(targetEntityId);

                    console.log(
                      `🔄 Target entity missing: ${targetName}. Starting cascade research...`
                    );

                    try {
                      // Recursively research the target entity (with loop prevention)
                      const cascadeResponse = await fetch(
                        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/research/person`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            targetPersonName: targetName,
                            researchDepth: "basic", // Use basic depth for cascade research
                            focusAreas: ["biographical"], // Limited focus for cascade
                            _cascadeChain: [..._cascadeChain, targetPersonName], // Track cascade chain
                          }),
                        }
                      );

                      if (cascadeResponse.ok) {
                        console.log(
                          `✅ Cascade research completed for: ${targetName}`
                        );

                        // Now try to create the relationship again
                        const retryRelResponse = await fetch(
                          `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/atlas-crud`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "add-relationship",
                              data: {
                                ...relationship,
                                source: structuredData.person.id,
                              },
                            }),
                          }
                        );

                        if (retryRelResponse.ok) {
                          const retryResult = await retryRelResponse.json();
                          createdRelationships.push(retryResult.data);
                          console.log(
                            `✅ Relationship created after cascade: ${relationship.type} → ${targetName}`
                          );
                        } else {
                          console.log(
                            `⚠️ Relationship still failed after cascade: ${relationship.type}`
                          );
                        }
                      } else {
                        console.log(
                          `⚠️ Cascade research failed for: ${targetName}`
                        );
                      }
                    } catch (cascadeError) {
                      console.log(
                        `⚠️ Cascade research error for ${targetName}:`,
                        cascadeError
                      );
                    }
                  }
                } catch (relError) {
                  console.log(
                    `⚠️ Skipped relationship: ${relationship.type} (error occurred)`
                  );
                }
              }
            }
          } else {
            console.log(
              `⚠️ Failed to create entity: ${createEntityResponse.status}`
            );
          }
        }
      }
    } catch (e) {
      console.log("No structured data found in research result");
    }

    return NextResponse.json({
      success: true,
      data: {
        researchResult,
        structuredEntity: structuredData?.person || undefined,
        suggestedRelationships: structuredData?.relationships || [],
        createdEntity: createdEntity,
        createdRelationships: createdRelationships,
        researchSummary: `Wikipedia extraction${createdEntity ? " and knowledge graph integration" : ""} completed for ${targetPersonName}`,
        source: "Wikipedia via LangChain WikipediaQueryRun + Structured Output",
        confidenceLevel:
          structuredData?.confidence || CONFIDENCE_DEFAULTS.DEFAULT,
        metadata: {
          targetPerson: targetPersonName,
          researchDepth,
          focusAreas,
          source: "Wikipedia + LLM Extraction",
          extractionMethod: "LangChain Structured Output",
          timestamp: new Date().toISOString(),
          hasStructuredData: !!structuredData,
          knowledgeGraphIntegration: {
            entityCreated: !!createdEntity,
            relationshipsCreated: createdRelationships.length,
            entityId: createdEntity?.id || undefined,
          },
          knowledgeGraphContext: {
            personEntitiesCount: finalPersonEntities.length,
            relationshipsCount: finalRelationships.length,
            entityNames: entityNames.slice(0, 10), // First 10 for debugging
            autoFetched: !existingPersonEntities || !existingRelationships,
          },
        },
      },
      message: `Wikipedia extraction${createdEntity ? " and entity creation" : ""} completed for ${targetPersonName}`,
    });
  } catch (error) {
    console.error("❌ Person research agent error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Person research failed",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      agent: "Person Research Agent",
      description:
        "AI-powered person entity research and knowledge graph population",
      status: "ready (mock implementation)",
      capabilities: [
        "Comprehensive biographical research",
        "Relationship discovery and analysis",
        "Source verification and confidence scoring",
        "Entity validation and quality control",
        "Knowledge graph integration",
      ],
      usage: {
        method: "POST",
        endpoint: "/api/research/person",
        parameters: {
          targetPersonName: "string (required)",
          existingPersonEntities: "PersonEntity[] (optional)",
          existingRelationships: "Relationship[] (optional)",
          researchDepth: "'basic' | 'detailed' | 'comprehensive' (optional)",
          focusAreas: "PersonResearchFocus[] (optional)",
        },
      },
      example: {
        targetPersonName: "Elon Musk",
        researchDepth: "detailed",
        focusAreas: ["biographical", "business", "relationships"],
      },
    },
  });
}
