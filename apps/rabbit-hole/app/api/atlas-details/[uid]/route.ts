/**
 * Atlas Node Details API - Simplified Read-Only Access
 *
 * Provides entity details for Atlas UI without authentication requirements.
 * Uses entity-v2 endpoint for consistent data access.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;

    console.log(`🔄 Loading atlas-details for ${uid} via entity-v2`);

    // Use entity-v2 endpoint directly (no auth required)
    const baseUrl = request.nextUrl.origin;
    const entityUrl = `${baseUrl}/api/entity-v2/${uid}`;

    const response = await fetch(entityUrl);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: "Entity not found",
          },
          { status: 404 }
        );
      }
      throw new Error(`Entity-v2 endpoint returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || "Failed to fetch entity details",
        },
        { status: response.status }
      );
    }

    // Transform entity-v2 response to legacy atlas-details format
    const entity = data.data?.entity;
    const relationshipStats = data.data?.relationshipStats;

    if (!entity) {
      return NextResponse.json(
        {
          success: false,
          error: "Entity not found",
        },
        { status: 404 }
      );
    }

    const legacyResponse = {
      success: true,
      data: {
        entity: {
          id: entity.uid,
          label: entity.name,
          entityType: entity.type?.toLowerCase() || "unknown",
          tags: entity.properties?.tags || [],
          dates: {
            start: entity.properties?.birthDate || entity.properties?.founded,
            end: entity.properties?.deathDate || entity.properties?.dissolved,
            birth: entity.properties?.birthDate,
            death: entity.properties?.deathDate,
            founded: entity.properties?.founded,
            dissolved: entity.properties?.dissolved,
          },
          sources: [],
          bio: entity.properties?.bio,
          birthDate: entity.properties?.birthDate,
          birthPlace: entity.properties?.birthPlace,
          nationality: entity.properties?.nationality,
          occupation: entity.properties?.occupation,
          politicalParty: entity.properties?.politicalParty,
          education: entity.properties?.education,
          netWorth: entity.properties?.netWorth,
          residence: entity.properties?.residence,
          aliases: entity.properties?.aliases || [],
        },
        network: {
          total: relationshipStats?.total || 0,
          incoming: relationshipStats?.incoming || 0,
          outgoing: relationshipStats?.outgoing || 0,
          by_sentiment: {
            hostile: relationshipStats?.byType?.ATTACKS || 0,
            supportive: relationshipStats?.byType?.SUPPORTS || 0,
            neutral: Math.max(
              0,
              (relationshipStats?.total || 0) -
                (relationshipStats?.byType?.ATTACKS || 0) -
                (relationshipStats?.byType?.SUPPORTS || 0)
            ),
          },
          speech_acts: [],
        },
        speech_patterns:
          entity.speechActCount > 0
            ? {
                total_incidents: entity.speechActCount,
                categories: [],
                targets: [],
                timeline: [],
              }
            : undefined,
      },
    };

    return NextResponse.json(legacyResponse);
  } catch (error) {
    console.error("Atlas details error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load entity details",
      },
      { status: 500 }
    );
  }
}
