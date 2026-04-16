/**
 * Data Integrity Check API
 *
 * Validates data consistency across the knowledge graph:
 * - Orphaned files (files without entities or evidence)
 * - Broken relationships (relationships pointing to non-existent entities)
 * - Missing processing states
 * - Inconsistent file metadata
 */

import { NextRequest, NextResponse } from "next/server";

import {
  withAuthAndLogging,
  checkAdminRole,
  type AuthenticatedUser,
} from "@protolabsai/auth";
import { getGlobalNeo4jClient } from "@protolabsai/database";

interface IntegrityIssue {
  type:
    | "orphaned_file"
    | "broken_relationship"
    | "missing_processing_state"
    | "inconsistent_metadata";
  severity: "critical" | "warning" | "info";
  entity: {
    uid: string;
    name?: string;
    type: string;
  };
  description: string;
  suggestedAction: string;
  affectedCount?: number;
}

interface IntegrityCheckResponse {
  success: boolean;
  data?: {
    issues: IntegrityIssue[];
    summary: {
      totalIssues: number;
      critical: number;
      warnings: number;
      info: number;
      lastChecked: string;
    };
    systemHealth: {
      score: number; // 0-100
      status: "healthy" | "degraded" | "critical";
    };
  };
  error?: string;
}

export const GET = withAuthAndLogging("run integrity check")(async (
  request: NextRequest,
  user: AuthenticatedUser
): Promise<NextResponse<IntegrityCheckResponse>> => {
  const client = getGlobalNeo4jClient();

  try {
    // Require admin access for system-wide integrity checks
    if (!checkAdminRole(user)) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin access required for system integrity checks",
        },
        { status: 403 }
      );
    }

    console.log("🔍 Running comprehensive data integrity check...");

    const issues: IntegrityIssue[] = [];

    // Check 1: Orphaned Files (files with no relationships or evidence links)
    const orphanedFilesQuery = `
      MATCH (f:File)
      WHERE NOT (f)-[]-(:Evidence) 
        AND NOT (f)-[]->()
        AND f.uid IS NOT NULL
      RETURN f.uid as uid, f.name as name, count(*) as orphanCount
    `;

    const orphanedResult = await client.executeRead(orphanedFilesQuery);
    orphanedResult.records.forEach((record) => {
      issues.push({
        type: "orphaned_file",
        severity: "warning",
        entity: {
          uid: record.get("uid"),
          name: record.get("name"),
          type: "File",
        },
        description:
          "File exists but has no relationships to entities or evidence",
        suggestedAction: "Link to relevant entities or remove if unnecessary",
      });
    });

    // Check 2: Broken Relationships (relationships pointing to missing entities)
    const brokenRelationshipsQuery = `
      MATCH (source)-[rel]->(target)
      WHERE source.uid IS NULL OR target.uid IS NULL
      RETURN 
        rel.uid as relUid,
        type(rel) as relType,
        coalesce(source.uid, 'MISSING') as sourceUid,
        coalesce(target.uid, 'MISSING') as targetUid,
        count(*) as brokenCount
    `;

    const brokenResult = await client.executeRead(brokenRelationshipsQuery);
    brokenResult.records.forEach((record) => {
      issues.push({
        type: "broken_relationship",
        severity: "critical",
        entity: {
          uid: record.get("relUid") || "unknown",
          type: "Relationship",
        },
        description: `Broken ${record.get("relType")} relationship: ${record.get("sourceUid")} → ${record.get("targetUid")}`,
        suggestedAction:
          "Remove broken relationship or restore missing entities",
      });
    });

    // Check 3: Files without processing states
    const missingProcessingStateQuery = `
      MATCH (f:File)
      WHERE f.processingState IS NULL
      RETURN f.uid as uid, f.name as name, count(*) as missingCount
    `;

    const missingStateResult = await client.executeRead(
      missingProcessingStateQuery
    );
    missingStateResult.records.forEach((record) => {
      issues.push({
        type: "missing_processing_state",
        severity: "info",
        entity: {
          uid: record.get("uid"),
          name: record.get("name"),
          type: "File",
        },
        description: "File missing processing state information",
        suggestedAction:
          'Set processingState to "unprocessed" for uploaded files',
      });
    });

    // Check 4: Files with inconsistent metadata
    const inconsistentMetadataQuery = `
      MATCH (f:File)
      WHERE f.size IS NULL 
         OR f.mediaType IS NULL 
         OR f.contentHash IS NULL
         OR f.uploadedAt IS NULL
      RETURN 
        f.uid as uid, 
        f.name as name,
        f.size IS NULL as missingSizeInfo,
        f.mediaType IS NULL as missingMediaType,
        f.contentHash IS NULL as missingContentHash,
        f.uploadedAt IS NULL as missingUploadDate,
        count(*) as inconsistentCount
    `;

    const inconsistentResult = await client.executeRead(
      inconsistentMetadataQuery
    );
    inconsistentResult.records.forEach((record) => {
      const missingFields: string[] = [];
      if (record.get("missingSizeInfo")) missingFields.push("size");
      if (record.get("missingMediaType")) missingFields.push("mediaType");
      if (record.get("missingContentHash")) missingFields.push("contentHash");
      if (record.get("missingUploadDate")) missingFields.push("uploadedAt");

      issues.push({
        type: "inconsistent_metadata",
        severity: "warning",
        entity: {
          uid: record.get("uid"),
          name: record.get("name"),
          type: "File",
        },
        description: `File missing required metadata: ${missingFields.join(", ")}`,
        suggestedAction: "Re-process file metadata or update manually",
      });
    });

    // Calculate summary statistics
    const summary = {
      totalIssues: issues.length,
      critical: issues.filter((i) => i.severity === "critical").length,
      warnings: issues.filter((i) => i.severity === "warning").length,
      info: issues.filter((i) => i.severity === "info").length,
      lastChecked: new Date().toISOString(),
    };

    // Calculate system health score
    let healthScore = 100;
    healthScore -= summary.critical * 20; // Critical issues heavily impact score
    healthScore -= summary.warnings * 5; // Warnings moderately impact score
    healthScore -= summary.info * 1; // Info issues slightly impact score
    healthScore = Math.max(0, healthScore);

    const systemHealth: {
      score: number;
      status: "healthy" | "degraded" | "critical";
    } = {
      score: healthScore,
      status:
        healthScore >= 80
          ? "healthy"
          : healthScore >= 60
            ? "degraded"
            : "critical",
    };

    console.log(`✅ Integrity check complete: ${issues.length} issues found`);
    console.log(`📊 Health score: ${healthScore}/100 (${systemHealth.status})`);

    return NextResponse.json({
      success: true,
      data: {
        issues,
        summary,
        systemHealth,
      },
    });
  } catch (error) {
    console.error("Integrity check error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Integrity check failed",
      },
      { status: 500 }
    );
  }
});

// POST: Fix specific integrity issues
export const POST = withAuthAndLogging("fix integrity issues")(async (
  request: NextRequest,
  user: AuthenticatedUser
): Promise<NextResponse> => {
  const client = getGlobalNeo4jClient();

  try {
    // Require admin access for fixing integrity issues
    if (!checkAdminRole(user)) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin access required to fix integrity issues",
        },
        { status: 403 }
      );
    }

    const { issueType, entityUids } = await request.json();

    console.log(
      `🔧 Fixing integrity issues: ${issueType} for ${entityUids?.length || 0} entities`
    );

    let fixedCount = 0;

    switch (issueType) {
      case "missing_processing_state": {
        // Set processing state to "unprocessed" for files missing this field
        const fixStateQuery = `
          MATCH (f:File)
          WHERE f.uid IN $entityUids AND f.processingState IS NULL
          SET f.processingState = "unprocessed"
          RETURN count(f) as fixed
        `;
        const stateResult = await client.executeRead(fixStateQuery, {
          entityUids,
        });
        fixedCount = stateResult.records[0]?.get("fixed") || 0;
        break;
      }

      case "orphaned_file":
        // For orphaned files, we can't auto-fix - user needs to decide
        return NextResponse.json(
          {
            success: false,
            error:
              "Orphaned files require manual review - link to entities or delete via file management",
          },
          { status: 400 }
        );

      case "broken_relationship": {
        // Remove broken relationships
        const fixRelQuery = `
          MATCH ()-[rel]-()
          WHERE rel.uid IN $entityUids
            AND (startNode(rel).uid IS NULL OR endNode(rel).uid IS NULL)
          DELETE rel
          RETURN count(rel) as fixed
        `;
        const relResult = await client.executeRead(fixRelQuery, { entityUids });
        fixedCount = relResult.records[0]?.get("fixed") || 0;
        break;
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown issue type: ${issueType}`,
          },
          { status: 400 }
        );
    }

    console.log(`✅ Fixed ${fixedCount} ${issueType} issues`);

    return NextResponse.json({
      success: true,
      data: {
        issueType,
        fixedCount,
        message: `Successfully fixed ${fixedCount} ${issueType} issues`,
      },
    });
  } catch (error) {
    console.error("Integrity fix error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fix issues",
      },
      { status: 500 }
    );
  }
});
