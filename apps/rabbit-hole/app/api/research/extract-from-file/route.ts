/**
 * Extract Entities from File - API Route
 *
 * Handles file upload, text extraction, and entity extraction for research workspace.
 * Tier enforcement: Requires Basic+ tier for AI-powered extraction.
 */

import mammoth from "mammoth";
import { NextRequest, NextResponse } from "next/server";

import { getUserTier, getTierLimits } from "@protolabsai/auth";
import { entityExtractionBasicTool } from "@protolabsai/llm-tools/tools/entity-extraction-basic";
import type { Evidence, RabbitHoleBundleData } from "@protolabsai/types";
import { domainRegistry } from "@protolabsai/types";

// Extend timeout for long-running extractions with job queue polling
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  // 1. Authentication check
  const user = {
    id: "local-user",
    publicMetadata: { tier: "free", role: "admin" },
    emailAddresses: [{ emailAddress: "local@localhost" }],
    firstName: "Local",
    lastName: "User",
    fullName: "Local User",
    imageUrl: "",
  } as any;
  if (!user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Authentication required for entity extraction",
      },
      { status: 401 }
    );
  }

  // 2. Tier enforcement - AI chat access required (Basic+)
  const userTier = getUserTier(user);
  const tierLimits = getTierLimits(userTier);

  if (!tierLimits.hasAIChatAccess) {
    return NextResponse.json(
      {
        error: "Upgrade Required",
        message:
          "Entity extraction requires Basic tier or higher. Upgrade to unlock AI-powered extraction.",
        currentTier: userTier,
        requiredTier: "basic",
        upgradeUrl: "/pricing",
      },
      { status: 403 }
    );
  }

  try {
    // 3. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const domainsStr = formData.get("domains") as string;
    const maxEntitiesStr = formData.get("maxEntities") as string;
    const entityTypesStr = formData.get("entityTypes") as string | null;
    const modelId = formData.get("modelId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // File size validation (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File exceeds 10MB limit" },
        { status: 400 }
      );
    }

    const domains = JSON.parse(domainsStr || "[]");
    const maxEntities = parseInt(maxEntitiesStr || "25");
    const entityTypes = entityTypesStr ? JSON.parse(entityTypesStr) : undefined;

    // Compute entity types from selected domains
    const entityTypesByDomain = domainRegistry.getEntityTypesByDomain();
    const computedEntityTypes = domains
      .flatMap((domain: string) => entityTypesByDomain[domain] || [])
      // Convert domain-specific entity names to lowercase for LangExtract
      .map((type: string) => type.toLowerCase());

    // Merge client-provided entity types with domain-computed types
    const allEntityTypes = [
      ...computedEntityTypes,
      ...(entityTypes
        ? (Array.isArray(entityTypes) ? entityTypes : [entityTypes]).map(
            (type: string) => type.toLowerCase()
          )
        : []),
    ];

    // Remove duplicates
    const uniqueEntityTypes = Array.from(new Set(allEntityTypes)) as string[];

    // 4. Extract text based on file type
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    let extractedText: string;
    const textExtractionStart = Date.now();

    switch (fileExt) {
      case "txt":
      case "md":
        extractedText = await file.text();
        break;

      case "pdf":
        try {
          const pdfBuffer = Buffer.from(await file.arrayBuffer());
          const pdf = (await import("pdf-parse")).default;
          const pdfData = await pdf(pdfBuffer);
          extractedText = pdfData.text;
        } catch (error) {
          console.error("PDF extraction error:", error);
          return NextResponse.json(
            {
              error: "Failed to extract text from PDF",
              details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
        break;

      case "docx":
        try {
          const docxBuffer = await file.arrayBuffer();
          const docxResult = await mammoth.extractRawText({
            arrayBuffer: docxBuffer,
          });
          extractedText = docxResult.value;
        } catch (error) {
          console.error("DOCX extraction error:", error);
          return NextResponse.json(
            {
              error: "Failed to extract text from DOCX",
              details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
        break;

      default:
        return NextResponse.json(
          {
            error: `Unsupported file type: .${fileExt}`,
            supportedTypes: [".txt", ".pdf", ".docx", ".md"],
          },
          { status: 400 }
        );
    }

    const textExtractionTime = Date.now() - textExtractionStart;

    // Validate extracted text
    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        {
          error: "No text content found in file",
          message:
            "The file appears to be empty or contains no extractable text",
        },
        { status: 400 }
      );
    }

    // 5. Call entity extraction tool
    console.log(`📄 Extracting entities from ${file.name}`);
    console.log(`   Text length: ${extractedText.length} characters`);
    console.log(`   Domains: ${domains.join(", ")}`);
    console.log(`   Entity types: ${uniqueEntityTypes.join(", ")}`);
    console.log(`   Max entities: ${maxEntities}`);
    if (modelId) {
      console.log(`   Model override: ${modelId}`);
    }

    const extractionResult = (await entityExtractionBasicTool.invoke({
      text: extractedText,
      domains,
      entityTypes: uniqueEntityTypes.length > 0 ? uniqueEntityTypes : undefined,
      maxEntities,
      modelId: modelId || undefined,
    })) as any;

    // 5.5. Create evidence node for file
    const dateStamp = new Date().toISOString().split("T")[0];
    const sanitizedName = file.name.replace(/[^a-z0-9]/g, "_").toLowerCase();

    const evidence: Evidence = {
      uid: `evidence:file_${sanitizedName}_${dateStamp}`,
      kind: "research",
      title: file.name,
      publisher: "User Upload",
      date: dateStamp,
      url: `file://uploads/${encodeURIComponent(file.name)}`,
      reliability: 0.75,
      notes: `Uploaded file (${file.size} bytes, ${file.type})`,
      retrieved_at: new Date().toISOString(),
    };

    // Link evidence to all entities
    const entitiesWithEvidence = (
      Array.isArray(extractionResult.entities) ? extractionResult.entities : []
    ).map((entity: any) => ({
      ...entity,
      properties: {
        ...entity.properties,
        _evidence_uids: [evidence.uid],
        _extractedFrom: "file",
        _extractedAt: evidence.date,
      },
    }));

    // 6. Return results in bundle format (with backward compatibility)
    const bundle: RabbitHoleBundleData = {
      evidence: [evidence],
      entities: entitiesWithEvidence,
      relationships: [],
      files: [],
      content: [],
      entityCitations: {},
      relationshipCitations: {},
    };

    return NextResponse.json({
      success: true,
      // New bundle format
      bundle,
      // Backward compatibility
      entities: entitiesWithEvidence,
      stats: {
        totalDiscovered: extractionResult.stats.totalDiscovered,
        totalStructured: extractionResult.stats.totalStructured,
        entityTypes: extractionResult.stats.entityTypes,
        evidenceCreated: 1,
      },
      processingTime: {
        textExtraction: textExtractionTime,
        discover: extractionResult.processingTime.discover,
        structure: extractionResult.processingTime.structure,
        total: textExtractionTime + extractionResult.processingTime.total,
      },
      errors: extractionResult.errors,
      fileName: file.name,
      fileSize: file.size,
      textLength: extractedText.length,
    });
  } catch (error) {
    console.error("❌ Entity extraction failed:", error);
    return NextResponse.json(
      {
        error: "Extraction failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
