/**
 * Chat Ingest Action — Extract entities from a message and add to knowledge graph
 *
 * Called when the user clicks "Add to Knowledge Graph" on a search result.
 * Extracts entities from the provided text using getAIModel("fast"),
 * then ingests them via /api/ingest-bundle.
 */

import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAIModel } from "@protolabsai/llm-providers/server";
import { safeValidate } from "@protolabsai/types";

const IngestRequestSchema = z.object({
  query: z.string().min(1).max(200),
  text: z.string().min(10).max(50000),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validation = safeValidate(IngestRequestSchema, body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 400 }
    );
  }

  const { query, text } = validation.data;
  const rabbitHoleUrl = process.env.RABBIT_HOLE_URL || "http://localhost:3000";

  try {
    // Extract entities using fast model
    const model = getAIModel("fast");
    const result = await generateText({
      model,
      prompt: `Extract entities and relationships from this text about "${query}".

Return ONLY valid JSON:
{
  "entities": [{"uid": "{type}:{snake_name}", "name": "...", "type": "Person|Organization|Technology|Concept|Event|Publication", "properties": {}, "tags": [], "aliases": []}],
  "relationships": [{"uid": "rel:{src}_{type}_{tgt}", "type": "RELATED_TO|AUTHORED|FOUNDED|WORKS_AT|PART_OF", "source": "entity_uid", "target": "entity_uid", "properties": {}}]
}

Rules:
- Entity UIDs: {type_prefix}:{snake_case_name}
- Extract 5-20 entities and their relationships
- Only include entities clearly mentioned in the text

Text:\n${text.slice(0, 8000)}`,
    });

    const raw = result.text ?? "";
    let parsed: any;
    try {
      let jsonStr = raw.trim();
      const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fence) jsonStr = fence[1].trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to parse extraction result" },
        { status: 422 }
      );
    }

    if (!parsed?.entities?.length) {
      return NextResponse.json(
        { success: false, error: "No entities extracted" },
        { status: 422 }
      );
    }

    // Build bundle with evidence provenance
    const bundle = {
      entities: parsed.entities,
      relationships: parsed.relationships ?? [],
      evidence: [
        {
          uid: `evidence:search_${Date.now()}`,
          kind: "research",
          title: `Search: ${query}`,
          publisher: "Rabbit Hole Search",
          date: new Date().toISOString().slice(0, 10),
          reliability: 0.7,
          notes: `User-triggered extraction from search for "${query}"`,
        },
      ],
    };

    // Ingest into Neo4j
    const ingestRes = await fetch(`${rabbitHoleUrl}/api/ingest-bundle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bundle),
    });

    if (!ingestRes.ok) {
      const err = await ingestRes.text();
      return NextResponse.json(
        { success: false, error: `Ingest failed: ${err}` },
        { status: 500 }
      );
    }

    const ingestData = await ingestRes.json();

    return NextResponse.json({
      success: true,
      entitiesExtracted: parsed.entities.length,
      relationshipsExtracted: (parsed.relationships ?? []).length,
      ingestSummary: ingestData.data?.summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Extraction failed",
      },
      { status: 500 }
    );
  }
}
