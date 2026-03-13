import { NextRequest, NextResponse } from "next/server";

import { extractRelationshipsTool } from "@proto/llm-tools";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, entities, domains, modelId } = body;

    if (!content || !Array.isArray(entities)) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    const result = await extractRelationshipsTool.invoke({
      content,
      entities,
      domains: domains || ["social", "academic", "geographic"],
      modelId: modelId || "gemini-2.5-flash-lite",
    });

    const processingTimeMs = Date.now() - startTime;

    return NextResponse.json({
      ...result,
      processingTimeMs,
    });
  } catch (error: any) {
    console.error("Extract relationships error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
