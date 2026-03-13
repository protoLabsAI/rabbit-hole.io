/**
 * Individual Relationship Analysis API - Rabbit Hole Schema
 *
 * Provides detailed analysis of specific relationships between two entities.
 * Supports family, business, political, and platform relationship analysis
 * with evidence evaluation and timeline context.
 */

import { NextRequest, NextResponse } from "next/server";

import { getGlobalNeo4jClient } from "@proto/database";
import { CALCULATIONS } from "@proto/types";
import {
  calculatePersonAge,
  calculateRelationshipDuration,
} from "@proto/utils/atlas";

interface IndividualRelationshipAnalysis {
  success: boolean;
  data?: {
    relationship: {
      sourceEntity: {
        uid: string;
        name: string;
        type: string;
      };
      targetEntity: {
        uid: string;
        name: string;
        type: string;
      };
      relationshipType: string;
      category: "family" | "business" | "political" | "platform";
      confidence: number;
      timeline: {
        startDate?: string;
        endDate?: string;
        duration?: string;
        isOngoing: boolean;
      };
    };
    analysis: {
      relationshipStrength: {
        score: number; // 0-1 based on evidence and confidence
        factors: string[];
      };
      contextualAnalysis: {
        ageContext?: {
          sourceAge?: number;
          targetAge?: number;
          ageDifference?: number;
          significantAgeGap: boolean;
        };
        temporalContext: {
          relationshipPeriod?: string;
          significantEvents: Array<{
            date: string;
            event: string;
            impact: string;
          }>;
        };
        networkContext: {
          mutualConnections: number;
          sharedRelationships: string[];
          networkOverlap: number; // 0-1 score
        };
      };
      researchInsights: {
        dataQuality: "high" | "medium" | "low";
        missingInformation: string[];
        researchPriorities: Array<{
          priority: "high" | "medium" | "low";
          task: string;
          reason: string;
        }>;
      };
    };
    reportGenerated: string;
  };
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityUid: string }> }
): Promise<NextResponse<IndividualRelationshipAnalysis>> {
  const client = getGlobalNeo4jClient();

  try {
    const { entityUid } = await params;
    const { searchParams } = new URL(request.url);

    const targetEntityUid = searchParams.get("target");
    const relationshipType = searchParams.get("type");

    if (!targetEntityUid) {
      return NextResponse.json(
        {
          success: false,
          error: "Target entity UID is required (use ?target=person:example)",
        },
        { status: 400 }
      );
    }

    console.log(
      `🔍 Individual relationship analysis: ${entityUid} → ${targetEntityUid} (${relationshipType || "any"})`
    );

    // Get relationship details between the two entities
    const relationshipQuery = `
      MATCH (source {uid: $sourceUid})
      MATCH (target {uid: $targetUid})
      
      // Find direct relationships between entities
      OPTIONAL MATCH (source)-[rel]-(target)
      WHERE ($relationshipType IS NULL OR type( rel: any) = $relationshipType)
      
      // Get mutual connections
      OPTIONAL MATCH (source)-[sourceRel]-(mutual)-[targetRel]-(target)
      WHERE mutual.uid <> source.uid AND mutual.uid <> target.uid
      
      WITH source, target, rel, collect(DISTINCT {
        mutualEntity: mutual,
        sourceRelType: type(sourceRel),
        targetRelType: type(targetRel)
      }) as mutualConnections
      
      RETURN 
        source,
        target,
        rel,
        mutualConnections,
        size(mutualConnections) as mutualConnectionCount
    `;

    const result = await client.executeRead(relationshipQuery, {
      sourceUid: entityUid,
      targetUid: targetEntityUid,
      relationshipType: relationshipType || undefined,
    });

    if (result.records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No relationship found between ${entityUid} and ${targetEntityUid}`,
        },
        { status: 404 }
      );
    }

    const record = result.records[0];
    const source = record.get("source");
    const target = record.get("target");
    const rel = record.get("rel");
    const mutualConnections = record.get("mutualConnections");
    const mutualConnectionCount = record.get("mutualConnectionCount");

    if (!rel) {
      return NextResponse.json(
        {
          success: false,
          error: `No direct relationship found between entities`,
        },
        { status: 404 }
      );
    }

    // Determine relationship category
    const relationshipTypeStr = rel.type;
    let category: "family" | "business" | "political" | "platform";

    if (
      [
        "MARRIED_TO",
        "DIVORCED_FROM",
        "PARENT_OF",
        "CHILD_OF",
        "SIBLING_OF",
        "RELATED_TO",
      ].includes(relationshipTypeStr)
    ) {
      category = "family";
    } else if (
      ["OWNS", "FUNDS", "EMPLOYED_BY", "FOUNDED", "CONTROLS"].includes(
        relationshipTypeStr
      )
    ) {
      category = "business";
    } else if (
      ["HOLDS_ROLE", "ENDORSES", "ATTACKS", "AFFILIATED_WITH"].includes(
        relationshipTypeStr
      )
    ) {
      category = "political";
    } else {
      category = "platform";
    }

    // Calculate timeline information
    const startDate = rel.properties?.at || rel.properties?.from;
    const endDate = rel.properties?.to;
    const durationData = calculateRelationshipDuration(startDate, endDate);

    // Calculate age context for family relationships
    let ageContext:
      | undefined
      | {
          sourceAge: number;
          targetAge: number;
          ageDifference: number;
          significantAgeGap: boolean;
        } = undefined;
    if (category === "family" && source.birthDate && target.birthDate) {
      const sourceAgeData = calculatePersonAge(
        source.birthDate,
        source.deathDate
      );
      const targetAgeData = calculatePersonAge(
        target.birthDate,
        target.deathDate
      );

      if (sourceAgeData.age && targetAgeData.age) {
        const ageDifference = Math.abs(sourceAgeData.age - targetAgeData.age);
        ageContext = {
          sourceAge: sourceAgeData.age,
          targetAge: targetAgeData.age,
          ageDifference,
          significantAgeGap: ageDifference > 15, // Arbitrary threshold
        };
      }
    }

    // Analyze relationship strength
    const confidence = rel.properties?.confidence || 1.0;
    const evidenceCount = rel.properties?.evidence_uids?.length || 0;
    const relationshipStrength = Math.min(
      confidence + evidenceCount * 0.1,
      1.0
    );

    const strengthFactors: string[] = [];
    if (confidence >= 0.9) strengthFactors.push("High confidence score");
    if (evidenceCount > 0)
      strengthFactors.push(
        `${evidenceCount} evidence source${evidenceCount !== 1 ? "s" : ""}`
      );
    if (startDate) strengthFactors.push("Timeline data available");
    if (mutualConnectionCount > 0)
      strengthFactors.push(
        `${mutualConnectionCount} mutual connection${mutualConnectionCount !== 1 ? "s" : ""}`
      );

    // Identify missing information
    const missingInformation: string[] = [];
    if (!startDate && category === "family")
      missingInformation.push("Relationship start date");
    if (!source.birthDate && category === "family")
      missingInformation.push(`${source.name} birth date`);
    if (!target.birthDate && category === "family")
      missingInformation.push(`${target.name} birth date`);
    if (evidenceCount === 0) missingInformation.push("Evidence sources");

    // Generate research priorities
    const researchPriorities: any[] = [];
    if (missingInformation.length > 0) {
      researchPriorities.push({
        priority: "high",
        task: `Research missing ${missingInformation.join(", ")}`,
        reason: "Improves relationship analysis accuracy and timeline context",
      });
    }

    if (mutualConnectionCount === 0) {
      researchPriorities.push({
        priority: "medium",
        task: "Investigate mutual connections",
        reason:
          "May reveal additional relationship context and network patterns",
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        relationship: {
          sourceEntity: {
            uid: source.uid,
            name: source.name,
            type: source.labels?.[0] || "Entity",
          },
          targetEntity: {
            uid: target.uid,
            name: target.name,
            type: target.labels?.[0] || "Entity",
          },
          relationshipType: relationshipTypeStr,
          category,
          confidence,
          timeline: {
            startDate,
            endDate,
            duration: durationData.duration ?? undefined,
            isOngoing: durationData.isOngoing,
          },
        },
        analysis: {
          relationshipStrength: {
            score: relationshipStrength,
            factors: strengthFactors,
          },
          contextualAnalysis: {
            ageContext,
            temporalContext: {
              relationshipPeriod: durationData.duration ?? undefined,
              significantEvents: [], // TODO: Identify significant timeline events
            },
            networkContext: {
              mutualConnections: mutualConnectionCount,
              sharedRelationships: mutualConnections.map(
                (mc: any) =>
                  `${mc.sourceRelType} → ${mc.mutualEntity.name} ← ${mc.targetRelType}`
              ),
              networkOverlap: CALCULATIONS.calculateNetworkOverlap(
                mutualConnectionCount
              ), // Normalized score
            },
          },
          researchInsights: {
            dataQuality:
              evidenceCount > 2 ? "high" : evidenceCount > 0 ? "medium" : "low",
            missingInformation,
            researchPriorities,
          },
        },
        reportGenerated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Individual Relationship Analysis API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze individual relationship",
      },
      { status: 500 }
    );
  }
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: "/api/research/relationships/[entityUid]",
      description:
        "Detailed analysis of specific relationships between two entities",
      method: "GET",
      parameters: {
        entityUid: "Source entity UID (required)",
        target: "Target entity UID (required)",
        type: "Specific relationship type to analyze (optional)",
      },
    },
    usage: {
      examples: [
        "/api/relationship-analysis/individual/person:donald_trump?target=person:ivanka_trump&type=PARENT_OF",
        "/api/relationship-analysis/individual/person:alex_jones?target=org:infowars&type=OWNS",
      ],
    },
    supportedCategories: ["family", "business", "political", "platform"],
    features: [
      "Relationship strength scoring",
      "Age and timeline context analysis",
      "Mutual connection identification",
      "Research gap analysis",
      "Evidence quality assessment",
    ],
  });
}
