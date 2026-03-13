/**
 * Entity Management API
 *
 * Provides entity management capabilities including:
 * - List all entities with metadata and relationships
 * - Workspace-scoped filtering with admin bypass
 * - Statistics aggregation by type and status
 * - Tier limit tracking
 */

import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import {
  withAuthAndLogging,
  checkAdminRole,
  type AuthenticatedUser,
  getUserTier,
  getTierLimits,
} from "@proto/auth";
import { getGlobalNeo4jClient, getEntityCount } from "@proto/database";
import { createNeo4jClientWithIntegerConversion } from "@proto/utils";

interface EntityWithMetadata {
  uid: string;
  type: string;
  name: string;
  tags: string[];
  aliases: string[];
  createdAt: string;
  status?: string;
  relationshipCount: number;
}

interface EntityStatistics {
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  totalRelationships: number;
}

interface TierInfo {
  currentCount: number;
  maxCount: number;
  percentUsed: number;
  tier: string;
}

interface EntityManagementResponse {
  success: boolean;
  data?: {
    entities: EntityWithMetadata[];
    totalEntities: number;
    statistics: EntityStatistics;
    tierInfo?: TierInfo;
  };
  error?: string;
}

// GET: List all entities with relationships and metadata
export const GET = withAuthAndLogging("list entities for management")(async (
  request: NextRequest,
  user: AuthenticatedUser
): Promise<NextResponse<EntityManagementResponse>> => {
  const baseClient = getGlobalNeo4jClient();
  const client = createNeo4jClientWithIntegerConversion(baseClient);

  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const entityType = searchParams.get("entityType");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

    const isAdmin = checkAdminRole(user);

    // Non-admin users must provide workspaceId
    if (!isAdmin && !workspaceId) {
      return NextResponse.json(
        {
          success: false,
          error: "Workspace ID required",
        },
        { status: 400 }
      );
    }

    console.log(
      `📋 Listing entities for user ${user.userId} (workspace: ${workspaceId || "all"}, limit: ${limit}, offset: ${offset})`
    );

    // Build filters
    const filters: string[] = [];

    // Workspace filter (skip for admin viewing all)
    if (workspaceId) {
      filters.push(`e.workspaceId = $workspaceId`);
    }

    // Entity type filter
    if (entityType && entityType !== "all") {
      filters.push(`labels(e)[0] = $entityType`);
    }

    // Status filter
    if (status && status !== "all") {
      filters.push(`e.status = $status`);
    }

    // Exclude system entities
    filters.push(`e.uid IS NOT NULL`);
    filters.push(`NOT e:Evidence`);
    filters.push(`NOT e:File`);

    const whereClause = `WHERE ${filters.join(" AND ")}`;

    // Main query to get entities with their relationship counts
    const entitiesQuery = `
      MATCH (e)
      ${whereClause}
      
      // Get relationship count
      OPTIONAL MATCH (e)-[r]-()
      WITH e, count(DISTINCT r) as relationshipCount
      
      RETURN 
        e.uid as uid,
        labels(e)[0] as type,
        e.name as name,
        COALESCE(e.tags, []) as tags,
        COALESCE(e.aliases, []) as aliases,
        e.createdAt as createdAt,
        e.status as status,
        relationshipCount
        
      ORDER BY e.createdAt DESC
      SKIP $offset
      LIMIT $limit
    `;

    const queryParams: Record<string, any> = {
      limit,
      offset,
    };
    if (workspaceId) queryParams.workspaceId = workspaceId;
    if (entityType && entityType !== "all") queryParams.entityType = entityType;
    if (status && status !== "all") queryParams.status = status;

    const result = await client.executeRead(entitiesQuery, queryParams);

    // Process results
    const entities: EntityWithMetadata[] = result.records.map(
      (record: any) => ({
        uid: record.get("uid"),
        type: record.get("type") || "Unknown",
        name: record.get("name") || "Unnamed",
        tags: record.get("tags") || [],
        aliases: record.get("aliases") || [],
        createdAt: record.get("createdAt") || new Date().toISOString(),
        status: record.get("status"),
        relationshipCount:
          typeof record.get("relationshipCount") === "number"
            ? record.get("relationshipCount")
            : Number(record.get("relationshipCount")) || 0,
      })
    );

    // Get statistics
    const statsQuery = `
      MATCH (e)
      ${whereClause}
      
      OPTIONAL MATCH (e)-[r]-()
      WITH e, count(DISTINCT r) as relCount
      
      RETURN 
        count(DISTINCT e) as totalEntities,
        collect(DISTINCT labels(e)[0]) as types,
        collect(DISTINCT e.status) as statuses,
        sum(relCount) as totalRelationships
    `;

    const statsResult = await client.executeRead(
      statsQuery,
      entityType || status || workspaceId ? queryParams : {}
    );

    const statsRecord = statsResult.records[0];
    const types = statsRecord.get("types") || [];
    const statuses = statsRecord.get("statuses") || [];
    const totalRelationships = statsRecord.get("totalRelationships") || 0;

    // Count entities by type
    const byTypeQuery = `
      MATCH (e)
      ${whereClause}
      RETURN labels(e)[0] as type, count(e) as count
    `;

    const typeResult = await client.executeRead(
      byTypeQuery,
      entityType || status || workspaceId ? queryParams : {}
    );

    const byType: Record<string, number> = {};
    typeResult.records.forEach((record: any) => {
      const type = record.get("type");
      const count = record.get("count");
      if (type) {
        byType[type] = typeof count === "number" ? count : Number(count) || 0;
      }
    });

    // Count entities by status
    const byStatusQuery = `
      MATCH (e)
      ${whereClause}
      RETURN e.status as status, count(e) as count
    `;

    const statusResult = await client.executeRead(
      byStatusQuery,
      entityType || status || workspaceId ? queryParams : {}
    );

    const byStatus: Record<string, number> = {};
    statusResult.records.forEach((record: any) => {
      const status = record.get("status") || "active";
      const count = record.get("count");
      byStatus[status] = typeof count === "number" ? count : Number(count) || 0;
    });

    const statistics: EntityStatistics = {
      byType,
      byStatus,
      totalRelationships:
        typeof totalRelationships === "number"
          ? totalRelationships
          : Number(totalRelationships) || 0,
    };

    // Calculate tier info if workspaceId provided
    let tierInfo: TierInfo | undefined;
    if (workspaceId) {
      try {
        // Get Clerk user to access tier and org info
        const { userId } = await auth();
        if (!userId) {
          throw new Error("User not found");
        }

        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        const tier = getUserTier(clerkUser);
        const limits = getTierLimits(tier);

        // Get org ID from Clerk organization memberships
        const organizationMemberships =
          await client.users.getOrganizationMembershipList({ userId });
        const orgId = organizationMemberships.data[0]?.organization?.id;
        const currentCount = orgId ? await getEntityCount(orgId) : 0;

        tierInfo = {
          currentCount,
          maxCount: limits.maxEntities,
          percentUsed:
            limits.maxEntities > 0
              ? (currentCount / limits.maxEntities) * 100
              : 0,
          tier,
        };
      } catch (error) {
        console.warn("Failed to calculate tier info:", error);
      }
    }

    const totalEntities = statsRecord.get("totalEntities");

    console.log(
      `📊 Found ${entities.length} entities (total: ${totalEntities})`
    );

    return NextResponse.json({
      success: true,
      data: {
        entities,
        totalEntities:
          typeof totalEntities === "number"
            ? totalEntities
            : Number(totalEntities) || 0,
        statistics,
        tierInfo,
      },
    });
  } catch (error) {
    console.error("Entity management API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to list entities",
      },
      { status: 500 }
    );
  }
});
