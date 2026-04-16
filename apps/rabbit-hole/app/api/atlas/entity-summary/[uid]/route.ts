/**
 * Entity Summary API — AI-generated encyclopedic summaries for Atlas nodes
 *
 * Generates a concise 2-3 sentence summary of a given entity using its
 * Neo4j properties and top relationships. Results are cached on the node
 * under `_summary` / `_summaryGeneratedAt` and expire after 24 hours.
 *
 * GET /api/atlas/entity-summary/[uid]
 * GET /api/atlas/entity-summary/[uid]?refresh=true  — bypass cache
 */

import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";

import { getGlobalNeo4jClient } from "@protolabsai/database";
import { getAIModel } from "@protolabsai/llm-providers/server";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;
  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "true";

  let client;
  try {
    client = getGlobalNeo4jClient();
  } catch (err) {
    console.error("Neo4j client unavailable:", err);
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 }
    );
  }

  // ── 1. Fetch entity properties ──────────────────────────────────────
  let entityRecord: Record<string, unknown>;
  try {
    const entityResult = await client.executeRead(
      `MATCH (e {uid: $uid}) RETURN properties(e) as props LIMIT 1`,
      { uid }
    );

    if (entityResult.records.length === 0) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    entityRecord = entityResult.records[0].get("props") as Record<
      string,
      unknown
    >;
  } catch (err) {
    console.error("Neo4j entity fetch failed:", err);
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 }
    );
  }

  // ── 2. Check cache ───────────────────────────────────────────────────
  const cachedSummary = entityRecord._summary as string | undefined;
  const cachedAt = entityRecord._summaryGeneratedAt as string | undefined;

  if (!forceRefresh && cachedSummary && cachedAt) {
    const age = Date.now() - new Date(cachedAt).getTime();
    if (age < CACHE_TTL_MS) {
      return NextResponse.json({
        summary: cachedSummary,
        generatedAt: cachedAt,
        cached: true,
      });
    }
  }

  // ── 3. Fetch top 10 relationships ────────────────────────────────────
  let relationships: Array<{
    relType: string;
    otherName: string;
    otherType: string;
  }> = [];
  try {
    const relResult = await client.executeRead(
      `MATCH (e {uid: $uid})-[r]-(other)
       RETURN type(r) as relType, other.name as otherName, other.type as otherType
       LIMIT 10`,
      { uid }
    );

    relationships = relResult.records.map((rec) => ({
      relType: rec.get("relType") as string,
      otherName: rec.get("otherName") as string,
      otherType: rec.get("otherType") as string,
    }));
  } catch (err) {
    // Non-fatal — proceed without relationships
    console.warn("Could not fetch relationships for", uid, err);
  }

  // ── 4. Build prompt context ──────────────────────────────────────────
  const name = (entityRecord.name as string) || uid;
  const type = (entityRecord.type as string) || "Entity";

  // Omit internal cache fields from the properties shown to the model
  const publicProps = Object.fromEntries(
    Object.entries(entityRecord).filter(([k]) => !k.startsWith("_"))
  );

  const propertiesText = JSON.stringify(publicProps, null, 2);
  const relationshipsText =
    relationships.length > 0
      ? relationships
          .map(
            (r) =>
              `${r.relType}: ${r.otherName}${r.otherType ? ` (${r.otherType})` : ""}`
          )
          .join(", ")
      : "None available";

  const prompt = `Generate a concise 2-3 sentence encyclopedic summary of ${name} (${type}) based on: Properties: ${propertiesText}. Relationships: ${relationshipsText}.`;

  // ── 5. Generate summary ──────────────────────────────────────────────
  let summary: string;
  try {
    const model = getAIModel("fast");
    const result = await generateText({ model, prompt });
    summary = result.text.trim();
  } catch (err) {
    console.error("LLM generation failed for entity", uid, err);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }

  // ── 6. Persist to Neo4j ──────────────────────────────────────────────
  const timestamp = new Date().toISOString();
  try {
    await client.executeWrite(
      `MATCH (e {uid: $uid})
       SET e._summary = $summary, e._summaryGeneratedAt = $timestamp`,
      { uid, summary, timestamp }
    );
  } catch (err) {
    // Non-fatal — still return the generated summary
    console.warn("Could not cache summary for entity", uid, err);
  }

  return NextResponse.json({
    summary,
    generatedAt: timestamp,
    cached: false,
  });
}
