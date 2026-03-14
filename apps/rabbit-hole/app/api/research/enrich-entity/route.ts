/**
 * Research Entity Enrichment API
 *
 * Fetches Wikipedia data and extracts relevant fields for entity enrichment.
 * Returns enriched properties for frontend to merge into local graph.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserTier, getTierLimits } from "@proto/auth";
import {
  langextractConfig,
  getEnrichmentFieldsForEntity,
  generateEnrichmentExample,
  queryWikipedia,
} from "@proto/llm-tools";
import { extractAndMergeLangExtractResponse } from "@proto/utils";

// Schema for validating LangExtract response shape
const LangExtractResponseSchema = z
  .object({
    data: z.any().optional(),
  })
  .passthrough();

export async function POST(request: NextRequest) {
  // 1. Authentication
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
      { error: "Unauthorized", message: "Authentication required" },
      { status: 401 }
    );
  }

  // 2. Tier enforcement
  const userTier = getUserTier(user);
  const tierLimits = getTierLimits(userTier);

  if (!tierLimits.hasAIChatAccess) {
    return NextResponse.json(
      {
        error: "Upgrade Required",
        message:
          "Entity enrichment requires Basic tier or higher. Upgrade at /pricing.",
        upgradeUrl: "/pricing",
      },
      { status: 403 }
    );
  }

  try {
    // 3. Parse request
    const {
      entityName,
      entityType,
      selectedFields,
      context,
      topKResults,
      maxDocContentLength,
      modelId: requestModelId,
    } = await request.json();

    if (!entityName || !entityType) {
      return NextResponse.json(
        { error: "entityName and entityType required" },
        { status: 400 }
      );
    }

    // Validate selectedFields if provided
    if (
      selectedFields &&
      (!Array.isArray(selectedFields) || selectedFields.length === 0)
    ) {
      return NextResponse.json(
        { error: "At least one field must be selected" },
        { status: 400 }
      );
    }

    console.log(`📚 Enriching ${entityType}: ${entityName}`);

    // 4. Fetch Wikipedia data (with LRU cache)
    let wikipediaContent: string;
    try {
      const wikiResponse = await queryWikipedia(entityName, {
        topKResults: topKResults ?? 3,
        maxContentLength: maxDocContentLength ?? 50000,
      });

      // Combine content from all pages
      wikipediaContent = wikiResponse.pages
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map((p) => p.content)
        .join("\n\n");

      if (!wikipediaContent || wikipediaContent.trim().length === 0) {
        return NextResponse.json(
          {
            error: "No Wikipedia data found",
            message: `No Wikipedia article found for "${entityName}". Try manual data entry.`,
            suggestion: "Check entity name spelling or use web search",
          },
          { status: 404 }
        );
      }

      console.log(`✅ Wikipedia fetched: ${wikipediaContent.length} chars`);
    } catch (wikipediaError) {
      console.warn(`⚠️ Wikipedia fetch failed:`, wikipediaError);
      return NextResponse.json(
        {
          error: "Wikipedia fetch failed",
          message: `Could not fetch Wikipedia data for "${entityName}"`,
          details:
            wikipediaError instanceof Error
              ? wikipediaError.message
              : "Unknown error",
        },
        { status: 500 }
      );
    }

    // 5. Get enrichment fields for entity type
    const enrichmentFields =
      selectedFields || getEnrichmentFieldsForEntity(entityType, "social");
    console.log(`📝 Enrichment fields: ${enrichmentFields.join(", ")}`);

    // 6. Extract fields with LangExtract
    const serviceUrl = langextractConfig.getServiceUrl();
    const modelId = requestModelId || langextractConfig.defaults.modelId;
    const example = generateEnrichmentExample(entityType);

    // Build contextual prompt
    let promptDescription = `Extract ONLY factual information about ${entityName} specifically from this Wikipedia article.

IMPORTANT: Extract field VALUES, not entity names found in the text.
- For "education": Extract schools/universities that ${entityName} ATTENDED (not all schools mentioned in the article)
- For "birthPlace": Extract where ${entityName} was BORN (not all places mentioned)
- For "occupation": Extract ${entityName}'s profession/job
- For dates: Use ISO format (YYYY-MM-DD)
- For arrays: Return simple strings, not objects

Fields to extract (only if explicitly stated about ${entityName}):
${enrichmentFields.map((f) => `- ${f}`).join("\n")}`;

    if (context) {
      promptDescription += `\n\nAdditional context: ${context}`;
    }

    promptDescription += `\n\nReturn structured data with field names as keys. Only include fields with factual data directly about ${entityName}. Do not include entities that are merely mentioned in the article.`;

    const extractPayload = {
      text_or_documents: [wikipediaContent],
      prompt_description: promptDescription,
      model_id: modelId,
      include_source_grounding: false,
      examples: [example],
    };

    console.log("🔍 LangExtract Request:");
    console.log(`   Model: ${modelId}`);
    console.log(`   Prompt:\n${promptDescription}`);
    console.log(`   Example Input: ${JSON.stringify(example)}`);
    console.log(`   Wikipedia Content: ${wikipediaContent.length} chars`);

    const extractResponse = await fetch(`${serviceUrl}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(extractPayload),
    });

    if (!extractResponse.ok) {
      throw new Error(`LangExtract failed: ${extractResponse.status}`);
    }

    const extractResult = await extractResponse.json();

    // Validate extractResult shape with Zod
    const parsedResult = LangExtractResponseSchema.safeParse(extractResult);
    if (!parsedResult.success) {
      return NextResponse.json(
        {
          error: "Invalid LangExtract response format",
          details: parsedResult.error.flatten(),
        },
        { status: 502 }
      );
    }

    // 7. Build enriched properties and track what was found
    const fieldsNotFound: string[] = [];

    // Use utility to merge all entity objects from LangExtract response
    const enrichedProperties = extractAndMergeLangExtractResponse(
      parsedResult.data
    );

    // Track which fields were added and not found
    const fieldsAdded = Object.keys(enrichedProperties).filter(
      (field) => !field.startsWith("_")
    );

    // Build Set for O(1) lookups instead of O(n) array.includes() calls
    const fieldsAddedSet = new Set(fieldsAdded);
    enrichmentFields.forEach((field) => {
      if (!fieldsAddedSet.has(field)) {
        fieldsNotFound.push(field);
      }
    });

    // Add enrichment metadata
    enrichedProperties._enrichedFrom = "wikipedia";
    enrichedProperties._enrichedAt = new Date().toISOString();
    enrichedProperties._wikipediaUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(
      entityName.replace(/\s+/g, "_")
    )}`;

    // Log enriched fields with their values
    const addedFieldsLog = fieldsAdded.map((field) => {
      const value = enrichedProperties[field];
      const displayValue =
        typeof value === "string" && value.length > 50
          ? `${value.substring(0, 50)}...`
          : JSON.stringify(value);
      return `${field}=${displayValue}`;
    });

    console.log(`✅ Enrichment complete: Added ${fieldsAdded.length} fields`);
    addedFieldsLog.forEach((log) => console.log(`   • ${log}`));

    // 8. Return enriched properties with detailed tracking
    return NextResponse.json({
      success: true,
      enrichedProperties,
      fieldsAdded,
      fieldsNotFound,
      fieldsAttempted: enrichmentFields,
      source: "wikipedia",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Entity enrichment failed:", error);
    return NextResponse.json(
      {
        error: "Enrichment failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
