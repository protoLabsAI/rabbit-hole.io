/**
 * Export Bundle API - Rabbit Hole Schema
 *
 * Exports current graph data in importable Rabbit Hole schema format.
 * Perfect for sharing investigations, backups, and cross-instance transfers.
 */

import { NextRequest, NextResponse } from "next/server";

import { getGlobalNeo4jClient } from "@proto/database";
import { validateRabbitHoleBundle } from "@proto/types";

interface ExportFilters {
  entityTypes?: string[];
  fromDate?: string;
  toDate?: string;
  includeContent?: boolean;
  includeEvidence?: boolean;
  includeFiles?: boolean;
}

export async function GET(request: NextRequest) {
  // Check authentication
<<<<<<< HEAD
  const userId = "local-user";
=======
  const { userId } = { userId: "local-user" };
>>>>>>> origin/main

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication required to export data",
      },
      { status: 401 }
    );
  }

  const client = getGlobalNeo4jClient();

  try {
    const { searchParams } = new URL(request.url);

    console.log(`📤 Export request from authenticated user: ${userId}`);

    // Parse export filters
    const filters: ExportFilters = {
      entityTypes: searchParams.get("types")?.split(",") || undefined,
      fromDate: searchParams.get("from") || undefined,
      toDate: searchParams.get("to") || undefined,
      includeContent: searchParams.get("includeContent") !== "false",
      includeEvidence: searchParams.get("includeEvidence") !== "false",
      includeFiles: searchParams.get("includeFiles") !== "false",
    };

    console.log("📤 Exporting Rabbit Hole bundle with filters:", filters);

    // Export entities (Person, Organization, Platform, Movement, Event)
    let entitiesQuery = `
      MATCH (n)
      WHERE n.uid IS NOT NULL 
        AND NOT n:Content 
        AND NOT n:Evidence 
        AND NOT n:File
        AND n.name IS NOT NULL
    `;

    if (filters.entityTypes) {
      const safeTypes = filters.entityTypes
        .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
        .filter((t) =>
          ["Person", "Organization", "Platform", "Movement", "Event"].includes(
            t
          )
        );

      if (safeTypes.length > 0) {
        entitiesQuery += ` AND labels(n)[0] IN [${safeTypes.map((t) => `'${t}'`).join(", ")}]`;
      }
    }

    entitiesQuery += `
      RETURN n.uid as uid,
             labels(n)[0] as type,
             n.name as name,
             n.aliases as aliases,
             n.tags as tags,
             properties(n) as allProperties
      ORDER BY n.name
    `;

    const entitiesResult = await client.executeRead(entitiesQuery);

    // Helper function to convert Neo4j objects to serializable format
    const convertValue = (value: any): any => {
      if (value === null || value === undefined) return undefined;

      // Handle Neo4j temporal types
      if (value && typeof value === "object" && "toString" in value) {
        return value.toString();
      }

      // Handle arrays
      if (Array.isArray(value)) {
        return value.map(convertValue);
      }

      // Handle objects
      if (typeof value === "object") {
        return Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, convertValue(v)])
        );
      }

      return value;
    };

    const entities = entitiesResult.records.map((record: any) => {
      const properties = record.get("allProperties");

      // Define universal properties that should be at entity level
      const universalProperties = [
        "uid",
        "name",
        "type",
        "aliases",
        "tags",
        "createdAt",
        "updatedAt",
        "communityId",
        "speechActs_hostile",
        "speechActs_supportive",
        "speechActs_neutral",
        "speechActs_total",
        "degree_in",
        "degree_out",
        "degree_total",
        "lastActiveAt",
        // Universal geospatial properties
        "latitude",
        "longitude",
        "altitude",
        "coordinate_accuracy",
        "altitude_accuracy",
        "geometry_type",
        "coordinates_verified",
        "address",
        "timezone",
        // Universal temporal properties
        "created_date",
        "destroyed_date",
        "active_from_date",
        "active_to_date",
        "first_observed_date",
        "last_observed_date",
        // Universal status and events
        "status",
        "relatedEvents",
      ];

      // Separate universal properties from entity-specific properties
      const entitySpecificProps: any = {};
      const universalProps: any = {};

      Object.entries(properties).forEach(([key, value]) => {
        if (universalProperties.includes(key)) {
          universalProps[key] = convertValue(value);
        } else {
          entitySpecificProps[key] = convertValue(value);
        }
      });

      return {
        uid: record.get("uid"),
        type: record.get("type"),
        name: record.get("name"),
        aliases: record.get("aliases") || undefined,
        tags: record.get("tags") || undefined,
        // Universal geospatial properties (if present)
        ...(universalProps.latitude !== undefined && {
          latitude: universalProps.latitude,
        }),
        ...(universalProps.longitude !== undefined && {
          longitude: universalProps.longitude,
        }),
        ...(universalProps.altitude !== undefined && {
          altitude: universalProps.altitude,
        }),
        ...(universalProps.coordinate_accuracy !== undefined && {
          coordinate_accuracy: universalProps.coordinate_accuracy,
        }),
        ...(universalProps.altitude_accuracy !== undefined && {
          altitude_accuracy: universalProps.altitude_accuracy,
        }),
        ...(universalProps.geometry_type && {
          geometry_type: universalProps.geometry_type,
        }),
        ...(universalProps.coordinates_verified !== undefined && {
          coordinates_verified: universalProps.coordinates_verified,
        }),
        ...(universalProps.address && { address: universalProps.address }),
        ...(universalProps.timezone && { timezone: universalProps.timezone }),
        // Universal temporal properties (if present)
        ...(universalProps.created_date && {
          created_date: universalProps.created_date,
        }),
        ...(universalProps.destroyed_date && {
          destroyed_date: universalProps.destroyed_date,
        }),
        ...(universalProps.active_from_date && {
          active_from_date: universalProps.active_from_date,
        }),
        ...(universalProps.active_to_date && {
          active_to_date: universalProps.active_to_date,
        }),
        ...(universalProps.first_observed_date && {
          first_observed_date: universalProps.first_observed_date,
        }),
        ...(universalProps.last_observed_date && {
          last_observed_date: universalProps.last_observed_date,
        }),
        // Universal status and events
        ...(universalProps.status && { status: universalProps.status }),
        ...(universalProps.relatedEvents && {
          relatedEvents: universalProps.relatedEvents,
        }),
        // Entity-specific properties
        properties:
          Object.keys(entitySpecificProps).length > 0
            ? entitySpecificProps
            : undefined,
      };
    });

    console.log(`📊 Exported ${entities.length} entities`);

    // Export relationships between entities
    const entityUids = entities.map((e) => e.uid);

    let relationshipsQuery = `
      MATCH (source)-[r]->(target)
      WHERE source.uid IN $entityUids 
        AND target.uid IN $entityUids
        AND r.uid IS NOT NULL
    `;

    if (filters.fromDate) {
      relationshipsQuery += ` AND coalesce(r.at, r.createdAt) >= datetime($fromDate + 'T00:00:00Z')`;
    }

    if (filters.toDate) {
      relationshipsQuery += ` AND coalesce(r.at, r.createdAt) <= datetime($toDate + 'T23:59:59Z')`;
    }

    relationshipsQuery += `
      RETURN r.uid as uid,
             type(r) as type,
             source.uid as source,
             target.uid as target,
             r.at as at,
             properties(r) as allProperties
      ORDER BY coalesce(r.at, r.createdAt) DESC
    `;

    const queryParams: any = { entityUids };
    if (filters.fromDate) queryParams.fromDate = filters.fromDate;
    if (filters.toDate) queryParams.toDate = filters.toDate;

    const relationshipsResult = await client.executeRead(
      relationshipsQuery,
      queryParams
    );

    const relationships = relationshipsResult.records.map((record: any) => {
      const properties = record.get("allProperties");

      // Remove internal properties
      const cleanProperties = Object.fromEntries(
        Object.entries(properties).filter(
          ([key]) => !["uid", "createdAt", "updatedAt"].includes(key)
        )
      );

      // Use the helper function defined above
      const convertedProperties = Object.fromEntries(
        Object.entries(cleanProperties).map(([key, value]) => [
          key,
          convertValue(value),
        ])
      );

      const finalProperties =
        Object.keys(convertedProperties).length > 0
          ? convertedProperties
          : undefined;

      // Ensure evidence_uids is always an array of strings when present
      if (finalProperties?.evidence_uids) {
        if (!Array.isArray(finalProperties.evidence_uids)) {
          const rawValue = String(finalProperties.evidence_uids);
          // Handle comma-separated strings (legacy format)
          if (rawValue.includes(",")) {
            finalProperties.evidence_uids = rawValue
              .split(",")
              .map((uid) => uid.trim());
          } else {
            finalProperties.evidence_uids = [rawValue];
          }
        } else {
          // Ensure all items are strings and handle comma-separated strings in array elements
          finalProperties.evidence_uids = finalProperties.evidence_uids.flatMap(
            (uid: unknown) => {
              const stringUid = String(uid);
              return stringUid.includes(",")
                ? stringUid.split(",").map((u) => u.trim())
                : [stringUid];
            }
          );
        }
      }

      return {
        uid: record.get("uid"),
        type: record.get("type"),
        source: record.get("source"),
        target: record.get("target"),
        at: record.get("at")?.toString() || undefined,
        properties: finalProperties,
      };
    });

    console.log(`📊 Exported ${relationships.length} relationships`);

    // Collect referenced content, evidence, and files if requested
    const referencedUids = new Set<string>();

    relationships.forEach((rel: any) => {
      if (rel.target.startsWith("content:")) referencedUids.add(rel.target);
      if (rel.target.startsWith("evidence:")) referencedUids.add(rel.target);
      if (rel.target.startsWith("file:")) referencedUids.add(rel.target);

      // Evidence references in properties - handle both arrays and comma-separated strings
      const evidenceUids = rel.properties?.evidence_uids;
      if (evidenceUids) {
        let uidsToProcess: string[] = [];

        if (Array.isArray(evidenceUids)) {
          // Handle array format (may contain comma-separated strings)
          uidsToProcess = evidenceUids.flatMap((uid) => {
            const stringUid = String(uid);
            return stringUid.includes(",")
              ? stringUid.split(",").map((u) => u.trim())
              : [stringUid];
          });
        } else {
          // Handle single value (may be comma-separated string)
          const stringUid = String(evidenceUids);
          uidsToProcess = stringUid.includes(",")
            ? stringUid.split(",").map((u) => u.trim())
            : [stringUid];
        }

        uidsToProcess.forEach((uid) => referencedUids.add(uid));
      }
    });

    let content: unknown[] = [];
    let evidence: unknown[] = [];
    let files: unknown[] = [];

    if (referencedUids.size > 0) {
      const referencedUidsList = Array.from(referencedUids);

      // Export referenced content
      if (filters.includeContent) {
        const contentUids = referencedUidsList.filter((uid) =>
          uid.startsWith("content:")
        );

        if (contentUids.length > 0) {
          const contentResult = await client.executeRead(
            `
            MATCH (c:Content)
            WHERE c.uid IN $contentUids
            RETURN c.uid as uid,
                   c.content_type as content_type,
                   c.platform_uid as platform_uid,
                   c.author_uid as author_uid,
                   c.published_at as published_at,
                   c.url as url,
                   c.text_excerpt as text_excerpt
            ORDER BY c.published_at DESC
          `,
            { contentUids }
          );

          content = contentResult.records.map((record: any) => ({
            uid: record.get("uid"),
            content_type: record.get("content_type"),
            platform_uid: record.get("platform_uid") || undefined,
            author_uid: record.get("author_uid") || undefined,
            published_at: record.get("published_at")?.toString(),
            url: record.get("url") || undefined,
            text_excerpt: record.get("text_excerpt") || undefined,
          }));
        }
      }

      // Export referenced evidence
      if (filters.includeEvidence) {
        const evidenceUids = referencedUidsList.filter((uid) =>
          uid.startsWith("evidence:")
        );

        if (evidenceUids.length > 0) {
          const evidenceResult = await client.executeRead(
            `
            MATCH (e:Evidence)
            WHERE e.uid IN $evidenceUids
            RETURN e.uid as uid,
                   e.kind as kind,
                   e.title as title,
                   e.publisher as publisher,
                   e.date as date,
                   e.url as url,
                   e.archive as archive,
                   e.retrieved_at as retrieved_at,
                   e.reliability as reliability,
                   e.notes as notes
            ORDER BY e.date DESC
          `,
            { evidenceUids }
          );

          evidence = evidenceResult.records.map((record: any) => ({
            uid: record.get("uid"),
            kind: record.get("kind"),
            title: record.get("title"),
            publisher: record.get("publisher"),
            date: record.get("date")?.toString(),
            url: record.get("url"),
            archive: record.get("archive") || undefined,
            retrieved_at: record.get("retrieved_at")?.toString() || undefined,
            reliability: record.get("reliability") || undefined,
            notes: record.get("notes") || undefined,
          }));
        }
      }

      // Export referenced files
      if (filters.includeFiles) {
        const fileUids = referencedUidsList.filter((uid) =>
          uid.startsWith("file:")
        );

        if (fileUids.length > 0) {
          const filesResult = await client.executeRead(
            `
            MATCH (f:File)
            WHERE f.uid IN $fileUids
            RETURN f.uid as uid,
                   f.content_hash as content_hash,
                   f.mime as mime,
                   f.bytes as bytes,
                   f.bucket as bucket,
                   f.key as key,
                   f.aliases as aliases
            ORDER BY f.key
          `,
            { fileUids }
          );

          files = filesResult.records.map((record: any) => ({
            uid: record.get("uid"),
            content_hash: record.get("content_hash"),
            mime: record.get("mime"),
            bytes: record.get("bytes") || undefined,
            bucket: record.get("bucket"),
            key: record.get("key"),
            aliases: record.get("aliases") || undefined,
          }));
        }
      }
    }

    // Build Rabbit Hole bundle
    const bundle = {
      evidence: evidence.length > 0 ? evidence : undefined,
      files: files.length > 0 ? files : undefined,
      content: content.length > 0 ? content : undefined,
      entities,
      relationships: relationships.length > 0 ? relationships : undefined,
    };

    // Remove undefined fields for cleaner export
    const cleanBundle = Object.fromEntries(
      Object.entries(bundle).filter(([, value]) => value !== undefined)
    );

    // Validate the export before sending
    console.log("🔍 Validating export bundle...");
    const validation = validateRabbitHoleBundle(cleanBundle);

    if (!validation.isValid) {
      console.error("❌ Export validation failed:");
      console.error(validation.errors);
      return NextResponse.json(
        {
          success: false,
          error: `Export validation failed:\n\n${validation.errors}`,
        },
        { status: 500 }
      );
    }

    console.log("✅ Export bundle validation passed!");
    console.log("📦 Export bundle created:");
    console.log(`   📄 Evidence: ${evidence.length}`);
    console.log(`   📁 Files: ${files.length}`);
    console.log(`   📝 Content: ${content.length}`);
    console.log(`   👥 Entities: ${entities.length}`);
    console.log(`   🔗 Relationships: ${relationships.length}`);

    // Generate filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")[0];
    const filename = `rabbit-hole-export-${timestamp}.json`;

    return new NextResponse(JSON.stringify(cleanBundle, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Export-Summary": JSON.stringify({
          entities: entities.length,
          relationships: relationships.length,
          content: content.length,
          evidence: evidence.length,
          files: files.length,
          exportedAt: new Date().toISOString(),
        }),
      },
    });
  } catch (error) {
    console.error("Export bundle error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to export bundle",
      },
      { status: 500 }
    );
  } finally {
    // No session cleanup needed - @proto/database handles connection management
  }
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: "/api/export-bundle",
      description:
        "Export current graph data in importable Rabbit Hole schema format",
      method: "GET",
      parameters: {
        types:
          "Comma-separated entity types: person,organization,platform (optional)",
        from: "Start date YYYY-MM-DD (optional)",
        to: "End date YYYY-MM-DD (optional)",
        includeContent: "Include content nodes (default: true)",
        includeEvidence: "Include evidence nodes (default: true)",
        includeFiles: "Include file nodes (default: true)",
      },
    },
    usage: {
      examples: [
        "/api/export-bundle",
        "/api/export-bundle?types=person,platform",
        "/api/export-bundle?from=2024-01-01&to=2024-12-31",
        "/api/export-bundle?includeContent=false&includeFiles=false",
      ],
    },
    returns: {
      format: "JSON file download in Rabbit Hole schema format",
      structure: "Compatible with /api/ingest-bundle for re-import",
      filename: "rabbit-hole-export-YYYY-MM-DD.json",
    },
  });
}
