import { NextRequest, NextResponse } from "next/server";

import { extractionGraph } from "@protolabsai/llm-tools";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for long extractions

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      text,
      mode = "enrich",
      domains = ["social"],
      modelId,
      temperature,
      confidenceThreshold,
      includeEntityTypes,
      excludeEntityTypes,
    } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text input is required and must be a string" },
        { status: 400 }
      );
    }

    if (text.length > 100000) {
      return NextResponse.json(
        { error: "Text too long (max 100k characters)" },
        { status: 400 }
      );
    }

    // Run the extraction workflow
    const result = await extractionGraph.invoke({
      inputText: text,
      mode,
      domains,
      modelId,
      temperature,
      includeEntityTypes,
      excludeEntityTypes,
      confidenceThresholds: {
        discover: 0.7,
        structure: 0.8,
        enrich: 0.6,
        relate: 0.75,
        ...body.confidenceThresholds,
      },
    });

    // Convert Maps to objects for JSON serialization
    const response = {
      discoveredEntities: Object.fromEntries(result.discoveredEntities),
      structuredEntities: Object.fromEntries(result.structuredEntities),
      enrichedEntities: Object.fromEntries(result.enrichedEntities),
      relationships: result.relationships,
      allAnnotations: result.allAnnotations,
      processingTime: result.processingTime,
      errorLog: result.errorLog,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Extraction workflow error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
