import * as fs from "fs/promises";
import * as path from "path";

import dotenv from "dotenv";

dotenv.config();
import type {
  RabbitHoleBundleData,
  Evidence,
  Entity,
  Relationship,
} from "@proto/types";

import { queryWikipedia } from "./src/config/wikipedia-config";
import { extractionGraph } from "./src/workflows/multi-phase-extraction";

/**
 * Test file for multi-phase extraction workflow
 *
 * This test:
 * 1. Fetches Wikipedia content for the given entity name
 * 2. Tests extraction modes (discover, structure, enrich, deep_dive)
 * 3. Displays results for each phase
 *
 * Usage:
 *   pnpm exec tsx test.ts [mode]
 *
 * Modes:
 *   discover   - Quick entity scan (default)
 *   structure  - Core entity data with required fields
 *   enrich     - Complete profiles with optional fields
 *   deep_dive  - Full extraction including relationships
 *   all        - Test all modes with 60s delays (avoid rate limits)
 *
 * Examples:
 *   pnpm exec tsx test.ts discover
 *   pnpm exec tsx test.ts deep_dive
 *   pnpm exec tsx test.ts all
 *
 * Prerequisites:
 * - LangExtract service running at http://localhost:8000
 * - Gemini API key in .env (or switch to Ollama - see LANGEXTRACT_SERVICE_URL)
 *
 * Rate Limits:
 * - Gemini free tier: 10 requests/minute
 * - Recommendation: Use "all" mode with delays, or switch to Ollama
 */

interface ExtractionResult {
  enrichedEntities: Map<string, Record<string, unknown>>;
  relationships: Array<{
    relationship_type: string;
    source_uid: string;
    target_uid: string;
    confidence: number;
    properties?: Record<string, unknown>;
  }>;
}

/**
 * Convert extraction results to RabbitHoleBundleData format
 */
function convertToRabbitHoleBundle(
  result: ExtractionResult,
  sourceMetadata: { title: string; url: string }
): RabbitHoleBundleData {
  const evidence: Evidence[] = [
    {
      uid: `evidence:wikipedia_${sourceMetadata.title.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}`,
      kind: "major_media",
      title: `${sourceMetadata.title} - Wikipedia`,
      publisher: "Wikipedia",
      date: new Date().toISOString().split("T")[0],
      url: sourceMetadata.url,
      reliability: 0.85,
      notes: `Auto-retrieved Wikipedia article for multi-phase extraction test`,
    },
  ];

  const entities: Entity[] = Array.from(result.enrichedEntities.values()).map(
    (entity: Record<string, unknown>) => ({
      uid: entity.uid as string,
      type: entity.type as string,
      name: entity.name as string,
      aliases: (entity.aliases as string[]) || [],
      tags: (entity.tags as string[]) || [],
      properties: Object.fromEntries(
        Object.entries(entity).filter(
          ([key]) =>
            ![
              "uid",
              "type",
              "name",
              "aliases",
              "tags",
              "_confidence",
              "_domain",
              "_extraction_text",
            ].includes(key)
        )
      ),
    })
  );

  const relationships: Relationship[] = result.relationships.map((rel) => ({
    uid: `rel:${rel.relationship_type.toLowerCase()}_${rel.source_uid}_${rel.target_uid}`,
    type: rel.relationship_type,
    source: rel.source_uid,
    target: rel.target_uid,
    confidence: rel.confidence,
    properties: rel.properties || {},
  }));

  return {
    evidence,
    entities,
    relationships,
    files: [],
    content: [],
  };
}

/**
 * Save bundle to output folder
 */
async function saveBundleToFile(
  bundle: RabbitHoleBundleData,
  filename: string
): Promise<void> {
  const outputDir = path.join(process.cwd(), "output");
  await fs.mkdir(outputDir, { recursive: true });

  const filepath = path.join(outputDir, filename);
  await fs.writeFile(filepath, JSON.stringify(bundle, null, 2), "utf-8");

  console.log(`\n💾 Bundle saved to: ${filepath}`);
  console.log(`   Entities: ${bundle.entities.length}`);
  console.log(`   Relationships: ${bundle.relationships.length}`);
  console.log(`   Evidence: ${bundle.evidence.length}`);
}

async function main({ entityName }: { entityName: string }) {
  try {
    console.log(`🔍 Fetching Wikipedia data for '${entityName}'...`);

    // Fetch real Wikipedia data
    const wikiData = await queryWikipedia(entityName, {
      language: "en",
      topKResults: 1,
    });

    if (wikiData.pages.length === 0) {
      throw new Error("No Wikipedia pages found");
    }

    const page = wikiData.pages[0];
    console.log(`✅ Fetched Wikipedia page: ${page.title}`);
    console.log(`   Word count: ${page.wordCount}`);
    console.log(`   Content length: ${page.content.length} characters`);
    console.log(`   URL: ${page.url}`);
    console.log();

    // Test multi-phase extraction workflow
    console.log("🚀 Starting Multi-Phase Extraction Workflow");
    console.log("=".repeat(60));
    console.log();

    // Select mode from command line arg or default to "discover"
    const testMode = (process.argv[2] || "discover") as
      | "discover"
      | "structure"
      | "enrich"
      | "deep_dive"
      | "all";

    let modes: readonly ("discover" | "structure" | "enrich" | "deep_dive")[];

    if (testMode === "all") {
      modes = ["discover", "structure", "enrich", "deep_dive"] as const;
      console.log(
        "⚠️  Testing ALL modes - will wait 60s between runs to avoid rate limits"
      );
      console.log();
    } else {
      modes = [testMode] as const;
      console.log(`Testing mode: ${testMode.toUpperCase()}`);
      console.log();
    }

    // Track best result for export (prefer deep_dive > enrich > structure > discover)
    let bestResult: ExtractionResult | null = null;
    let bestMode: string = "";
    const modeRanking = { deep_dive: 4, enrich: 3, structure: 2, discover: 1 };

    for (let i = 0; i < modes.length; i++) {
      const mode = modes[i];
      console.log(`\n🎯 Testing Mode: ${mode.toUpperCase()}`);
      console.log("-".repeat(60));

      const startTime = Date.now();

      try {
        const result = await extractionGraph.invoke({
          inputText: page.content,
          mode,
          domains: ["social", "academic", "geographic"],
          modelId: "gemini-2.5-flash-lite", // Using Gemini 2.0 Flash
          confidenceThresholds: {
            discover: 0.7,
            structure: 0.8,
            enrich: 0.6,
            relate: 0.75,
          },
        });

        const totalTime = Date.now() - startTime;

        // Display results
        console.log(`\n✅ ${mode} mode completed in ${totalTime}ms`);

        // Phase timings
        if (Object.keys(result.processingTime).length > 0) {
          console.log("\n⏱️  Phase Timings:");
          Object.entries(result.processingTime).forEach(([phase, time]) => {
            console.log(`   ${phase}: ${time}ms`);
          });
        }

        // Discovered entities
        const discoveredCount = Array.from(
          result.discoveredEntities.values()
        ).flat().length;
        console.log(`\n📊 Discovered Entities: ${discoveredCount}`);
        if (discoveredCount > 0) {
          result.discoveredEntities.forEach((entities, type) => {
            console.log(`   ${type}: ${entities.join(", ")}`);
          });
        }

        // Structured entities
        if (result.structuredEntities.size > 0) {
          console.log(
            `\n🏗️  Structured Entities: ${result.structuredEntities.size}`
          );
          Array.from(result.structuredEntities.entries())
            .slice(0, 3)
            .forEach(([uid, entity]) => {
              console.log(`   ${uid}: ${entity.name} (${entity.type})`);
            });
          if (result.structuredEntities.size > 3) {
            console.log(
              `   ... and ${result.structuredEntities.size - 3} more`
            );
          }
        }

        // Enriched entities
        if (result.enrichedEntities.size > 0) {
          console.log(
            `\n✨ Enriched Entities: ${result.enrichedEntities.size}`
          );
          Array.from(result.enrichedEntities.entries())
            .slice(0, 2)
            .forEach(([uid, entity]) => {
              const fieldsCount = Object.keys(entity).filter(
                (k) => !k.startsWith("_")
              ).length;
              console.log(`   ${uid}:`);
              console.log(`      Name: ${entity.name}`);
              console.log(`      Type: ${entity.type}`);
              console.log(`      Fields: ${fieldsCount}`);

              // Show some field details for deep modes
              if (mode === "enrich" || mode === "deep_dive") {
                const sampleFields = Object.entries(entity)
                  .filter(
                    ([k]) =>
                      !["uid", "type", "name"].includes(k) && !k.startsWith("_")
                  )
                  .slice(0, 3);
                if (sampleFields.length > 0) {
                  console.log(`      Sample data:`);
                  sampleFields.forEach(([key, value]) => {
                    const displayValue =
                      typeof value === "string"
                        ? value.substring(0, 50)
                        : value;
                    console.log(`        ${key}: ${displayValue}`);
                  });
                }
              }
            });
        }

        // Relationships
        if (result.relationships.length > 0) {
          console.log(`\n🔗 Relationships: ${result.relationships.length}`);
          result.relationships.slice(0, 5).forEach((rel) => {
            console.log(
              `   ${rel.source_uid} → ${rel.relationship_type} → ${rel.target_uid}`
            );
            if (rel.start_date || rel.end_date) {
              console.log(
                `      Period: ${rel.start_date || "?"} to ${rel.end_date || "present"}`
              );
            }
            if (rel.evidence_text) {
              console.log(
                `      Evidence: "${rel.evidence_text.substring(0, 80)}..."`
              );
            }
            console.log(
              `      Confidence: ${Math.round(rel.confidence * 100)}%`
            );
          });
          if (result.relationships.length > 5) {
            console.log(`   ... and ${result.relationships.length - 5} more`);
          }
        }

        // Annotations
        console.log(`\n📝 Annotations: ${result.allAnnotations.length}`);

        // Errors
        if (result.errorLog.length > 0) {
          console.log(`\n❌ Errors: ${result.errorLog.length}`);
          result.errorLog.forEach((error) => {
            console.log(`   ${error}`);
          });
        }

        console.log();

        // Track best result (prefer more complete modes)
        if (
          !bestResult ||
          modeRanking[mode] > modeRanking[bestMode as keyof typeof modeRanking]
        ) {
          if (
            result.enrichedEntities.size > 0 ||
            result.relationships.length > 0
          ) {
            bestResult = result;
            bestMode = mode;
          }
        }
      } catch (error) {
        console.error(`❌ ${mode} mode failed:`, error);
      }

      // Wait between modes if testing all modes
      if (testMode === "all" && i < modes.length - 1) {
        console.log("\n⏳ Waiting 60s to avoid rate limits...");
        await new Promise((resolve) => setTimeout(resolve, 60000));
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Multi-Phase Extraction Workflow Test Complete!");
    console.log("=".repeat(60));

    // Export best result as RabbitHoleBundleData
    if (bestResult && bestResult.enrichedEntities.size > 0) {
      console.log(
        `\n📦 Exporting ${bestMode} mode results to RabbitHoleBundleData...`
      );

      const bundle = convertToRabbitHoleBundle(bestResult, {
        title: page.title,
        url: page.url,
      });

      const filename = `extraction-test-${entityName.toLowerCase().replace(/\s+/g, "-")}-${bestMode}.json`;
      await saveBundleToFile(bundle, filename);

      console.log(`\n✅ Export complete! Review bundle at: output/${filename}`);
    } else {
      console.log(
        `\n⚠️  No results to export (all extractions failed or empty)`
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main({ entityName: "Bernie Sanders" }).catch(console.error);
