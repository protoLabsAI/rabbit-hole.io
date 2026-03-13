/**
 * Biographical Analysis API Endpoint
 *
 * Analyzes entity biographical data gaps and provides research guidance
 * following the "Transparency Over Perfection" philosophy
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getGlobalNeo4jClient } from "@proto/database";

interface BiographicalAnalysis {
  entityId: string;
  entityName: string;
  entityType: string;
  availableData: {
    bio: boolean;
    birthDate: boolean;
    birthPlace: boolean;
    deathDate: boolean;
    deathPlace: boolean;
    nationality: boolean;
    occupation: boolean;
    politicalParty: boolean;
    education: boolean;
    netWorth: boolean;
    residence: boolean;
    aliases: boolean;
  };
  missingFields: Array<{
    field: string;
    displayName: string;
    priority: "high" | "medium" | "low";
    researchSuggestion: string;
  }>;
  researchPriority: {
    totalGaps: number;
    highPriorityGaps: number;
    completenessScore: number; // 0-1
    researchDifficulty: "easy" | "medium" | "hard";
  };
  timelineAnalysis?: {
    hasTimeline: boolean;
    timelineGaps: number;
    intrinsicPlaceholders: number;
    temporalPlaceholders: number;
  };
  researchGuidance: {
    primarySources: string[];
    searchKeywords: string[];
    expectedDataSources: string[];
    estimatedResearchTime: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  // Check authentication
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication required for biographical analysis",
      },
      { status: 401 }
    );
  }

  const client = getGlobalNeo4jClient();

  try {
    const { uid } = await params;
    console.log(
      `🔍 Biographical analysis request for: ${uid} from user: ${userId}`
    );

    // Get entity details from Neo4j
    const entityResult = await client.executeRead(
      `
      MATCH (entity {uid: $uid})
      RETURN entity
      `,
      { uid }
    );

    if (entityResult.records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Entity not found: ${uid}`,
        },
        { status: 404 }
      );
    }

    const entity = entityResult.records[0].get("entity").properties;

    // Analyze available biographical data
    const availableData = {
      bio: !!entity.bio,
      birthDate: !!(entity.birthDate || entity.dates?.birth),
      birthPlace: !!entity.birthPlace,
      deathDate: !!(entity.deathDate || entity.dates?.death),
      deathPlace: !!entity.deathPlace,
      nationality: !!entity.nationality,
      occupation: !!entity.occupation,
      politicalParty: !!entity.politicalParty,
      education: !!(entity.education && entity.education.length > 0),
      netWorth: !!entity.netWorth,
      residence: !!entity.residence,
      aliases: !!(entity.aliases && entity.aliases.length > 0),
    };

    // Identify missing fields with research priorities
    const missingFields: Array<{
      field: string;
      displayName: string;
      priority: "high" | "medium" | "low";
      researchSuggestion: string;
    }> = [];
    const entityType = (entity.type || "unknown").toLowerCase();

    // High priority fields (essential biographical data)
    if (!availableData.bio) {
      missingFields.push({
        field: "bio",
        displayName: "Biography",
        priority: "high" as const,
        researchSuggestion:
          "Look for biographical summaries, obituaries, or official profiles",
      });
    }

    if (!availableData.birthDate) {
      missingFields.push({
        field: "birthDate",
        displayName: "Birth Date",
        priority: "high" as const,
        researchSuggestion:
          "Check birth records, biographical databases, or family trees",
      });
    }

    if (!availableData.nationality && entityType === "person") {
      missingFields.push({
        field: "nationality",
        displayName: "Nationality",
        priority: "high" as const,
        researchSuggestion:
          "Look for passport records, citizenship documents, or biographical sources",
      });
    }

    // Medium priority fields
    if (!availableData.birthPlace) {
      missingFields.push({
        field: "birthPlace",
        displayName: "Birth Place",
        priority: "medium" as const,
        researchSuggestion:
          "Check birth certificates, biographical sources, or family records",
      });
    }

    if (!availableData.occupation && entityType === "person") {
      missingFields.push({
        field: "occupation",
        displayName: "Occupation",
        priority: "medium" as const,
        researchSuggestion:
          "Look for professional profiles, employment records, or biographical sources",
      });
    }

    if (!availableData.politicalParty && entityType === "person") {
      missingFields.push({
        field: "politicalParty",
        displayName: "Political Affiliation",
        priority: "medium" as const,
        researchSuggestion:
          "Check voter registration, political profiles, or campaign records",
      });
    }

    // Low priority fields
    if (!availableData.residence) {
      missingFields.push({
        field: "residence",
        displayName: "Current Residence",
        priority: "low" as const,
        researchSuggestion:
          "Look for recent address records or biographical updates",
      });
    }

    if (!availableData.education && entityType === "person") {
      missingFields.push({
        field: "education",
        displayName: "Education",
        priority: "low" as const,
        researchSuggestion:
          "Check university records, alumni directories, or professional profiles",
      });
    }

    if (!availableData.deathDate && entityType === "person") {
      missingFields.push({
        field: "deathDate",
        displayName: "Death Date",
        priority: "low" as const,
        researchSuggestion:
          "Check obituaries, death records, or biographical sources (if applicable)",
      });
    }

    // Calculate research priority metrics
    const highPriorityGaps = missingFields.filter(
      (f) => f.priority === "high"
    ).length;
    const totalGaps = missingFields.length;
    const totalPossibleFields = Object.keys(availableData).length;
    const completenessScore =
      (totalPossibleFields - totalGaps) / totalPossibleFields;

    // Determine research difficulty
    let researchDifficulty: "easy" | "medium" | "hard" = "easy";
    if (highPriorityGaps >= 3 || totalGaps >= 6) {
      researchDifficulty = "hard";
    } else if (highPriorityGaps >= 2 || totalGaps >= 4) {
      researchDifficulty = "medium";
    }

    // Generate research guidance
    const entityName = entity.name || entity.label || uid;
    const searchKeywords = [
      entityName,
      ...(entity.aliases || []),
      `"${entityName}"`,
      `${entityName} biography`,
      `${entityName} profile`,
    ];

    const primarySources: string[] = [];
    const expectedDataSources: string[] = [];

    if (entityType === "person") {
      primarySources.push(
        "Wikipedia",
        "Biographical databases",
        "News archives",
        "Official profiles"
      );
      expectedDataSources.push(
        "Birth certificates",
        "Educational records",
        "Employment history",
        "Public records"
      );
    } else if (entityType === "organization") {
      primarySources.push(
        "Company websites",
        "Business registries",
        "News sources",
        "SEC filings"
      );
      expectedDataSources.push(
        "Incorporation documents",
        "Annual reports",
        "Press releases",
        "Trade publications"
      );
    }

    // Get timeline data for comprehensive analysis
    let timelineAnalysis:
      | undefined
      | {
          hasTimeline: boolean;
          timelineGaps: number;
          intrinsicPlaceholders: number;
          temporalPlaceholders: number;
        } = undefined;
    try {
      const timelineResponse = await fetch(
        `http://localhost:3000/api/entity-timeline/${uid}?limit=10`
      );
      if (timelineResponse.ok) {
        const timelineData = await timelineResponse.json();
        if (timelineData.success && timelineData.data.summary) {
          timelineAnalysis = {
            hasTimeline: true,
            timelineGaps: timelineData.data.summary.placeholderEvents || 0,
            intrinsicPlaceholders:
              timelineData.data.summary.intrinsicPlaceholders || 0,
            temporalPlaceholders:
              timelineData.data.summary.temporalPlaceholders || 0,
          };
        }
      }
    } catch (error) {
      console.warn(
        "Failed to load timeline data for biographical analysis:",
        error
      );
    }

    const analysis: BiographicalAnalysis = {
      entityId: uid,
      entityName,
      entityType,
      availableData,
      missingFields,
      researchPriority: {
        totalGaps,
        highPriorityGaps,
        completenessScore,
        researchDifficulty,
      },
      timelineAnalysis,
      researchGuidance: {
        primarySources,
        searchKeywords,
        expectedDataSources,
        estimatedResearchTime:
          researchDifficulty === "hard"
            ? "4-8 hours"
            : researchDifficulty === "medium"
              ? "2-4 hours"
              : "1-2 hours",
      },
    };

    console.log(
      `✅ Biographical analysis completed for: ${entityName} (${totalGaps} gaps, ${Math.round(completenessScore * 100)}% complete)`
    );

    return NextResponse.json({
      success: true,
      data: analysis,
      metadata: {
        analysisTimestamp: new Date().toISOString(),
        userId: userId,
        entityType,
        totalFieldsAnalyzed: totalPossibleFields,
        transparencyPhilosophy: "Gaps shown for targeted research",
      },
    });
  } catch (error) {
    console.error("Biographical analysis API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to analyze biographical data: ${error}`,
      },
      { status: 500 }
    );
  } finally {
    // No session cleanup needed - @proto/database handles connection management;
  }
}
