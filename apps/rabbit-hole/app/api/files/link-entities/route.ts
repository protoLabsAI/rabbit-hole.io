/**
 * File-Entity Linking API
 *
 * Creates relationships between uploaded files and existing entities in the knowledge graph.
 * Supports various relationship types like DOCUMENTS, EVIDENCES, REFERENCES, etc.
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuthAndLogging } from "@protolabsai/auth";
import { getGlobalNeo4jClient } from "@protolabsai/database";
import {
  CreateFileEntityRelationshipSchema,
  FileEntityLinkingResultSchema,
  safeValidate,
  type FileEntityLinkingResult,
} from "@protolabsai/types";

export const POST = withAuthAndLogging("link file to entities")(async (
  request: NextRequest
): Promise<NextResponse<FileEntityLinkingResult>> => {
  const client = getGlobalNeo4jClient();

  try {
    const body = await request.json();

    // Validate request data
    const validation = safeValidate(CreateFileEntityRelationshipSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid request data: ${validation.error}`,
        },
        { status: 400 }
      );
    }

    const { relationships } = validation.data;

    console.log(
      `🔗 Creating ${relationships.length} file-entity relationships`
    );

    const createdRelationships: Array<{
      id: string;
      fileUid: string;
      entityUid: string;
      relationshipType: string;
      label: string;
    }> = [];
    let relationshipsCreated = 0;

    for (const relationship of relationships) {
      const {
        fileUid,
        entityUid,
        relationshipType,
        label,
        confidence = 0.8,
        notes,
      } = relationship;

      console.log(`🔗 Linking ${fileUid} → ${entityUid} (${relationshipType})`);

      // Generate unique relationship ID
      const relationshipId = `rel:file_${relationshipType.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      // Verify both file and entity exist
      const verifyQuery = `
        MATCH (f:File {uid: $fileUid})
        MATCH (e {uid: $entityUid})
        RETURN f.name as fileName, e.name as entityName, labels(e) as entityLabels
      `;

      const verifyResult = await client.executeRead(verifyQuery, {
        fileUid,
        entityUid,
      });

      if (verifyResult.records.length === 0) {
        console.warn(`⚠️ File ${fileUid} or entity ${entityUid} not found`);
        continue;
      }

      const record = verifyResult.records[0];
      const fileName = record.get("fileName");
      const entityName = record.get("entityName");

      // Check if relationship already exists
      const existsQuery = `
        MATCH (f:File {uid: $fileUid})-[r:${relationshipType}]-(e {uid: $entityUid})
        RETURN r.uid as existingId
      `;

      const existsResult = await client.executeRead(existsQuery, {
        fileUid,
        entityUid,
      });

      if (existsResult.records.length > 0) {
        console.log(
          `🔄 Relationship ${fileUid} → ${entityUid} already exists, skipping`
        );
        continue;
      }

      // Create the relationship
      const createQuery = `
        MATCH (f:File {uid: $fileUid})
        MATCH (e {uid: $entityUid})
        CREATE (f)-[r:${relationshipType} {
          uid: $relationshipId,
          label: $label,
          confidence: $confidence,
          notes: $notes,
          createdAt: datetime(),
          updatedAt: datetime(),
          createdBy: 'file_upload_dialog'
        }]->(e)
        RETURN r.uid as relationshipId, f.name as fileName, e.name as entityName
      `;

      const defaultLabel =
        label ||
        `${fileName} ${relationshipType.toLowerCase().replace("_", " ")} ${entityName}`;

      const createResult = await client.executeWrite(createQuery, {
        fileUid,
        entityUid,
        relationshipId,
        label: defaultLabel,
        confidence,
        notes,
      });

      if (createResult.records.length > 0) {
        const createdRecord = createResult.records[0];
        createdRelationships.push({
          id: relationshipId,
          fileUid,
          entityUid,
          relationshipType,
          label: defaultLabel,
        });
        relationshipsCreated++;

        console.log(
          `✅ Created relationship: ${fileName} ${relationshipType} ${entityName}`
        );
      }
    }

    console.log(
      `🎉 Successfully created ${relationshipsCreated} file-entity relationships`
    );

    const result: FileEntityLinkingResult = {
      success: true,
      data: {
        relationshipsCreated,
        relationships: createdRelationships,
      },
    };

    // Validate response
    const responseValidation = safeValidate(
      FileEntityLinkingResultSchema,
      result
    );
    if (!responseValidation.success) {
      throw new Error(`Invalid response data: ${responseValidation.error}`);
    }

    return NextResponse.json(responseValidation.data);
  } catch (error) {
    console.error("File-entity linking error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to link entities",
      },
      { status: 500 }
    );
  }
  // No finally block needed - @protolabsai/database handles connection management
});

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: "/api/files/link-entities",
      description:
        "Create relationships between uploaded files and existing entities",
      method: "POST",
      contentType: "application/json",
      authentication: "required",
    },
    usage: {
      method: "POST",
      body: {
        relationships: [
          {
            fileUid: "file:document (required)",
            entityUid: "per:john_doe (required)",
            relationshipType:
              "DOCUMENTS | EVIDENCES | SUPPORTS | REFERENCES | AUTHORED_BY | PUBLISHED_BY | MENTIONS | CONTAINS (required)",
            label: "Custom relationship label (optional)",
            confidence: "0.0-1.0 confidence score (optional, default 0.8)",
            notes: "Additional notes about the relationship (optional)",
          },
        ],
      },
      response: {
        success: true,
        data: {
          relationshipsCreated: 2,
          relationships: [
            {
              id: "rel:file_documents_1234567890_abc12",
              fileUid: "file:document",
              entityUid: "per:john_doe",
              relationshipType: "DOCUMENTS",
              label: "document.pdf documents John Doe",
            },
          ],
        },
      },
    },
    relationshipTypes: {
      DOCUMENTS: "File provides documentation about the entity",
      EVIDENCES: "File serves as evidence related to the entity",
      SUPPORTS: "File supports claims or statements about the entity",
      REFERENCES: "File references or mentions the entity",
      AUTHORED_BY: "File was created/authored by the entity",
      PUBLISHED_BY: "File was published by the entity",
      MENTIONS: "File mentions the entity in passing",
      CONTAINS: "File contains content directly related to the entity",
    },
    examples: [
      {
        description: "Link a document to a person",
        request: {
          relationships: [
            {
              fileUid: "file:birth_certificate",
              entityUid: "per:john_doe",
              relationshipType: "DOCUMENTS",
              notes: "Official birth certificate",
            },
          ],
        },
      },
      {
        description: "Link multiple entities to one file",
        request: {
          relationships: [
            {
              fileUid: "file:meeting_minutes",
              entityUid: "per:john_doe",
              relationshipType: "MENTIONS",
            },
            {
              fileUid: "file:meeting_minutes",
              entityUid: "org:acme_corp",
              relationshipType: "PUBLISHED_BY",
            },
          ],
        },
      },
    ],
  });
}
