/**
 * Basic Entity Extraction Tool
 *
 * Simplified two-phase extraction workflow:
 * 1. Discover: Find all entities in text
 * 2. Structure: Extract required fields for each entity
 *
 * NO relationships - focus purely on entity extraction
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

import {
  calculateStringSimilarity,
  mergeLangExtractEntities,
} from "@proto/utils";

import { langextractConfig } from "../../config/langextract-config";
import { enqueueLangExtract } from "../../utils/enqueueLangExtract";

export interface EntityExtractionResult {
  entities: Array<{
    uid: string;
    type: string;
    name: string;
    properties: Record<string, any>;
    _confidence: number;
    _phase: "discovered" | "structured";
  }>;
  processingTime: {
    discover: number;
    structure: number;
    total: number;
  };
  stats: {
    totalDiscovered: number;
    totalStructured: number;
    entityTypes: string[];
  };
  errors: string[];
}

/**
 * Call LangExtract via job queue
 *
 * Rate limiting handled by job queue (concurrency: 1).
 * Automatic retries with exponential backoff.
 */
async function callLangExtract(params: {
  text: string;
  prompt: string;
  examples: any[];
  modelId?: string;
  temperature?: number;
}): Promise<any> {
  const modelId = params.modelId || langextractConfig.defaults.modelId;

  return await enqueueLangExtract({
    textContent: params.text,
    extractionPrompt: params.prompt,
    outputFormat: params.examples[0]?.expected_output,
    modelId,
    temperature: params.temperature,
    includeSourceGrounding: true,
    useSchemaConstraints: true,
    // Schema derived from outputFormat examples by langextract service
  });
}

/**
 * Normalize entity name to UID format
 */
function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

/**
 * Generate entity UID
 */
function generateEntityUID(type: string, name: string): string {
  const prefix = type.toLowerCase().replace(/_/g, "");
  const normalized = normalizeEntityName(name);
  return `${prefix}:${normalized}`;
}

/**
 * Merge similar entities based on string similarity
 *
 * Groups entities of the same type and merges those with high name similarity.
 * Uses Levenshtein distance to calculate similarity (threshold: 0.75).
 *
 * @param entities - Array of structured entities from Phase 2
 * @returns Array of merged entities with variants metadata
 */
function mergeSimilarEntities(
  entities: Array<{
    uid: string;
    type: string;
    name: string;
    properties: Record<string, any>;
    _confidence: number;
    _phase: "discovered" | "structured";
  }>
): Array<{
  uid: string;
  type: string;
  name: string;
  properties: Record<string, any>;
  _confidence: number;
  _phase: "discovered" | "structured";
}> {
  const merged: typeof entities = [];
  const processed = new Set<number>();

  // Group entities by type for separate processing
  const entitiesByType = new Map<string, number[]>();
  entities.forEach((entity, idx) => {
    if (!entitiesByType.has(entity.type)) {
      entitiesByType.set(entity.type, []);
    }
    entitiesByType.get(entity.type)!.push(idx);
  });

  // Process each entity type separately
  for (const [_type, indices] of entitiesByType) {
    for (const i of indices) {
      if (processed.has(i)) continue;

      const entity = entities[i];
      const variants: typeof entities = [entity];

      // Find similar entities of same type
      for (const j of indices) {
        if (j <= i || processed.has(j)) continue;

        const otherEntity = entities[j];

        // Calculate similarity between entity names (case-insensitive)
        const similarity = calculateStringSimilarity(
          entity.name.toLowerCase(),
          otherEntity.name.toLowerCase()
        );

        // Threshold: 0.75 = 75% similarity
        // This catches variants like "Bernie Sanders" vs "Bernard Sanders" (93%)
        // but not "Bernie Sanders" vs "Sen. Sanders" (64%)
        if (similarity >= 0.75) {
          variants.push(otherEntity);
          processed.add(j);
        }
      }

      processed.add(i);

      // Select canonical name (longest/most complete)
      const canonical = variants.sort(
        (a, b) => b.name.length - a.name.length
      )[0];

      // Merge properties from all variants
      const mergedProperties = variants.reduce(
        (acc, v) => ({ ...acc, ...v.properties }),
        canonical.properties
      );

      // Store variant names if any were found
      if (variants.length > 1) {
        const variantNames = variants
          .map((v) => v.name)
          .filter((n) => n !== canonical.name);

        mergedProperties._variants = variantNames;
      }

      merged.push({
        ...canonical,
        properties: mergedProperties,
        _confidence: Math.max(...variants.map((v) => v._confidence)),
      });
    }
  }

  return merged;
}

/**
 * Basic Entity Extraction Tool
 *
 * Two-phase extraction:
 * 1. Discover entities in text
 * 2. Extract required fields for each entity
 */
export const entityExtractionBasicTool = tool(
  async (input: {
    text: string;
    domains: string[];
    entityTypes?: string[];
    modelId?: string;
    temperature?: number;
    maxEntities?: number;
  }): Promise<EntityExtractionResult> => {
    const {
      text,
      domains,
      entityTypes = [
        "person",
        "organization",
        "location",
        "event",
        "publication",
      ],
      modelId,
      temperature,
      maxEntities = 25,
    } = input;

    console.log("🚀 Starting basic entity extraction");
    console.log(`   Domains: ${domains.join(", ")}`);
    console.log(`   Entity types: ${entityTypes.join(", ")}`);
    console.log(`   Max entities: ${maxEntities}`);

    const errors: string[] = [];
    const startTime = Date.now();

    // ============================================================================
    // PHASE 1: DISCOVER - Find all entities
    // ============================================================================

    console.log("\n🔍 Phase 1: DISCOVER - Finding entities...");
    const discoverStart = Date.now();
    let discoveredEntities: Map<string, string[]> = new Map();

    try {
      const entityTypesList = entityTypes.join(", ");
      const exampleOutput: Record<string, any[]> = {};
      if (entityTypes.includes("person")) {
        exampleOutput.person = [{ name: "Marie Curie" }];
      }
      if (entityTypes.includes("organization")) {
        exampleOutput.organization = [{ name: "Sorbonne" }];
      }
      if (entityTypes.includes("location")) {
        exampleOutput.location = [{ name: "Paris" }];
      }

      const result = await callLangExtract({
        text,
        prompt: `Extract all UNIQUE entities mentioned in this text. 
For each entity, use the most complete formal name.
DO NOT include the same entity multiple times with different names or titles.
If a person is mentioned as "Bernie Sanders", "Bernard Sanders", "Sen. Sanders", or "Senator Sanders", only include "Bernie Sanders" once.
If an organization has variants like "IBM", "International Business Machines", only include the most complete form.

Entity types to extract: ${entityTypesList}
Focus on domains: ${domains.join(", ")}`,
        examples: [
          {
            input_text:
              "Marie Curie worked at Sorbonne in Paris on radioactivity research.",
            expected_output: exampleOutput,
          },
          {
            input_text:
              "Bernie Sanders was born in Brooklyn. Bernard Sanders served as mayor of Burlington. Sen. Sanders was elected to the Senate.",
            expected_output: {
              person: [{ name: "Bernie Sanders" }],
              location: [{ name: "Brooklyn" }, { name: "Burlington" }],
            },
          },
        ],
        modelId,
        temperature,
      });

      Object.entries(result.data || {}).forEach(([entityType, entities]) => {
        if (Array.isArray(entities)) {
          const entityNames = entities.map(
            (e: any) => e.name || e._extraction_text
          );

          // Deduplicate by normalized name at discovery phase
          const seenNormalized = new Set<string>();
          const uniqueNames = entityNames.filter((name: string) => {
            const normalized = normalizeEntityName(name);
            if (seenNormalized.has(normalized)) {
              console.log(
                `   ⚠️ Discovery duplicate: "${name}" (normalized: ${normalized})`
              );
              return false;
            }
            seenNormalized.add(normalized);
            return true;
          });

          discoveredEntities.set(entityType, uniqueNames);
        }
      });

      const discoveredCount = Array.from(discoveredEntities.values()).flat()
        .length;
      console.log(`✅ Phase 1 complete: Found ${discoveredCount} entities`);
    } catch (error) {
      const errorMsg = `Phase 1 (Discover) failed: ${error}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }

    const discoverTime = Date.now() - discoverStart;

    // Apply maxEntities limit
    if (discoveredEntities.size > 0) {
      const allDiscovered = Array.from(discoveredEntities.entries()).flatMap(
        ([type, names]) => names.map((name) => ({ type, name }))
      );

      if (allDiscovered.length > maxEntities) {
        console.log(
          `   Limiting: ${allDiscovered.length} found → ${maxEntities} returned`
        );
        const limited = allDiscovered.slice(0, maxEntities);
        discoveredEntities = new Map();
        limited.forEach(({ type, name }) => {
          if (!discoveredEntities.has(type)) {
            discoveredEntities.set(type, []);
          }
          discoveredEntities.get(type)!.push(name);
        });
      }
    }

    // ============================================================================
    // PHASE 2: STRUCTURE - Extract required fields for each entity
    // ============================================================================

    console.log("\n🏗️ Phase 2: STRUCTURE - Extracting required fields...");
    const structureStart = Date.now();
    const structuredEntities: Array<{
      uid: string;
      type: string;
      name: string;
      properties: Record<string, any>;
      _confidence: number;
      _phase: "structured";
    }> = [];

    try {
      // Process each entity type
      for (const [entityType, entityNames] of discoveredEntities.entries()) {
        console.log(
          `   Processing ${entityNames.length} ${entityType} entities...`
        );

        // Configure batch size for concurrent processing (respects rate limits)
        const BATCH_SIZE = 5;

        // Process entityNames in concurrent batches
        for (let i = 0; i < entityNames.length; i += BATCH_SIZE) {
          const batch = entityNames.slice(i, i + BATCH_SIZE);

          // Create promises for all items in the batch
          const batchPromises = batch.map((entityName) =>
            callLangExtract({
              text,
              prompt: `Extract properties for ${entityType}: ${entityName}. Include name and any relevant attributes mentioned in the text.`,
              examples: [
                {
                  input_text:
                    "Albert Einstein was a German-born theoretical physicist.",
                  expected_output: {
                    [`${entityType}_structured`]: [
                      {
                        name: "Albert Einstein",
                        nationality: "German",
                        occupation: "theoretical physicist",
                      },
                    ],
                  },
                },
              ],
              modelId,
              temperature,
            })
              .then((result) => ({ success: true, entityName, result }))
              .catch((error) => ({
                success: false,
                entityName,
                error,
              }))
          );

          // Await all promises in batch to complete
          const batchResults = await Promise.allSettled(batchPromises);

          // Process batch results
          batchResults.forEach((settledResult, idx) => {
            if (settledResult.status === "fulfilled") {
              const resultValue = settledResult.value;
              const { success, entityName } = resultValue;

              if (success && "result" in resultValue) {
                const result = resultValue.result;
                // Extract entity data - merge all entities from LangExtract array
                Object.entries(result.data || {}).forEach(([key, entities]) => {
                  if (Array.isArray(entities) && entities.length > 0) {
                    const extractedData = mergeLangExtractEntities(entities);
                    const uid = generateEntityUID(entityType, entityName);

                    structuredEntities.push({
                      uid,
                      type:
                        entityType.charAt(0).toUpperCase() +
                        entityType.slice(1),
                      name: extractedData.name || entityName,
                      properties: Object.fromEntries(
                        Object.entries(extractedData).filter(
                          ([k]) => !["name", "uid", "type"].includes(k)
                        )
                      ),
                      _confidence: extractedData._confidence || 0.85,
                      _phase: "structured",
                    });
                  }
                });
              } else if (!success && "error" in resultValue) {
                // Log error and create minimal fallback entity
                const error = resultValue.error;
                console.warn(`   ⚠️ Failed to structure ${entityName}:`, error);
                const uid = generateEntityUID(entityType, entityName);
                structuredEntities.push({
                  uid,
                  type:
                    entityType.charAt(0).toUpperCase() + entityType.slice(1),
                  name: entityName,
                  properties: {},
                  _confidence: 0.5,
                  _phase: "structured",
                });
              }
            } else {
              // Handle promise rejection from Promise.allSettled
              const batchItem = batch[idx];
              console.warn(
                `   ⚠️ Failed to structure ${batchItem}:`,
                settledResult.reason
              );
              const uid = generateEntityUID(entityType, batchItem);
              structuredEntities.push({
                uid,
                type: entityType.charAt(0).toUpperCase() + entityType.slice(1),
                name: batchItem,
                properties: {},
                _confidence: 0.5,
                _phase: "structured",
              });
            }
          });
        }
      }

      console.log(
        `✅ Phase 2 complete: Structured ${structuredEntities.length} entities`
      );
    } catch (error) {
      const errorMsg = `Phase 2 (Structure) failed: ${error}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }

    const structureTime = Date.now() - structureStart;

    // ============================================================================
    // SEMANTIC MERGE - Merge entities with similar names
    // ============================================================================

    console.log("\n🔀 Merging similar entities...");
    const mergedEntities = mergeSimilarEntities(structuredEntities);
    const mergeCount = structuredEntities.length - mergedEntities.length;

    if (mergeCount > 0) {
      console.log(
        `   Merged ${structuredEntities.length} → ${mergedEntities.length} entities`
      );
      console.log(`   Removed ${mergeCount} semantic duplicates`);

      // Log merged groups for debugging
      const mergedGroups = mergedEntities.filter(
        (e) => e.properties._variants && e.properties._variants.length > 0
      );
      if (mergedGroups.length > 0) {
        console.log("   Merged entity groups:");
        mergedGroups.forEach((entity) => {
          console.log(
            `   - ${entity.name} ← [${entity.properties._variants.join(", ")}]`
          );
        });
      }
    } else {
      console.log("   No semantic duplicates found");
    }

    const totalTime = Date.now() - startTime;

    // ============================================================================
    // DEDUPLICATION - Remove entities with identical UIDs
    // ============================================================================

    const seenUids = new Set<string>();
    const deduplicatedEntities = mergedEntities.filter((entity) => {
      if (seenUids.has(entity.uid)) {
        console.log(
          `   ⚠️ Duplicate UID detected: ${entity.uid} (${entity.name})`
        );
        return false;
      }
      seenUids.add(entity.uid);
      return true;
    });

    if (deduplicatedEntities.length < mergedEntities.length) {
      console.log(
        `   Removed ${mergedEntities.length - deduplicatedEntities.length} duplicate UIDs`
      );
    }

    // ============================================================================
    // RESULTS
    // ============================================================================

    const entityTypesFound = Array.from(
      new Set(deduplicatedEntities.map((e) => e.type))
    );

    console.log("\n📊 Extraction Summary:");
    console.log(
      `   Discovered: ${Array.from(discoveredEntities.values()).flat().length}`
    );
    console.log(`   Structured: ${deduplicatedEntities.length}`);
    console.log(`   Entity types: ${entityTypesFound.join(", ")}`);
    console.log(`   Total time: ${totalTime}ms`);

    return {
      entities: deduplicatedEntities,
      processingTime: {
        discover: discoverTime,
        structure: structureTime,
        total: totalTime,
      },
      stats: {
        totalDiscovered: Array.from(discoveredEntities.values()).flat().length,
        totalStructured: deduplicatedEntities.length,
        entityTypes: entityTypesFound,
      },
      errors,
    };
  },
  {
    name: "entity_extraction_basic",
    description:
      "Extract entities from text using two-phase workflow: discover entities, then extract their properties. Returns structured entities without relationships.",
    schema: z.object({
      text: z.string().describe("Text content to extract entities from"),
      domains: z
        .array(z.string())
        .describe(
          "Domain contexts (e.g., social, academic, geographic) to guide extraction"
        ),
      entityTypes: z
        .array(z.string())
        .optional()
        .describe(
          "Specific entity types to extract (defaults to common types)"
        ),
      modelId: z
        .string()
        .optional()
        .describe("LangExtract model ID (defaults to gemini-2.5-flash)"),
      temperature: z
        .number()
        .optional()
        .describe("Model temperature (0.0-1.0)"),
      maxEntities: z
        .number()
        .optional()
        .describe("Maximum entities to return (defaults to 25)"),
    }),
  }
);
