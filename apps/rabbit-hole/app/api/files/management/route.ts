/**
 * File Management API
 *
 * Provides comprehensive file management capabilities including:
 * - List all files with metadata and relationships
 * - Delete files with cascade relationship removal
 * - Data integrity checks and validation
 */

import neo4j from "neo4j-driver";
import { NextRequest, NextResponse } from "next/server";

import {
  withAuthAndLogging,
  checkAdminRole,
  type AuthenticatedUser,
} from "@proto/auth";
import { getGlobalNeo4jClient } from "@proto/database";

interface FileWithRelationships {
  uid: string;
  name: string;
  size: number;
  sizeFormatted: string;
  mediaType: string;
  contentHash: string;
  canonicalKey?: string;
  processingState: string;
  uploadedAt: string;
  uploadId?: string;
  relationships: Array<{
    id: string;
    type: string;
    targetEntity: {
      uid: string;
      name: string;
      type: string;
    };
    confidence: number;
    label?: string;
  }>;
  evidenceLinks: Array<{
    evidenceUid: string;
    evidenceTitle: string;
    evidenceType: string;
  }>;
  processingInfo?: {
    queuedAt?: string;
    processedAt?: string;
    processingError?: string;
    extractedText?: string;
    thumbnailUrl?: string;
  };
}

interface FileManagementResponse {
  success: boolean;
  data?: {
    files: FileWithRelationships[];
    totalFiles: number;
    statistics: {
      byProcessingState: Record<string, number>;
      byMediaType: Record<string, number>;
      totalSize: number;
      totalSizeFormatted: string;
    };
  };
  error?: string;
}

interface DeleteFileRequest {
  fileUid: string;
  cascadeDelete?: boolean;
  confirmIntegrityLoss?: boolean;
}

interface DeleteFileResponse {
  success: boolean;
  data?: {
    deletedFile: string;
    removedRelationships: number;
    removedEvidenceLinks: number;
    affectedEntities: string[];
    integrityWarnings: string[];
  };
  error?: string;
}

// GET: List all files with relationships and metadata
export const GET = withAuthAndLogging("list files for management")(async (
  request: NextRequest,
  user: AuthenticatedUser
): Promise<NextResponse<FileManagementResponse>> => {
  const client = getGlobalNeo4jClient();

  try {
    const { searchParams } = new URL(request.url);
    const processingState = searchParams.get("processingState");
    const mediaType = searchParams.get("mediaType");
    const workspaceId = searchParams.get("workspaceId");
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
      `📋 Listing files for user ${user.userId} (workspace: ${workspaceId || "all"}, limit: ${limit}, offset: ${offset})`
    );

    // Build filters
    const filters: string[] = [];

    // Workspace filter (skip for admin viewing all)
    if (workspaceId) {
      filters.push(`f.workspaceId = $workspaceId`);
    }

    if (processingState) {
      filters.push(`f.processingState = $processingState`);
    }
    if (mediaType) {
      filters.push(`f.mediaType = $mediaType`);
    }

    const whereClause =
      filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    // Main query to get files with their relationships
    const filesQuery = `
      MATCH (f:File)
      ${whereClause}
      
      // Get file relationships to entities
      OPTIONAL MATCH (f)-[rel]->(entity)
      WHERE entity.uid IS NOT NULL 
        AND NOT entity:Evidence  // Exclude evidence nodes from entity relationships
      
      // Get evidence links
      OPTIONAL MATCH (f)<-[:HAS_FILE]-(evidence:Evidence)
      
      WITH f, 
           collect(DISTINCT {
             id: rel.uid,
             type: type(rel),
             targetEntity: {
               uid: entity.uid,
               name: entity.name,
               type: labels(entity)[0]
             },
             confidence: coalesce(rel.confidence, 0.8),
             label: rel.label
           }) as relationships,
           collect(DISTINCT {
             evidenceUid: evidence.uid,
             evidenceTitle: evidence.title,
             evidenceType: evidence.kind
           }) as evidenceLinks
      
      RETURN 
        f.uid as uid,
        f.name as name,
        f.size as size,
        f.mediaType as mediaType,
        f.contentHash as contentHash,
        f.canonicalKey as canonicalKey,
        f.processingState as processingState,
        f.uploadedAt as uploadedAt,
        f.uploadId as uploadId,
        f.queuedAt as queuedAt,
        f.processedAt as processedAt,
        f.processingError as processingError,
        f.extractedText as extractedText,
        f.thumbnailUrl as thumbnailUrl,
        [r IN relationships WHERE r.id IS NOT NULL] as relationships,
        [e IN evidenceLinks WHERE e.evidenceUid IS NOT NULL] as evidenceLinks,
        f.createdAt as createdAt
        
      ORDER BY f.uploadedAt DESC
      SKIP $offset
      LIMIT $limit
    `;

    const queryParams: Record<string, any> = {
      limit: neo4j.int(limit),
      offset: neo4j.int(offset),
    };
    if (workspaceId) queryParams.workspaceId = workspaceId;
    if (processingState) queryParams.processingState = processingState;
    if (mediaType) queryParams.mediaType = mediaType;

    const result = await client.executeRead(filesQuery, queryParams);

    // Process results
    const files: FileWithRelationships[] = result.records.map((record) => {
      const size = record.get("size") || 0;
      const sizeFormatted = formatFileSize(size);

      return {
        uid: record.get("uid"),
        name: record.get("name"),
        size,
        sizeFormatted,
        mediaType: record.get("mediaType") || "unknown",
        contentHash: record.get("contentHash") || "",
        canonicalKey: record.get("canonicalKey"),
        processingState: record.get("processingState") || "unprocessed",
        uploadedAt: record.get("uploadedAt") || record.get("createdAt") || "",
        uploadId: record.get("uploadId"),
        relationships: record.get("relationships") || [],
        evidenceLinks: record.get("evidenceLinks") || [],
        processingInfo: {
          queuedAt: record.get("queuedAt"),
          processedAt: record.get("processedAt"),
          processingError: record.get("processingError"),
          extractedText: record.get("extractedText"),
          thumbnailUrl: record.get("thumbnailUrl"),
        },
      };
    });

    // Get statistics
    const statsQuery = `
      MATCH (f:File)
      ${whereClause}
      RETURN 
        count(f) as totalFiles,
        collect(f.processingState) as processingStates,
        collect(f.mediaType) as mediaTypes,
        sum(f.size) as totalSize
    `;

    const statsResult = await client.executeRead(
      statsQuery,
      processingState || mediaType || workspaceId ? queryParams : {}
    );
    const statsRecord = statsResult.records[0];

    const processingStates = statsRecord.get("processingStates") || [];
    const mediaTypes = statsRecord.get("mediaTypes") || [];
    const totalSize = statsRecord.get("totalSize") || 0;

    const statistics = {
      byProcessingState: processingStates.reduce(
        (acc: Record<string, number>, state: string) => {
          acc[state || "unprocessed"] = (acc[state || "unprocessed"] || 0) + 1;
          return acc;
        },
        {}
      ),
      byMediaType: mediaTypes.reduce(
        (acc: Record<string, number>, type: string) => {
          acc[type || "unknown"] = (acc[type || "unknown"] || 0) + 1;
          return acc;
        },
        {}
      ),
      totalSize,
      totalSizeFormatted: formatFileSize(totalSize),
    };

    console.log(
      `📊 Found ${files.length} files (total: ${statsRecord.get("totalFiles")})`
    );

    return NextResponse.json({
      success: true,
      data: {
        files,
        totalFiles: statsRecord.get("totalFiles") || 0,
        statistics,
      },
    });
  } catch (error) {
    console.error("File management API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list files",
      },
      { status: 500 }
    );
  }
  // No finally block needed - @proto/database handles connection management
});

// DELETE: Remove file with cascade deletion
export const DELETE = withAuthAndLogging("delete file with cascade")(async (
  request: NextRequest,
  user: AuthenticatedUser
): Promise<NextResponse<DeleteFileResponse>> => {
  const client = getGlobalNeo4jClient();

  try {
    const body: DeleteFileRequest = await request.json();
    const {
      fileUid,
      cascadeDelete = true,
      confirmIntegrityLoss = false,
    } = body;

    if (!fileUid || !fileUid.startsWith("file:")) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid file UID is required (format: file:name)",
        },
        { status: 400 }
      );
    }

    const isAdmin = checkAdminRole(user);

    // Verify file ownership before deletion
    const ownershipQuery = `
      MATCH (f:File {uid: $fileUid})
      RETURN f.uploadedBy as uploadedBy, f.workspaceId as workspaceId, f.name as fileName
    `;

    const ownershipResult = await client.executeRead(ownershipQuery, {
      fileUid,
    });

    if (ownershipResult.records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "File not found",
        },
        { status: 404 }
      );
    }

    const fileRecord = ownershipResult.records[0];
    const uploadedBy = fileRecord.get("uploadedBy");
    const fileWorkspaceId = fileRecord.get("workspaceId");

    // Check access: must be file owner or admin
    if (!isAdmin && uploadedBy !== user.userId) {
      console.warn(
        `🚫 Access denied: ${user.userId} attempted to delete file owned by ${uploadedBy}`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Access denied - you can only delete your own files",
        },
        { status: 403 }
      );
    }

    console.log(
      `🗑️ Deleting file: ${fileUid} (cascade: ${cascadeDelete}) by ${isAdmin ? "admin" : "owner"}`
    );

    // Step 1: Check what will be affected
    const impactQuery = `
      MATCH (f:File {uid: $fileUid})
      
      // Count relationships to entities
      OPTIONAL MATCH (f)-[rel]->(entity)
      WHERE entity.uid IS NOT NULL AND NOT entity:Evidence
      
      // Count evidence links
      OPTIONAL MATCH (f)<-[:HAS_FILE]-(evidence:Evidence)
      
      RETURN 
        f.name as fileName,
        count(DISTINCT rel) as relationshipCount,
        count(DISTINCT evidence) as evidenceCount,
        collect(DISTINCT entity.uid) as affectedEntities,
        collect(DISTINCT evidence.uid) as affectedEvidence
    `;

    const impactResult = await client.executeRead(impactQuery, { fileUid });

    const impactRecord = impactResult.records[0];
    const relationshipCount = impactRecord.get("relationshipCount") || 0;
    const evidenceCount = impactRecord.get("evidenceCount") || 0;
    const affectedEntities = impactRecord.get("affectedEntities") || [];
    const affectedEvidence = impactRecord.get("affectedEvidence") || [];

    // Check for data integrity concerns
    const integrityWarnings: string[] = [];
    if (relationshipCount > 0) {
      integrityWarnings.push(
        `Will remove ${relationshipCount} entity relationships`
      );
    }
    if (evidenceCount > 0) {
      integrityWarnings.push(`Will remove ${evidenceCount} evidence links`);
    }
    if (affectedEntities.length > 0) {
      integrityWarnings.push(`Will affect ${affectedEntities.length} entities`);
    }

    // Require confirmation for destructive operations
    if (integrityWarnings.length > 0 && !confirmIntegrityLoss) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Deletion will affect data integrity. Set confirmIntegrityLoss=true to proceed.",
          data: {
            deletedFile: "",
            removedRelationships: relationshipCount,
            removedEvidenceLinks: evidenceCount,
            affectedEntities: affectedEntities.map((e: string) => e),
            integrityWarnings,
          },
        },
        { status: 400 }
      );
    }

    // Step 2: Perform cascade deletion if requested
    let removedRelationships = 0;
    let removedEvidenceLinks = 0;

    if (cascadeDelete) {
      // Remove file-entity relationships
      const deleteRelQuery = `
        MATCH (f:File {uid: $fileUid})-[rel]->(entity)
        WHERE entity.uid IS NOT NULL AND NOT entity:Evidence
        DELETE rel
        RETURN count(rel) as deletedRels
      `;

      const relResult = await client.executeWrite(deleteRelQuery, { fileUid });
      removedRelationships = relResult.records[0]?.get("deletedRels") || 0;

      // Remove evidence-file links
      const deleteEvidenceQuery = `
        MATCH (f:File {uid: $fileUid})<-[rel:HAS_FILE]-(evidence:Evidence)
        DELETE rel
        RETURN count(rel) as deletedLinks
      `;

      const evidenceResult = await client.executeWrite(deleteEvidenceQuery, {
        fileUid,
      });
      removedEvidenceLinks =
        evidenceResult.records[0]?.get("deletedLinks") || 0;
    }

    // Step 3: Delete the file entity
    const deleteFileQuery = `
      MATCH (f:File {uid: $fileUid})
      DELETE f
      RETURN f.name as deletedFileName
    `;

    const deleteResult = await client.executeWrite(deleteFileQuery, {
      fileUid,
    });

    if (deleteResult.records.length === 0) {
      throw new Error("Failed to delete file entity");
    }

    console.log(`✅ Deleted file: ${fileUid}`);
    console.log(
      `🗑️ Removed ${removedRelationships} relationships, ${removedEvidenceLinks} evidence links`
    );

    return NextResponse.json({
      success: true,
      data: {
        deletedFile: fileUid,
        removedRelationships,
        removedEvidenceLinks,
        affectedEntities,
        integrityWarnings,
      },
    });
  } catch (error) {
    console.error("File deletion error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete file",
      },
      { status: 500 }
    );
  }
  // No finally block needed - @proto/database handles connection management
});

// Helper function to format file sizes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  const formatted = i === 0 ? size.toString() : size.toFixed(1);
  return `${formatted} ${sizes[i]}`;
}
