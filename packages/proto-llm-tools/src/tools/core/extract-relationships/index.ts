import { tool } from "@langchain/core/tools";
import * as z from "zod";

import { langextractConfig } from "../../../config/langextract-config";
import { enqueueLangExtract } from "../../../utils/enqueueLangExtract";
import { getRelationshipExample } from "../../../utils/getRelationshipExample";

/**
 * Entity Schema for relationship extraction
 */
const EntitySchema = z.object({
  uid: z.string().describe("Unique identifier"),
  name: z.string().describe("Entity name"),
  type: z.string().describe("Entity type"),
});

/**
 * Extracted Relationship Schema
 */
const ExtractedRelationshipSchema = z.object({
  uid: z.string().describe("Unique relationship identifier"),
  type: z
    .string()
    .describe("Relationship type (WORKED_AT, COLLABORATED_WITH, etc.)"),
  source: z.string().describe("Source entity UID"),
  target: z.string().describe("Target entity UID"),
  confidence: z.number().min(0).max(1).describe("Confidence score (0-1)"),
  properties: z
    .record(z.string(), z.any())
    .optional()
    .describe("Additional properties (dates, description, etc.)"),
  sourceText: z
    .string()
    .optional()
    .describe("Source text where relationship was found"),
  startChar: z.number().optional().describe("Start character position"),
  endChar: z.number().optional().describe("End character position"),
});

/**
 * Tool Input Schema for Relationship Extraction
 */
const ExtractRelationshipsInputSchema = z.object({
  content: z.string().describe("Text content to extract relationships from"),
  entities: z
    .array(EntitySchema)
    .min(2)
    .describe("Array of entities to find relationships between"),

  // Focus entities
  focusEntityUids: z
    .array(z.string())
    .optional()
    .describe(
      "UIDs of entities to focus relationship extraction on (only find relationships involving these entities)"
    ),

  // Domain filtering
  domains: z
    .array(z.string())
    .optional()
    .default(["social", "academic", "geographic"])
    .describe("Knowledge domains to get valid relationship types from"),

  // Batch processing
  batchSize: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe(
      "Number of entities to process per batch (for large entity sets)"
    ),

  // Confidence filtering
  confidenceThreshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.7)
    .describe("Minimum confidence score for relationships (0-1)"),

  // LLM parameters
  modelId: z.string().optional().describe("Model ID to use for extraction"),
  temperature: z
    .number()
    .min(0)
    .max(2)
    .optional()
    .describe("Model temperature (0-2)"),

  // Processing options
  includeSourceGrounding: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include source text references for relationships"),
  excludeGenericRelationships: z
    .boolean()
    .optional()
    .default(true)
    .describe("Exclude generic RELATED_TO relationships"),
});

/**
 * Tool Output Schema
 */
const ExtractRelationshipsOutputSchema = z.object({
  success: z.boolean().describe("Whether extraction succeeded"),
  relationships: z
    .array(ExtractedRelationshipSchema)
    .describe("Extracted relationships"),
  metadata: z.object({
    totalFound: z
      .number()
      .describe("Total relationships found before filtering"),
    returned: z
      .number()
      .describe("Number of relationships returned after filtering"),
    entitiesProcessed: z.number().describe("Number of entities processed"),
    focusEntitiesCount: z.number().describe("Number of focus entities"),
    batchesProcessed: z.number().describe("Number of batches processed"),
    domains: z.array(z.string()).describe("Domains used"),
    modelUsed: z.string(),
    contentLength: z.number(),
  }),
});

/**
 * Generate relationship UID
 */
function generateRelationshipUID(
  source: string,
  target: string,
  type: string
): string {
  return `rel:${source}_${type}_${target}`;
}

/**
 * Resolve entity name to UID with fuzzy matching
 */
function resolveEntityUID(
  entityName: string | undefined,
  entities: Array<{ uid: string; name: string }>
): string | undefined {
  if (!entityName) return undefined;

  const query = entityName.trim().toLowerCase();
  if (!query) return undefined;

  // Exact match first
  const exact = entities.find((e) => e.name.toLowerCase() === query);
  if (exact) return exact.uid;

  // Partial match fallback
  return entities.find((e) => {
    const name = e.name.toLowerCase();
    return name.includes(query) || query.includes(name);
  })?.uid;
}

/**
 * Build focused relationship extraction prompt (concise, under 1000 chars)
 */
function buildFocusedRelationshipPrompt(
  focusEntity: { name: string; type: string },
  otherEntities: Array<{ name: string; type: string }>
): string {
  const entityList = otherEntities.map((e) => e.name).join(", ");

  return `Find relationships between ${focusEntity.name} and: ${entityList}. For each relationship provide: source_entity, target_entity, relationship_type, dates if mentioned, and confidence (0.0-1.0).`;
}

/**
 * Generic Relationship Extraction Tool
 *
 * Extracts relationships between entities from text content.
 * Supports focus entities, domain-aware relationship types, and batching.
 *
 * @core tool
 */
export const extractRelationshipsTool = tool(
  async (input: z.infer<typeof ExtractRelationshipsInputSchema>) => {
    const {
      content,
      entities,
      focusEntityUids,
      domains = ["social", "academic", "geographic"],
      batchSize = 10,
      confidenceThreshold = 0.7,
      modelId = langextractConfig.defaults.modelId,
      temperature,
      includeSourceGrounding = true,
      excludeGenericRelationships = true,
    } = input;

    console.log(
      `🔗 Extracting relationships from ${content.length} character content`
    );
    console.log(`   Entities: ${entities.length}`);
    console.log(`   Focus entities: ${focusEntityUids?.length || 0}`);
    console.log(`   Domains: ${domains.join(", ")}`);

    if (entities.length < 2) {
      return {
        success: false,
        relationships: [],
        metadata: {
          totalFound: 0,
          returned: 0,
          entitiesProcessed: 0,
          focusEntitiesCount: 0,
          batchesProcessed: 0,
          domains,
          modelUsed: modelId,
          contentLength: content.length,
        },
        error: "At least 2 entities are required to extract relationships",
      };
    }

    try {
      // Get relationship example from domain configs
      const relationshipExample = getRelationshipExample(domains);

      // Separate focus entities from others
      let focusEntities = entities;
      let otherEntities: typeof entities = [];

      if (focusEntityUids && focusEntityUids.length > 0) {
        const focusSet = new Set(focusEntityUids);
        focusEntities = entities.filter((e) => focusSet.has(e.uid));
        otherEntities = entities.filter((e) => !focusSet.has(e.uid));
        console.log(
          `   Focus strategy: ${focusEntities.length} focus, ${otherEntities.length} other`
        );
      } else {
        // If no focus entities, use all entities
        otherEntities = entities;
        console.log(`   No focus entities - extracting all relationships`);
      }

      const allRelationships: any[] = [];
      let batchesProcessed = 0;

      // If we have focus entities, process relationships for each focus entity
      if (focusEntityUids && focusEntityUids.length > 0) {
        for (const focusEntity of focusEntities) {
          // Process other entities in batches
          for (let i = 0; i < otherEntities.length; i += batchSize) {
            const batch = otherEntities.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(otherEntities.length / batchSize);

            console.log(
              `   Batch ${batchNum}/${totalBatches} for ${focusEntity.name}: ${batch.length} entities`
            );

            const prompt = buildFocusedRelationshipPrompt(focusEntity, batch);

            const result = await enqueueLangExtract({
              textContent: content,
              extractionPrompt: prompt,
              modelId,
              temperature,
              includeSourceGrounding,
              useSchemaConstraints: false,
              examples: [relationshipExample],
            });

            // Extract relationships from result
            let relationshipsData: any[] = [];

            // Try multiple possible locations for relationships
            if (result.data?.relationships) {
              relationshipsData = result.data.relationships;
            } else if (result.data?.relationship) {
              relationshipsData = result.data.relationship;
            } else if (result.data?.extracted_data?.[0]?.relationships) {
              relationshipsData = result.data.extracted_data[0].relationships;
            } else {
              // Fallback: check all keys for arrays that look like relationships
              for (const [key, value] of Object.entries(result.data || {})) {
                if (Array.isArray(value) && value.length > 0) {
                  const firstItem = value[0];
                  if (
                    firstItem &&
                    (firstItem.source_entity ||
                      firstItem.source ||
                      firstItem.relationship_type ||
                      firstItem.type)
                  ) {
                    console.log(`   Found relationships in key: ${key}`);
                    relationshipsData = value;
                    break;
                  }
                }
              }
            }

            console.log(
              `   Extracted ${relationshipsData.length} relationships from batch`
            );
            allRelationships.push(...relationshipsData);
            batchesProcessed++;
          }
        }
      } else {
        // No focus entities - extract all relationships between all entities
        const entityNames = entities.map((e) => e.name).join(", ");

        const prompt = `Extract relationships between: ${entityNames}. For each provide: source_entity, target_entity, relationship_type, dates if mentioned, and confidence (0.0-1.0).`;

        const result = await enqueueLangExtract({
          textContent: content,
          extractionPrompt: prompt,
          modelId,
          temperature,
          includeSourceGrounding,
          useSchemaConstraints: false,
          examples: [relationshipExample],
        });

        let relationshipsData: any[] = [];

        // Try multiple possible locations for relationships
        if (result.data?.relationships) {
          relationshipsData = result.data.relationships;
        } else if (result.data?.relationship) {
          relationshipsData = result.data.relationship;
        } else if (result.data?.extracted_data?.[0]?.relationships) {
          relationshipsData = result.data.extracted_data[0].relationships;
        } else {
          // Fallback: check all keys for arrays that look like relationships
          for (const [key, value] of Object.entries(result.data || {})) {
            if (Array.isArray(value) && value.length > 0) {
              const firstItem = value[0];
              if (
                firstItem &&
                (firstItem.source_entity ||
                  firstItem.source ||
                  firstItem.relationship_type ||
                  firstItem.type)
              ) {
                console.log(`   Found relationships in key: ${key}`);
                relationshipsData = value;
                break;
              }
            }
          }
        }

        console.log(`   Extracted ${relationshipsData.length} relationships`);
        allRelationships.push(...relationshipsData);
        batchesProcessed = 1;
      }

      console.log(`   Found ${allRelationships.length} raw relationships`);

      // Process and deduplicate relationships
      const relationshipsMap = new Map<string, any>();

      for (const rel of allRelationships) {
        const sourceUid = resolveEntityUID(
          rel.source_entity || rel.source,
          entities
        );
        const targetUid = resolveEntityUID(
          rel.target_entity || rel.target,
          entities
        );
        const relType = rel.relationship_type || rel.type || "RELATED_TO";
        const confidence = rel.confidence || rel._confidence || 0.8;

        // Skip invalid relationships
        if (!sourceUid || !targetUid || sourceUid === targetUid) {
          console.log(
            `   ⚠️ Skipping invalid: ${rel.source_entity} -> ${rel.target_entity}`
          );
          continue;
        }

        // Skip generic relationships if excluded
        if (excludeGenericRelationships && relType === "RELATED_TO") {
          console.log(`   ⚠️ Skipping generic RELATED_TO relationship`);
          continue;
        }

        // Apply confidence threshold
        if (confidence < confidenceThreshold) {
          console.log(
            `   ⚠️ Skipping low confidence (${confidence} < ${confidenceThreshold}): ${rel.source_entity} -> ${rel.target_entity}`
          );
          continue;
        }

        const uid = generateRelationshipUID(sourceUid, targetUid, relType);

        // Deduplicate
        if (!relationshipsMap.has(uid)) {
          relationshipsMap.set(uid, {
            uid,
            type: relType,
            source: sourceUid,
            target: targetUid,
            confidence,
            properties: {
              ...(rel.start_date && { start_date: rel.start_date }),
              ...(rel.end_date && { end_date: rel.end_date }),
              ...(rel.description && { description: rel.description }),
            },
          });
        }
      }

      const relationships = Array.from(relationshipsMap.values());

      console.log(
        `✅ Extraction complete: ${allRelationships.length} raw -> ${relationships.length} valid relationships`
      );

      return {
        success: true,
        relationships,
        metadata: {
          totalFound: allRelationships.length,
          returned: relationships.length,
          entitiesProcessed: entities.length,
          focusEntitiesCount: focusEntityUids?.length || 0,
          batchesProcessed,
          domains,
          modelUsed: modelId,
          contentLength: content.length,
        },
      };
    } catch (error) {
      console.error(`❌ Relationship extraction failed:`, error);

      return {
        success: false,
        relationships: [],
        metadata: {
          totalFound: 0,
          returned: 0,
          entitiesProcessed: entities.length,
          focusEntitiesCount: focusEntityUids?.length || 0,
          batchesProcessed: 0,
          domains,
          modelUsed: modelId,
          contentLength: content.length,
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
  {
    name: "extract_relationships",
    description:
      "Extract relationships between entities from text content. Supports focus entities for targeted extraction, domain-aware relationship types, batching for large entity sets, and confidence filtering.",
    schema: ExtractRelationshipsInputSchema,
  }
);

/**
 * Schema exports for API routes
 */
export { ExtractRelationshipsInputSchema, ExtractRelationshipsOutputSchema };

/**
 * Type exports for consumers
 */
export type ExtractRelationshipsInput = z.infer<
  typeof ExtractRelationshipsInputSchema
>;
export type ExtractRelationshipsOutput = z.infer<
  typeof ExtractRelationshipsOutputSchema
>;
export type ExtractedRelationship = z.infer<typeof ExtractedRelationshipSchema>;
export type Entity = z.infer<typeof EntitySchema>;
