/**
 * Entity Search API - CONSOLIDATED VERSION
 *
 * Demonstrates DRY principles using shared utilities:
 * - Uses consolidated validation middleware
 * - Uses standardized response types and pagination
 * - Uses shared search parameter validation
 * - Eliminates inline interface duplication
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuthAndLogging } from "@proto/auth";
import { getGlobalNeo4jClient } from "@proto/database";
import {
  safeValidate,
  SearchResponse,
  PAGINATION_LIMITS,
  CONFIDENCE_DEFAULTS,
} from "@proto/types";
import { createNeo4jClientWithIntegerConversion } from "@proto/utils";

// Dynamic imports to avoid Turbopack issues with require()
const resolveTenantFromHeaders = async (request: any) => {
  const { resolveTenantFromHeaders: resolver } = await import(
    "@proto/utils/tenancy-server"
  );
  return resolver(request);
};

const buildPublicTenantFilter = (
  varName: string = "n",
  includePublic: boolean = true
): string => {
  if (includePublic) {
    return `(${varName}.clerk_org_id = 'public' OR ${varName}.clerk_org_id = $orgId)`;
  }
  return `${varName}.clerk_org_id = $orgId`;
};

// ==================== Request Schema ====================

const EntitySearchRequestSchema = z.object({
  searchQuery: z
    .string()
    .min(2, "Search query must be at least 2 characters")
    .max(100),
  entityTypes: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

type EntitySearchRequest = z.infer<typeof EntitySearchRequestSchema>;

// ==================== Response Types ====================

interface EntitySearchResult {
  entity: {
    uid: string;
    name: string;
    type: string;
    tags?: string[];
    aliases?: string[];
  };
  similarity: number;
  matchReasons: string[];
}

// ==================== Handler Implementation ====================

const handleEntitySearch = async (
  searchData: EntitySearchRequest,
  request: NextRequest,
  user: { userId: string }
): Promise<NextResponse<SearchResponse<EntitySearchResult>>> => {
  const startTime = Date.now();
  const baseClient = getGlobalNeo4jClient();
  const client = createNeo4jClientWithIntegerConversion(baseClient);
  const { searchQuery, entityTypes, limit = 10 } = searchData;

  // Resolve tenant context (optional - if no tenant, show all public data)
  const tenant = await resolveTenantFromHeaders(request);

  try {
    console.log(`🔍 Entity search: "${searchQuery}" from user: ${user.userId}`);

    // Validate pagination parameters using centralized limits
    const validLimit = Math.min(
      Math.max(Math.floor(limit), PAGINATION_LIMITS.SEARCH_MIN_LIMIT),
      PAGINATION_LIMITS.SEARCH_MAX_LIMIT
    );

    // Build entity type filter
    const typeFilter = entityTypes?.length
      ? `WHERE ${entityTypes.map((type) => `'${type}' IN labels(e)`).join(" OR ")}`
      : "";

    // Enhanced search query with multiple matching strategies
    const searchCypher = `
      MATCH (e)
      ${typeFilter}
      WHERE ${buildPublicTenantFilter("e")}
        AND e.uid IS NOT NULL 
        AND e.name IS NOT NULL
        AND (
          // Exact name match (highest priority)
          toLower(e.name) = toLower($searchQuery)
          OR 
          // Name contains search term
          toLower(e.name) CONTAINS toLower($searchQuery)
          OR
          // Alias matches
          ANY(alias IN COALESCE(e.aliases, []) WHERE toLower(alias) CONTAINS toLower($searchQuery))
          OR
          // Tag matches for broader discovery
          ANY(tag IN COALESCE(e.tags, []) WHERE toLower(tag) CONTAINS toLower($searchQuery))
        )
      
      WITH e,
           // Calculate similarity score
           CASE
             WHEN toLower(e.name) = toLower($searchQuery) THEN 1.0
             WHEN toLower(e.name) CONTAINS toLower($searchQuery) THEN ${CONFIDENCE_DEFAULTS.SEARCH_STRONG_MATCH}
             WHEN ANY(alias IN COALESCE(e.aliases, []) WHERE toLower(alias) = toLower($searchQuery)) THEN ${CONFIDENCE_DEFAULTS.SEARCH_EXACT_MATCH}
             WHEN ANY(alias IN COALESCE(e.aliases, []) WHERE toLower(alias) CONTAINS toLower($searchQuery)) THEN 0.7
             WHEN ANY(tag IN COALESCE(e.tags, []) WHERE toLower(tag) CONTAINS toLower($searchQuery)) THEN 0.5
             ELSE 0.3
           END as similarity,
           
           // Generate match reasons
           CASE
             WHEN toLower(e.name) = toLower($searchQuery) THEN ['Exact name match']
             WHEN toLower(e.name) CONTAINS toLower($searchQuery) THEN ['Name contains "' + $searchQuery + '"']
             WHEN ANY(alias IN COALESCE(e.aliases, []) WHERE toLower(alias) = toLower($searchQuery)) THEN ['Exact alias match']
             WHEN ANY(alias IN COALESCE(e.aliases, []) WHERE toLower(alias) CONTAINS toLower($searchQuery)) THEN ['Alias contains "' + $searchQuery + '"']
             WHEN ANY(tag IN COALESCE(e.tags, []) WHERE toLower(tag) CONTAINS toLower($searchQuery)) THEN ['Related by tag']
             ELSE ['Similar name']
           END as matchReasons

      RETURN 
        e.uid as uid,
        e.name as name,
        labels(e)[0] as type,
        COALESCE(e.tags, []) as tags,
        COALESCE(e.aliases, []) as aliases,
        similarity,
        matchReasons
        
      ORDER BY similarity DESC, e.name ASC
      LIMIT $limit
    `;

    const result = await client.executeRead(searchCypher, {
      searchQuery: searchQuery.trim(),
      limit: validLimit,
      orgId: tenant?.clerkOrgId || "public",
    });

    const entities = result.records.map(
      (record: any): EntitySearchResult => ({
        entity: {
          uid: record.get("uid"),
          name: record.get("name"),
          type: record.get("type"),
          tags: record.get("tags"),
          aliases: record.get("aliases"),
        },
        similarity: record.get("similarity"),
        matchReasons: record.get("matchReasons"),
      })
    );

    console.log(`📊 Found ${entities.length} entities for "${searchQuery}"`);

    // Return response using standardized SearchResponse format
    return NextResponse.json({
      success: true,
      data: {
        results: entities,
        totalResults: entities.length,
        query: searchData.searchQuery,
        searchTime: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error("Entity search error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Search failed",
      },
      { status: 500 }
    );
  }
};

// ==================== Route Export ====================

export const POST = withAuthAndLogging("search entities")(async (
  request: NextRequest
): Promise<NextResponse<SearchResponse<EntitySearchResult>>> => {
  try {
    const body = await request.json();

    // Validate request data
    const validation = safeValidate(EntitySearchRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid request data: ${validation.error}`,
        },
        { status: 400 }
      );
    }

    // Use authenticated user
    const user = { userId: "authenticated" };
    return await handleEntitySearch(validation.data, request, user);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Search failed",
      },
      { status: 500 }
    );
  }
});

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      api: "Entity Search API",
      version: "2.0 - Consolidated",
      description:
        "Search for entities in the knowledge graph by name, alias, or tag",
      authentication: "required",
      schema: "EntitySearchRequestSchema",
      usage: {
        searchQuery: "Search term (required, 2-100 characters)",
        entityTypes: "Array of entity types to filter by (optional)",
        limit: "Maximum results to return (optional, default 10, max 50)",
      },
      examples: [
        {
          description: "Search for any entity containing 'trump'",
          request: { searchQuery: "trump" },
        },
        {
          description: "Search for people only",
          request: { searchQuery: "biden", entityTypes: ["Person"] },
        },
        {
          description: "Limited search",
          request: { searchQuery: "media", limit: 5 },
        },
      ],
    },
  });
}
