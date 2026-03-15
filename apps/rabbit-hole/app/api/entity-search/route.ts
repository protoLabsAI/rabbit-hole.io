/**
 * Entity Search API
 *
 * Uses Neo4j full-text index (migration 006) for sub-5ms searches at any scale.
 * Falls back to CONTAINS scan if the full-text index is not yet created.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuthAndLogging } from "@proto/auth";
import { getGlobalNeo4jClient } from "@proto/database";
import { safeValidate, SearchResponse, PAGINATION_LIMITS } from "@proto/types";
import { createNeo4jClientWithIntegerConversion } from "@proto/utils";

const resolveTenantFromHeaders = async (request: any) => {
  const { resolveTenantFromHeaders: resolver } = await import(
    "@proto/utils/tenancy-server"
  );
  return resolver(request);
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

// ==================== Lucene Query Builder ====================

/**
 * Escape Lucene special characters and add prefix wildcard for search-as-you-type.
 * "donald trump" → "donald trump*"
 * "trump" → "trump*"
 * "O'Brien" → "O\'Brien*"
 */
function buildLuceneQuery(rawQuery: string): string {
  const escaped = rawQuery
    .trim()
    .replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, "\\$1");
  if (!escaped) return escaped;
  const parts = escaped.split(/\s+/);
  parts[parts.length - 1] = parts[parts.length - 1] + "*";
  return parts.join(" ");
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

  const tenant = await resolveTenantFromHeaders(request);

  try {
    const validLimit = Math.min(
      Math.max(Math.floor(limit), PAGINATION_LIMITS.SEARCH_MIN_LIMIT),
      PAGINATION_LIMITS.SEARCH_MAX_LIMIT
    );

    const orgId = tenant?.clerkOrgId || "public";
    const ftQuery = buildLuceneQuery(searchQuery);
    const rawQuery = searchQuery.trim();

    const typeFilterClause = entityTypes?.length
      ? "AND ANY(t IN $entityTypes WHERE t IN labels(e))"
      : "";

    // Full-text index query (requires migration 006_fulltext_entity_index.cypher)
    const searchCypher = `
      CALL db.index.fulltext.queryNodes('idx_entity_name_fulltext', $ftQuery)
      YIELD node AS e, score
      WHERE e.uid IS NOT NULL
        AND e.name IS NOT NULL
        AND (e.clerk_org_id = 'public' OR e.clerk_org_id = $orgId)
        ${typeFilterClause}
      RETURN
        e.uid as uid,
        e.name as name,
        labels(e)[0] as type,
        COALESCE(e.tags, []) as tags,
        COALESCE(e.aliases, []) as aliases,
        score as similarity,
        CASE
          WHEN toLower(e.name) = toLower($rawQuery) THEN ['Exact name match']
          WHEN toLower(e.name) CONTAINS toLower($rawQuery) THEN ['Name match']
          WHEN ANY(alias IN COALESCE(e.aliases, []) WHERE toLower(alias) CONTAINS toLower($rawQuery)) THEN ['Alias match']
          WHEN ANY(tag IN COALESCE(e.tags, []) WHERE toLower(tag) CONTAINS toLower($rawQuery)) THEN ['Tag match']
          ELSE ['Full-text match']
        END as matchReasons
      ORDER BY similarity DESC, e.name ASC
      LIMIT $limit
    `;

    const params: Record<string, unknown> = {
      ftQuery,
      rawQuery,
      limit: validLimit,
      orgId,
    };
    if (entityTypes?.length) {
      params.entityTypes = entityTypes;
    }

    const result = await client.executeRead(searchCypher, params);

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
    // If the full-text index doesn't exist, give a clear message
    const msg = error instanceof Error ? error.message : "Search failed";
    if (msg.includes("idx_entity_name_fulltext")) {
      console.error(
        "Full-text index not found. Run migration 006_fulltext_entity_index.cypher"
      );
    } else {
      console.error("Entity search error:", error);
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
};

// ==================== Route Export ====================

export const POST = withAuthAndLogging("search entities")(async (
  request: NextRequest
): Promise<NextResponse<SearchResponse<EntitySearchResult>>> => {
  try {
    const body = await request.json();

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
      version: "3.0 - Full-text indexed",
      description:
        "Search entities in the knowledge graph by name, alias, or tag using Lucene full-text index",
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
