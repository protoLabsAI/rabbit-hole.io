/**
 * Atlas CRUD API - Simplified interface for adding entities and relationships
 *
 * Compatible with existing Atlas interface but using Schema v2.0 backend
 */

import { NextRequest, NextResponse } from "next/server";

import { enforceEntityLimit, TierLimitError } from "@protolabsai/auth";
import { getGlobalNeo4jClient } from "@protolabsai/database";
import {
  generateSimpleEntityUID,
  getRelationshipType,
  generateSimpleRelationshipUID,
} from "@protolabsai/types";

import { requireAuthenticated, unauthorizedResponse } from "@/lib/auth-guards";

interface CreateEntityRequest {
  action: "add-entity";
  data: {
    label: string;
    entityType: string;
    id?: string;
    tags?: string | string[];
    aka?: string | string[];
    // Additional properties for specialized entities (files, etc.)
    [key: string]: any;
  };
}

interface CreateRelationshipRequest {
  action: "add-relationship";
  data: {
    source: string;
    target: string;
    label: string;
    type?: string;
    confidence?: number;
    notes?: string;
    since?: string;
  };
}

// generateUID function replaced with centralized generateEntityUID from @protolabsai/types

export async function POST(request: NextRequest) {
  // Check authentication (tier enforcement happens per-action)
  const auth = await requireAuthenticated(request);
  if (!auth.authorized) {
    return unauthorizedResponse(auth);
  }

  const client = getGlobalNeo4jClient();

  try {
    // Get authenticated user and org context
    const user = auth.user;
    const clerkOrgId =
      request.headers.get("x-clerk-org-id") ||
      (user?.publicMetadata?.defaultOrgId as string) ||
      "public";

    const body = await request.json();
    const { action, data } = body;

    if (action === "add-entity") {
      const entityData = data as CreateEntityRequest["data"];

      // TIER ENFORCEMENT: Check entity limit before creation
      // Skip for File entities - they're excluded from entity count
      if (user && entityData.entityType !== "file") {
        try {
          await enforceEntityLimit(user, clerkOrgId);
        } catch (error) {
          if (error instanceof TierLimitError) {
            return NextResponse.json(
              {
                success: false,
                ...error.toJSON(),
              },
              { status: 402 }
            );
          }
          throw error;
        }
      }

      // Generate UID if not provided using centralized function
      const uid = entityData.id
        ? entityData.id.includes(":")
          ? entityData.id
          : generateSimpleEntityUID(entityData.entityType, entityData.label)
        : generateSimpleEntityUID(entityData.entityType, entityData.label);

      // Convert tags and aliases to arrays
      const tags =
        typeof entityData.tags === "string"
          ? entityData.tags
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t)
          : entityData.tags || [];

      const aliases =
        typeof entityData.aka === "string"
          ? entityData.aka
              .split(",")
              .map((a) => a.trim())
              .filter((a) => a)
          : entityData.aka || [];

      // Determine entity labels for Neo4j
      let mainLabel =
        entityData.entityType.charAt(0).toUpperCase() +
        entityData.entityType.slice(1);
      let subLabel = "";

      if (entityData.entityType === "person") {
        if (tags.includes("politician")) subLabel = ":Politician";
        else if (tags.includes("conspiracy_theorist")) subLabel = ":Influencer";
      } else if (entityData.entityType === "platform") {
        if (tags.includes("social_media")) subLabel = ":Social";
      } else if (entityData.entityType === "media") {
        mainLabel = "Organization";
        subLabel = ":MediaOutlet";
      } else if (entityData.entityType === "file") {
        mainLabel = "File";
        // File subtypes based on tags
        if (tags.includes("document")) subLabel = ":Document";
        else if (tags.includes("image")) subLabel = ":Image";
        else if (tags.includes("video")) subLabel = ":Video";
        else if (tags.includes("audio")) subLabel = ":Audio";
      }

      // Prepare additional properties for specialized entities
      const additionalProps: Record<string, any> = {};

      // Extract file-specific properties
      if (entityData.entityType === "file") {
        if (entityData.size) additionalProps.size = entityData.size;
        if (entityData.mediaType)
          additionalProps.mediaType = entityData.mediaType;
        if (entityData.contentHash)
          additionalProps.contentHash = entityData.contentHash;
        if (entityData.canonicalKey)
          additionalProps.canonicalKey = entityData.canonicalKey;
        if (entityData.uploadId) additionalProps.uploadId = entityData.uploadId;
        if (entityData.uploadedAt)
          additionalProps.uploadedAt = entityData.uploadedAt;
        // Processing state tracking
        if (entityData.processingState)
          additionalProps.processingState = entityData.processingState;
        if (entityData.queuedAt) additionalProps.queuedAt = entityData.queuedAt;
        if (entityData.processedAt)
          additionalProps.processedAt = entityData.processedAt;
        if (entityData.processingError)
          additionalProps.processingError = entityData.processingError;
        // Ownership and access control
        if (entityData.uploadedBy)
          additionalProps.uploadedBy = entityData.uploadedBy;
        if (entityData.workspaceId)
          additionalProps.workspaceId = entityData.workspaceId;
        if (entityData.orgId) additionalProps.orgId = entityData.orgId;
        if (entityData.accessLevel)
          additionalProps.accessLevel = entityData.accessLevel;
      }

      // Create entity in Neo4j
      const query = `
        CREATE (n:${mainLabel}${subLabel} {
          uid: $uid,
          name: $name,
          tags: $tags,
          aliases: $aliases,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        SET n += $additionalProps
        RETURN n
      `;

      const result = await client.executeWrite(query, {
        uid,
        name: entityData.label,
        tags,
        aliases,
        additionalProps,
      });

      if (result.records.length === 0) {
        throw new Error("Failed to create entity");
      }

      const createdNode = result.records[0].get("n");

      return NextResponse.json({
        success: true,
        data: {
          entity: {
            uid: createdNode.properties.uid,
            name: createdNode.properties.name,
            type: mainLabel,
            tags: createdNode.properties.tags,
            aliases: createdNode.properties.aliases,
          },
          message: `${mainLabel} "${entityData.label}" created successfully`,
        },
      });
    } else if (action === "add-relationship") {
      const relData = data as CreateRelationshipRequest["data"];

      // Generate relationship UID using centralized function
      const relUID = generateSimpleRelationshipUID(relData.type || "generic");

      // Map relationship type using centralized function
      const neoRelType = getRelationshipType(relData.type || "generic");

      const query = `
        MATCH (source {uid: $sourceUid}), (target {uid: $targetUid})
        CREATE (source)-[r:${neoRelType} {
          uid: $relUID,
          confidence: $confidence,
          notes: $notes,
          createdAt: datetime(),
          updatedAt: datetime()
        }]->(target)
        RETURN r, source, target
      `;

      const result = await client.executeWrite(query, {
        sourceUid: relData.source,
        targetUid: relData.target,
        relUID,
        confidence: relData.confidence || 0.8,
        notes: relData.notes,
      });

      if (result.records.length === 0) {
        throw new Error(
          "Failed to create relationship - entities may not exist"
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          relationship: {
            uid: relUID,
            source: relData.source,
            target: relData.target,
            type: neoRelType,
            label: relData.label,
            confidence: relData.confidence || 0.8,
          },
          message: `${neoRelType} relationship created successfully`,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown action: ${action}`,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Atlas CRUD API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Operation failed: ${error}`,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      api: "Atlas CRUD v2.0",
      endpoints: {
        "POST /": "Create entities and relationships",
        "GET /": "API information",
      },
      actions: ["add-entity", "add-relationship"],
      schema: "v2.0",
    },
  });
}
