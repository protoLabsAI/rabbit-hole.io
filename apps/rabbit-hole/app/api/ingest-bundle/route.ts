/**
 * Bundle Ingest API - CONSOLIDATED VERSION
 *
 * Demonstrates DRY principles using shared utilities:
 * - Uses RabbitHoleBundleSchema from @proto/types (eliminates 70+ line inline interface)
 * - Uses consolidated auth+validation middleware
 * - Uses standardized response types
 * - Uses proper error handling patterns
 */

import { NextRequest, NextResponse } from "next/server";

import { getGlobalNeo4jClient } from "@proto/database";
import {
  RabbitHoleBundleSchema,
  safeValidate,
  type RabbitHoleBundleData,
  CALCULATIONS,
  BundleImportRequestSchema,
  type MergeOptions,
  type ImportSummary,
  type MergeResult,
} from "@proto/types";

// Initialize domains for API route context (serverless function)
// Server instrumentation.ts doesn't apply to API routes in Next.js 15
import { initializeDomains } from "../../domain-loader";

initializeDomains();

// Dynamic import to avoid Turbopack issues with require()
const resolveTenantFromHeaders = async (request: any) => {
  const { resolveTenantFromHeaders: resolver } = await import(
    "@proto/utils/tenancy-server"
  );
  return resolver(request);
};

// ==================== Handler Implementation ====================

const handleBundleIngest = async (
  bundle: RabbitHoleBundleData,
  mergeOptions: MergeOptions | undefined,
  request: NextRequest,
  user: { userId: string },
  context: { orgId: string; namespace: string }
) => {
  const client = getGlobalNeo4jClient();
  const startTime = Date.now();
  const phaseTimings: Record<string, number> = {};
  const { orgId, namespace } = context;

  try {
    console.log(`📦 Processing bundle from user: ${user.userId}`);
    console.log(`🏢 Target namespace: ${namespace} (orgId: ${orgId})`);
    console.log(`📊 Bundle contents:`, {
      evidence: bundle.evidence?.length || 0,
      files: bundle.files?.length || 0,
      content: bundle.content?.length || 0,
      entities: bundle.entities?.length || 0,
      relationships: bundle.relationships?.length || 0,
    });

    const summary: ImportSummary = {
      evidenceCreated: 0,
      evidenceKept: 0,
      filesCreated: 0,
      filesKept: 0,
      contentCreated: 0,
      contentKept: 0,
      entitiesCreated: 0,
      entitiesKept: 0,
      relationshipsCreated: 0,
      relationshipsKept: 0,
      mergeResults: [],
    };

    // Default merge options
    const options: Required<MergeOptions> = {
      strategy: mergeOptions?.strategy || "keep_local",
      preserveTimestamps: mergeOptions?.preserveTimestamps ?? true,
      conflictResolution: mergeOptions?.conflictResolution || "local",
    };

    // Phase 1: Create Evidence
    if (bundle.evidence && bundle.evidence.length > 0) {
      const phaseStart = Date.now();

      for (const evidence of bundle.evidence) {
        const evidenceQuery = `
          MERGE (e:Evidence:${namespace} {uid: $uid})
          SET e += $properties
          SET e.clerk_org_id = $orgId
          SET e.createdAt = COALESCE(e.createdAt, datetime())
          SET e.updatedAt = datetime()
        `;

        await client.executeWrite(evidenceQuery, {
          uid: evidence.uid,
          properties: evidence,
          orgId: orgId,
        });

        summary.evidenceCreated++;
      }

      phaseTimings.evidence = Date.now() - phaseStart;
      console.log(`✅ Created ${summary.evidenceCreated} evidence entries`);
    }

    // Phase 2: Create Files
    if (bundle.files && bundle.files.length > 0) {
      const phaseStart = Date.now();

      for (const file of bundle.files) {
        const fileQuery = `
          MERGE (f:File:${namespace} {uid: $uid})
          SET f += $properties
          SET f.clerk_org_id = $orgId
          SET f.createdAt = COALESCE(f.createdAt, datetime())
          SET f.updatedAt = datetime()
        `;

        await client.executeWrite(fileQuery, {
          uid: file.uid,
          properties: file,
          orgId: orgId,
        });

        summary.filesCreated++;
      }

      phaseTimings.files = Date.now() - phaseStart;
      console.log(`✅ Created ${summary.filesCreated} file entries`);
    }

    // Phase 3: Create Content
    if (bundle.content && bundle.content.length > 0) {
      const phaseStart = Date.now();

      for (const content of bundle.content) {
        const contentQuery = `
          MERGE (c:Content:${namespace} {uid: $uid})
          SET c += $properties
          SET c.clerk_org_id = $orgId
          SET c.createdAt = COALESCE(c.createdAt, datetime())
          SET c.updatedAt = datetime()
        `;

        await client.executeWrite(contentQuery, {
          uid: content.uid,
          properties: content,
          orgId: orgId,
        });

        summary.contentCreated++;
      }

      phaseTimings.content = Date.now() - phaseStart;
      console.log(`✅ Created ${summary.contentCreated} content entries`);
    }

    // Phase 4: Create Entities
    if (bundle.entities && bundle.entities.length > 0) {
      const phaseStart = Date.now();

      for (const entity of bundle.entities) {
        // Determine Neo4j labels
        const mainLabel =
          entity.type.charAt(0).toUpperCase() + entity.type.slice(1);
        const labels = [mainLabel];

        // Add specialized labels based on tags
        if (entity.tags?.includes("politician")) labels.push("Politician");
        if (entity.tags?.includes("influencer")) labels.push("Influencer");

        // Flatten entity properties for Neo4j compatibility
        const flattenedProperties = {
          // Core entity properties
          uid: entity.uid,
          name: entity.name,
          type: entity.type,
          aliases: entity.aliases || [],
          tags: entity.tags || [],

          // Universal geospatial properties (if present)
          ...(entity.latitude !== undefined && {
            latitude: CALCULATIONS.normalizeCoordinate(entity.latitude),
          }), // 6 decimal precision
          ...(entity.longitude !== undefined && {
            longitude: CALCULATIONS.normalizeCoordinate(entity.longitude),
          }),
          ...(entity.altitude !== undefined && {
            altitude: Math.floor(entity.altitude),
          }),
          ...(entity.coordinate_accuracy !== undefined && {
            coordinate_accuracy: entity.coordinate_accuracy,
          }),
          ...(entity.altitude_accuracy !== undefined && {
            altitude_accuracy: entity.altitude_accuracy,
          }),
          ...(entity.geometry_type && { geometry_type: entity.geometry_type }),
          ...(entity.coordinates_verified !== undefined && {
            coordinates_verified: entity.coordinates_verified,
          }),
          ...(entity.address && { address: entity.address }),
          ...(entity.timezone && { timezone: entity.timezone }),

          // Universal temporal properties (if present)
          ...(entity.created_date && { created_date: entity.created_date }),
          ...(entity.destroyed_date && {
            destroyed_date: entity.destroyed_date,
          }),
          ...(entity.active_from_date && {
            active_from_date: entity.active_from_date,
          }),
          ...(entity.active_to_date && {
            active_to_date: entity.active_to_date,
          }),
          ...(entity.first_observed_date && {
            first_observed_date: entity.first_observed_date,
          }),
          ...(entity.last_observed_date && {
            last_observed_date: entity.last_observed_date,
          }),

          // Universal status and events
          ...(entity.status && { status: entity.status }),
          ...(entity.relatedEvents && { relatedEvents: entity.relatedEvents }),

          // Entity-specific properties (flattened from properties object)
          ...(entity.properties &&
            Object.fromEntries(
              Object.entries(entity.properties).map(([key, value]) => [
                key,
                // Ensure all numeric values are Neo4j compatible
                typeof value === "number"
                  ? CALCULATIONS.normalizeCoordinate(value)
                  : value,
              ])
            )),
        };

        // Check if entity exists before applying merge strategy
        const existsQuery = `
          MATCH (e {uid: $uid})
          RETURN e.uid as uid
        `;

        const existsResult = await client.executeRead(existsQuery, {
          uid: entity.uid,
        });
        const entityExists = existsResult.records.length > 0;

        let mergeResult: MergeResult;
        let entityQuery: string;
        let queryParams: any;

        if (!entityExists) {
          // Entity doesn't exist - create it safely with MERGE
          entityQuery = `
            MERGE (e:Entity:${labels.join(":")}:${namespace} {uid: $uid})
            SET e += $properties
            SET e.clerk_org_id = $orgId
            SET e.createdAt = COALESCE(e.createdAt, datetime())
            SET e.updatedAt = datetime()
          `;
          queryParams = {
            uid: entity.uid,
            properties: flattenedProperties,
            orgId: orgId,
          };
          summary.entitiesCreated++;
          mergeResult = { action: "kept_local", entityId: entity.uid }; // Actually created new
        } else {
          // Entity exists - apply merge strategy
          switch (options.strategy) {
            case "keep_local":
              // Skip incoming entity, keep existing
              summary.entitiesKept++;
              mergeResult = {
                action: "kept_local",
                entityId: entity.uid,
                reason: "Local entity preserved",
              };
              entityQuery = ""; // No-op
              break;

            case "replace":
              // Replace existing with incoming
              entityQuery = `
                MATCH (e {uid: $uid})
                SET e = $properties
                SET e:Entity:${labels.join(":")}:${namespace}
                SET e.clerk_org_id = $orgId
                ${options.preserveTimestamps ? "SET e.updatedAt = datetime()" : "SET e.createdAt = datetime(), e.updatedAt = datetime()"}
              `;
              queryParams = {
                uid: entity.uid,
                properties: flattenedProperties,
                orgId: orgId,
              };
              summary.entitiesCreated++; // Count as "created" (replaced)
              mergeResult = {
                action: "replaced",
                entityId: entity.uid,
                reason: "Replaced with incoming entity",
              };
              break;

            default:
              // Future merge strategies (smart, append, etc.)
              // For now, default to keep_local
              summary.entitiesKept++;
              mergeResult = {
                action: "kept_local",
                entityId: entity.uid,
                reason: "Strategy not implemented, kept local",
              };
              entityQuery = "";
              break;
          }
        }

        // Execute query if we have one
        if (entityQuery) {
          await client.executeWrite(entityQuery, queryParams);
        }

        summary.mergeResults.push(mergeResult);
      }

      phaseTimings.entities = Date.now() - phaseStart;
      console.log(`✅ Created ${summary.entitiesCreated} entities`);
    }

    // Phase 5: Create Relationships
    if (bundle.relationships && bundle.relationships.length > 0) {
      const phaseStart = Date.now();

      for (const relationship of bundle.relationships) {
        // Validate both source and target are accessible (public or same org)
        const validationQuery = `
          MATCH (source {uid: $sourceUid})
          MATCH (target {uid: $targetUid})
          WHERE (source.clerk_org_id = 'public' OR source.clerk_org_id = $orgId)
            AND (target.clerk_org_id = 'public' OR target.clerk_org_id = $orgId)
          RETURN source, target
        `;

        const validation = await client.executeRead(validationQuery, {
          sourceUid: relationship.source,
          targetUid: relationship.target,
          orgId: orgId,
        });

        if (validation.records.length === 0) {
          console.warn(
            `⚠️ Skipping relationship ${relationship.uid}: source or target not accessible`
          );
          continue;
        }

        // Flatten relationship properties for Neo4j compatibility
        const flattenedRelProperties = {
          // Core relationship properties
          uid: relationship.uid,
          type: relationship.type,
          source: relationship.source,
          target: relationship.target,

          // Relationship metadata
          ...(relationship.at && { at: relationship.at }),
          ...(relationship.confidence !== undefined && {
            confidence: CALCULATIONS.normalizeConfidence(
              relationship.confidence
            ),
          }),

          // Relationship-specific properties (flattened from properties object)
          ...(relationship.properties &&
            Object.fromEntries(
              Object.entries(relationship.properties).map(([key, value]) => [
                key,
                // Ensure all numeric values are Neo4j compatible
                typeof value === "number"
                  ? CALCULATIONS.normalizeCoordinate(value)
                  : value,
              ])
            )),
        };

        const relationshipQuery = `
          MATCH (source {uid: $source})
          MATCH (target {uid: $target})
          WHERE (source.clerk_org_id = 'public' OR source.clerk_org_id = $orgId)
            AND (target.clerk_org_id = 'public' OR target.clerk_org_id = $orgId)
          MERGE (source)-[r:${relationship.type} {uid: $uid}]->(target)
          SET r += $properties
          SET r.clerk_org_id = $orgId
          SET r.createdAt = COALESCE(r.createdAt, datetime())
          SET r.updatedAt = datetime()
        `;

        await client.executeWrite(relationshipQuery, {
          source: relationship.source,
          target: relationship.target,
          uid: relationship.uid,
          properties: flattenedRelProperties,
          orgId: orgId,
        });

        summary.relationshipsCreated++;
      }

      phaseTimings.relationships = Date.now() - phaseStart;
      console.log(`✅ Created ${summary.relationshipsCreated} relationships`);
    }

    const totalMs = Date.now() - startTime;

    console.log(`🎉 Bundle ingest completed in ${totalMs}ms`);
    console.log(`📈 Phase timings:`, phaseTimings);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        timing: {
          totalMs,
          phaseTimings,
        },
      },
      metadata: {
        userId: user.userId,
        processingTimeMs: totalMs,
      },
    });
  } catch (error) {
    const totalMs = Date.now() - startTime;
    console.error(`❌ Bundle ingest failed after ${totalMs}ms:`, error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bundle ingest failed",
        metadata: {
          userId: user.userId,
          processingTimeMs: totalMs,
        },
      },
      { status: 500 }
    );
  } finally {
    // Connection cleanup handled by @proto/database
  }
};

// ==================== Route Export ====================

export async function POST(request: NextRequest) {
  const userId = "local-user"; const orgId = "local-org"; const has = () => true;

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication required to ingest bundle data",
      },
      { status: 401 }
    );
  }
  try {
    const body = await request.json();
    const { scope } = body;

    let bundleData: RabbitHoleBundleData;
    let mergeOptions: MergeOptions | undefined;

    // Check if this is the new format with merge options
    if (body.data && body.mergeOptions !== undefined) {
      // New format: { data: RabbitHoleBundleData, mergeOptions: MergeOptions }
      const requestValidation = safeValidate(BundleImportRequestSchema, body);
      if (!requestValidation.success) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid import request: ${requestValidation.error}`,
          },
          { status: 400 }
        );
      }

      // Validate the bundle data portion
      const bundleValidation = safeValidate(RabbitHoleBundleSchema, body.data);
      if (!bundleValidation.success) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid bundle data: ${bundleValidation.error}`,
          },
          { status: 400 }
        );
      }

      bundleData = bundleValidation.data as RabbitHoleBundleData;
      mergeOptions = body.mergeOptions;
    } else {
      // Legacy format: direct RabbitHoleBundleData (backward compatible)
      const validation = safeValidate(RabbitHoleBundleSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid bundle data: ${validation.error}`,
          },
          { status: 400 }
        );
      }

      bundleData = validation.data as RabbitHoleBundleData;
      mergeOptions = undefined; // Will use default "keep_local"
    }

    // Determine target namespace
    let targetOrgId: string;
    let targetNamespace: string;

    if (scope === "public") {
      // Only admins can import public data
      const isAdmin =
        has && (has({ role: "org:admin" }) || has({ role: "org:owner" }));

      if (!isAdmin) {
        return NextResponse.json(
          { error: "Admin access required to import public data" },
          { status: 403 }
        );
      }

      targetOrgId = "public";
      targetNamespace = "org_public";
      console.log("📢 Importing to PUBLIC namespace (accessible to all)");
    } else {
      // Tenant-scoped import (default) - fallback to public for dev
      if (orgId) {
        const tenant = await resolveTenantFromHeaders(request);
        if (tenant) {
          targetOrgId = tenant.clerkOrgId;
          targetNamespace = tenant.neo4jNamespace;
          console.log(`🔒 Importing to TENANT namespace: ${targetNamespace}`);
        } else {
          // Fallback to public if no tenant found
          targetOrgId = "public";
          targetNamespace = "org_public";
          console.log("📢 No tenant found, importing to PUBLIC namespace");
        }
      } else {
        // No org context - use public namespace (dev mode)
        targetOrgId = "public";
        targetNamespace = "org_public";
        console.log(
          "📢 No org context, importing to PUBLIC namespace (dev mode)"
        );
      }
    }

    // Use authenticated user
    const user = { userId };
    const context = { orgId: targetOrgId, namespace: targetNamespace };
    return await handleBundleIngest(
      bundleData,
      mergeOptions,
      request,
      user,
      context
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bundle ingest failed",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      api: "Bundle Ingest API",
      version: "2.0 - Consolidated",
      description:
        "Ingests validated Rabbit Hole bundle data using shared schemas",
      authentication: "required",
      schema: "RabbitHoleBundleSchema",
      example: {
        entities: [
          {
            uid: "person:example",
            type: "Person",
            name: "Example Person",
            aliases: ["Example"],
            tags: ["politician"],
          },
        ],
        relationships: [
          {
            uid: "rel:example_relationship",
            type: "ENDORSES",
            source: "person:example",
            target: "person:other",
          },
        ],
        evidence: [
          {
            uid: "evidence:example",
            kind: "major_media",
            title: "Example Evidence",
            publisher: "Example News",
            date: "2024-01-15",
            url: "https://example.com/article",
          },
        ],
      },
    },
  });
}
