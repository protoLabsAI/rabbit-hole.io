/**
 * Generic Entity Relationship Details API - Rabbit Hole Schema
 *
 * Returns comprehensive relationship data categorized by type:
 * - Family relationships with age calculations and timeline context
 * - Business relationships with ownership and role details
 * - Political relationships with positions and affiliations
 * - Platform relationships with moderation and engagement data
 */

import neo4j from "neo4j-driver";
import { NextRequest, NextResponse } from "next/server";

import { getGlobalNeo4jClient } from "@protolabsai/database";
import {
  calculatePersonAge,
  calculateRelationshipDuration,
  calculateFamilyAgeStats,
  buildRelationshipDetailsQuery,
  validateQueryParams,
  FAMILY_RELATIONSHIP_TYPES,
} from "@protolabsai/utils/atlas";

interface PersonDetails {
  uid: string;
  name: string;
  birthDate?: string;
  deathDate?: string;
  age?: number;
  status: "living" | "deceased" | "unknown";
}

interface EvidenceSource {
  uid: string;
  title: string;
  publisher: string;
  url: string;
  reliability: number;
}

interface FamilyRelationships {
  marriages: Array<{
    relationshipId: string;
    relationshipType: "MARRIED_TO" | "DIVORCED_FROM";
    partner: PersonDetails;
    marriageDate?: string;
    divorceDate?: string;
    duration?: string;
    confidence: number;
    evidence: EvidenceSource[];
  }>;
  children: Array<{
    relationshipId: string;
    child: PersonDetails;
    birthDate?: string;
    age?: number;
    confidence: number;
    evidence: EvidenceSource[];
  }>;
  parents: Array<{
    relationshipId: string;
    parent: PersonDetails;
    relationship: "father" | "mother" | "parent";
    confidence: number;
    evidence: EvidenceSource[];
  }>;
  siblings: Array<{
    relationshipId: string;
    sibling: PersonDetails;
    age?: number;
    relationship: "brother" | "sister" | "sibling";
    confidence: number;
    evidence: EvidenceSource[];
  }>;
  summary: {
    totalFamilyMembers: number;
    spouses: number;
    children: number;
    parents: number;
    siblings: number;
    averageAge?: number;
  };
}

interface RelationshipDetailsResponse {
  success: boolean;
  data?: {
    entity: {
      uid: string;
      name: string;
      type: string;
      birthDate?: string;
    };
    categories: {
      family?: FamilyRelationships;
      business?: any;
      political?: any;
      platform?: any;
    };
    summary: {
      totalRelationships: number;
      categoryCounts: Record<string, number>;
      timeRange: { earliest: string; latest: string };
    };
  };
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityUid: string }> }
): Promise<NextResponse<RelationshipDetailsResponse>> {
  const client = getGlobalNeo4jClient();

  try {
    const { entityUid } = await params;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const categories = searchParams.get("categories")?.split(",") || ["family"];
    const relationshipTypes =
      searchParams.get("types")?.split(",") || undefined;
    const includeAges = searchParams.get("includeAges") === "true";
    const includeTimeline = searchParams.get("includeTimeline") === "true";
    const limit = Math.min(
      Math.floor(parseInt(searchParams.get("limit") || "50")),
      200
    );

    // Validate parameters
    const validation = validateQueryParams({
      entityUid,
      categories,
      relationshipTypes: relationshipTypes || [],
      includeAges,
      includeTimeline,
      limit,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid parameters: ${validation.errors.join(", ")}`,
        },
        { status: 400 }
      );
    }

    console.log(`🔗 Relationship details for ${entityUid} with categories:`, {
      categories,
      relationshipTypes,
      includeAges,
      includeTimeline,
      limit,
    });

    // First, get the entity info
    const entityResult = await client.executeRead(
      `
      MATCH (e {uid: $entityUid})
      RETURN 
        e.uid as uid, 
        e.name as name, 
        labels(e)[0] as type,
        e.birthDate as birthDate,
        e.deathDate as deathDate
    `,
      { entityUid }
    );

    if (entityResult.records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Entity ${entityUid} not found`,
        },
        { status: 404 }
      );
    }

    const entityRecord = entityResult.records[0];
    const entity = {
      uid: entityRecord.get("uid"),
      name: entityRecord.get("name"),
      type: entityRecord.get("type"),
      birthDate: entityRecord.get("birthDate")?.toString() || undefined,
    };

    let familyData: FamilyRelationships | undefined;

    // Process family relationships if requested
    if (categories.includes("family")) {
      // Use the relationship query builder
      const { query: familyQuery, params: familyParams } =
        buildRelationshipDetailsQuery({
          entityUid,
          categories: ["family"],
          relationshipTypes,
          includeAges,
          includeTimeline,
          limit,
        });

      // Force all numeric parameters to Neo4j integers to prevent floating point conversion
      const safeParams = { ...familyParams };
      Object.keys(safeParams).forEach((key) => {
        if (
          typeof safeParams[key] === "number" &&
          Number.isInteger(safeParams[key])
        ) {
          safeParams[key] = neo4j.int(safeParams[key]);
        }
      });

      const familyResult = await client.executeRead(familyQuery, safeParams);

      if (familyResult.records.length > 0) {
        const familyRecord = familyResult.records[0];

        const marriages = familyRecord.get("marriages").map((marriage: any) => {
          const partnerAgeData = calculatePersonAge(
            marriage.partner.birthDate,
            marriage.partner.deathDate
          );
          const durationData = calculateRelationshipDuration(
            marriage.marriageDate,
            marriage.divorceDate
          );

          return {
            relationshipId:
              marriage.relationshipId || `marriage_${Math.random()}`,
            relationshipType: marriage.relationshipType,
            partner: {
              uid: marriage.partner.uid,
              name: marriage.partner.name,
              birthDate: marriage.partner.birthDate,
              deathDate: marriage.partner.deathDate,
              age: includeAges ? partnerAgeData.age : undefined,
              status: partnerAgeData.status,
            },
            marriageDate: marriage.marriageDate,
            divorceDate: marriage.divorceDate,
            duration: durationData.duration,
            confidence: marriage.confidence || 1.0,
            evidence: [], // TODO: Resolve evidence UIDs to full evidence objects
          };
        });

        const children = familyRecord.get("children").map((child: any) => {
          const childAgeData = calculatePersonAge(
            child.child.birthDate,
            child.child.deathDate
          );

          return {
            relationshipId: child.relationshipId || `child_${Math.random()}`,
            child: {
              uid: child.child.uid,
              name: child.child.name,
              birthDate: child.child.birthDate,
              deathDate: child.child.deathDate,
              age: includeAges ? childAgeData.age : undefined,
              status: childAgeData.status,
            },
            birthDate: child.child.birthDate,
            age: includeAges ? childAgeData.age : undefined,
            confidence: child.confidence || 1.0,
            evidence: [], // TODO: Resolve evidence UIDs to full evidence objects
          };
        });

        const parents = familyRecord.get("parents").map((parent: any) => {
          const parentAgeData = calculatePersonAge(
            parent.parent.birthDate,
            parent.parent.deathDate
          );

          return {
            relationshipId: parent.relationshipId || `parent_${Math.random()}`,
            parent: {
              uid: parent.parent.uid,
              name: parent.parent.name,
              birthDate: parent.parent.birthDate,
              deathDate: parent.parent.deathDate,
              age: includeAges ? parentAgeData.age : undefined,
              status: parentAgeData.status,
            },
            relationship: "parent" as const, // TODO: Determine father/mother from data
            confidence: parent.confidence || 1.0,
            evidence: [], // TODO: Resolve evidence UIDs to full evidence objects
          };
        });

        const siblings = familyRecord.get("siblings").map((sibling: any) => {
          const siblingAgeData = calculatePersonAge(
            sibling.sibling.birthDate,
            sibling.sibling.deathDate
          );

          return {
            relationshipId:
              sibling.relationshipId || `sibling_${Math.random()}`,
            sibling: {
              uid: sibling.sibling.uid,
              name: sibling.sibling.name,
              birthDate: sibling.sibling.birthDate,
              deathDate: sibling.sibling.deathDate,
              age: includeAges ? siblingAgeData.age : undefined,
              status: siblingAgeData.status,
            },
            age: includeAges ? siblingAgeData.age : undefined,
            relationship: "sibling" as const, // TODO: Determine brother/sister from data
            confidence: sibling.confidence || 1.0,
            evidence: [], // TODO: Resolve evidence UIDs to full evidence objects
          };
        });

        // Calculate family summary using utilities
        const totalFamilyMembers =
          marriages.length + children.length + parents.length + siblings.length;

        // Collect all family members for age statistics
        const allFamilyMembers = [
          ...marriages.map((m: any) => ({
            birthDate: m.partner.birthDate,
            deathDate: m.partner.deathDate,
          })),
          ...children.map((c: any) => ({
            birthDate: c.child.birthDate,
            deathDate: c.child.deathDate,
          })),
          ...parents.map((p: any) => ({
            birthDate: p.parent.birthDate,
            deathDate: p.parent.deathDate,
          })),
          ...siblings.map((s: any) => ({
            birthDate: s.sibling.birthDate,
            deathDate: s.sibling.deathDate,
          })),
        ];

        const familyStats = includeAges
          ? calculateFamilyAgeStats(allFamilyMembers)
          : undefined;

        familyData = {
          marriages,
          children,
          parents,
          siblings,
          summary: {
            totalFamilyMembers,
            spouses: marriages.length,
            children: children.length,
            parents: parents.length,
            siblings: siblings.length,
            averageAge: familyStats?.averageAge ?? undefined,
          },
        };
      } else {
        // No family relationships found
        familyData = {
          marriages: [],
          children: [],
          parents: [],
          siblings: [],
          summary: {
            totalFamilyMembers: 0,
            spouses: 0,
            children: 0,
            parents: 0,
            siblings: 0,
          },
        };
      }
    }

    // Calculate totals for response
    const totalRelationships = familyData?.summary.totalFamilyMembers || 0;
    const categoryCounts: Record<string, number> = {};

    if (familyData) {
      categoryCounts.family = familyData.summary.totalFamilyMembers;
    }

    return NextResponse.json({
      success: true,
      data: {
        entity,
        categories: {
          family: familyData,
          // TODO: Add business, political, platform categories
        },
        summary: {
          totalRelationships,
          categoryCounts,
          timeRange: { earliest: "", latest: "" }, // TODO: Calculate from relationship dates
        },
      },
    });
  } catch (error) {
    console.error("Relationship Details API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch relationship details",
      },
      { status: 500 }
    );
  }
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: "/api/entity-relationships/[entityUid]",
      description:
        "Generic relationship details API with category filtering and age calculations",
      method: "GET",
      parameters: {
        entityUid: "Entity UID (required)",
        categories:
          "Comma-separated categories: family,business,political,platform (default: family)",
        types:
          "Comma-separated relationship types: MARRIED_TO,PARENT_OF,CHILD_OF,SIBLING_OF",
        includeAges:
          "Calculate ages for family members (true/false, default: false)",
        includeTimeline:
          "Include relationship timeline context (true/false, default: false)",
        limit: "Max relationships to return (default: 50, max: 200)",
      },
    },
    usage: {
      examples: [
        "/api/entity-relationships/person:donald_trump",
        "/api/entity-relationships/person:donald_trump?categories=family&includeAges=true",
        "/api/entity-relationships/person:alex_jones?categories=family,business&includeTimeline=true",
        "/api/entity-relationships/org:tesla?categories=business&types=OWNS,FUNDS&limit=20",
      ],
    },
    supportedCategories: {
      family: {
        description: "Family relationships with age calculations",
        relationshipTypes: FAMILY_RELATIONSHIP_TYPES,
        features: ["age_calculation", "marriage_duration", "living_status"],
      },
      business: {
        description: "Business relationships and ownership",
        relationshipTypes: [
          "OWNS",
          "FUNDS",
          "EMPLOYED_BY",
          "FOUNDED",
          "CONTROLS",
        ],
        features: ["ownership_percentage", "role_details", "financial_amounts"],
        status: "not_implemented",
      },
      political: {
        description: "Political relationships and affiliations",
        relationshipTypes: [
          "HOLDS_ROLE",
          "ENDORSES",
          "ATTACKS",
          "AFFILIATED_WITH",
        ],
        features: [
          "position_details",
          "political_alignment",
          "influence_score",
        ],
        status: "not_implemented",
      },
      platform: {
        description: "Platform relationships and moderation",
        relationshipTypes: ["PLATFORMS", "MODERATION_ACTION", "ADVERTISES_ON"],
        features: [
          "moderation_history",
          "engagement_metrics",
          "platform_status",
        ],
        status: "not_implemented",
      },
    },
  });
}
