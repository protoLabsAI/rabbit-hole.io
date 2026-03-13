import { tool } from "@langchain/core/tools";
import * as z from "zod";

import { langextractConfig } from "../../../config/langextract-config";
import { enqueueLangExtract } from "../../../utils/enqueueLangExtract";

/**
 * Tool Input Schema for Entity Enrichment
 */
const EnrichEntityInputSchema = z.object({
  entityName: z.string().describe("Name of the entity to enrich"),
  entityType: z
    .string()
    .describe("Type of entity (e.g., Person, Organization, Location)"),
  content: z.string().describe("Text content to extract enrichment data from"),

  // Schema-based OR example-based extraction
  // NOTE: Schema-based extraction currently has issues with LangExtract service
  // @TODO: https://linear.app/rabbit-hole-dev/issue/RAB-195/fix-schema-based-extraction-in-enrichentitytool
  schema: z
    .record(z.string(), z.any())
    .optional()
    .describe(
      "[EXPERIMENTAL] JSON schema defining the structure of enrichment fields to extract. Currently not working reliably - use examples instead."
    ),
  examples: z
    .array(
      z.object({
        input_text: z.string(),
        expected_output: z.record(z.string(), z.any()),
      })
    )
    .optional()
    .describe(
      "Example inputs/outputs to guide extraction. This is the recommended approach."
    ),

  // Optional fields to extract (used in prompt)
  fieldsToExtract: z
    .array(z.string())
    .optional()
    .describe(
      "List of field names to extract (e.g., ['description', 'founded', 'headquarters'])"
    ),

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
    .describe("Include source text references in output"),
});

/**
 * Tool Output Schema
 */
const EnrichEntityOutputSchema = z.object({
  success: z.boolean().describe("Whether enrichment succeeded"),
  enrichedData: z
    .record(z.string(), z.any())
    .describe("Extracted enrichment data"),
  metadata: z.object({
    modelUsed: z.string(),
    contentLength: z.number(),
    fieldsExtracted: z.array(z.string()),
    useSchemaConstraints: z.boolean(),
  }),
  sourceGrounding: z
    .array(
      z.object({
        field: z.string(),
        sourceText: z.string(),
        startIndex: z.number().optional(),
        endIndex: z.number().optional(),
      })
    )
    .optional()
    .describe("Source text references for extracted data"),
});

/**
 * Generic Entity Enrichment Tool
 *
 * Enriches entities by extracting structured data from provided content.
 * Supports both schema-based and example-based extraction.
 *
 * @core tool
 */
export const enrichEntityTool = tool(
  async (input: z.infer<typeof EnrichEntityInputSchema>) => {
    const {
      entityName,
      entityType,
      content,
      schema,
      examples,
      fieldsToExtract,
      modelId = langextractConfig.defaults.modelId,
      temperature = langextractConfig.defaults.temperature,
      includeSourceGrounding = true,
    } = input;

    console.log(`✨ Enriching ${entityType}: ${entityName}`);
    console.log(`   Content: ${content.length} characters`);
    console.log(
      `   Mode: ${schema ? "schema-based [EXPERIMENTAL]" : "example-based [RECOMMENDED]"}`
    );

    // Build extraction prompt
    const fieldsDescription = fieldsToExtract
      ? fieldsToExtract.join(", ")
      : schema
        ? Object.keys(schema).join(", ")
        : "relevant details";

    const extractionPrompt = `Find information about ${entityName} (${entityType}) in the text and extract these details if mentioned: ${fieldsDescription}.`;

    // Determine extraction mode
    // NOTE: Schema-based mode currently has issues - see Linear ticket
    const useSchemaConstraints = !!schema;

    if (schema && !examples) {
      console.warn(
        "⚠️  Schema-based extraction is experimental and may return empty results. Consider providing examples instead."
      );
    }

    try {
      // Call langextract with appropriate parameters
      const result = await enqueueLangExtract({
        textContent: content,
        extractionPrompt,
        modelId,
        temperature,
        includeSourceGrounding,
        useSchemaConstraints,
        // Schema takes precedence over examples
        customSchema: schema,
        examples: schema ? undefined : examples,
      });

      // Extract enrichment data from result
      const enrichedData: Record<string, any> = {};

      // LangExtract returns data in { data: { [entityType]: [entities] } } format
      if (result.data) {
        // Collect all entities from all keys
        const allEntities: any[] = [];
        Object.values(result.data).forEach((entities: any) => {
          if (Array.isArray(entities) && entities.length > 0) {
            allEntities.push(...entities);
          }
        });

        if (allEntities.length > 0) {
          // Find the best matching entity by name similarity
          const entityNameLower = entityName.toLowerCase();

          // Try case-insensitive exact or substring match first
          let bestEntity = allEntities.find((e: any) => {
            const eName = (e.name || e.label || "").toLowerCase();
            return (
              eName === entityNameLower ||
              eName.includes(entityNameLower) ||
              entityNameLower.includes(eName)
            );
          });

          // Fall back to entity with highest confidence if no name match found
          if (!bestEntity) {
            bestEntity = allEntities.reduce((best: any, current: any) => {
              const currentConfidence = Number(current.confidence) || 0;
              const bestConfidence = Number(best.confidence) || 0;
              return currentConfidence > bestConfidence ? current : best;
            });
          }

          if (bestEntity) {
            Object.assign(enrichedData, bestEntity);
          }
        }
      }

      // Extract fields that were actually found
      const fieldsExtracted = Object.keys(enrichedData);

      console.log(
        `✅ Enrichment complete: ${fieldsExtracted.length} fields extracted`
      );

      // Transform source grounding to expected schema shape
      type SourceGrounding = {
        field: string;
        sourceText: string;
        startIndex?: number;
        endIndex?: number;
      };

      const sourceGrounding: SourceGrounding[] = [];
      if (Array.isArray(result.source_grounding)) {
        for (const entry of result.source_grounding) {
          const field = entry.fieldName || entry.field;
          const sourceText = entry.text || entry.source_text;

          if (field && sourceText) {
            const startIndex = Number(entry.start) || entry.startIndex || 0;
            const endIndex =
              Number(entry.end) ||
              entry.endIndex ||
              startIndex + (sourceText?.length ?? 0);

            sourceGrounding.push({
              field,
              sourceText,
              startIndex,
              endIndex,
            });
          }
        }
      }

      return {
        success: true,
        enrichedData,
        metadata: {
          modelUsed: modelId,
          contentLength: content.length,
          fieldsExtracted,
          useSchemaConstraints,
        },
        sourceGrounding:
          sourceGrounding.length > 0 ? sourceGrounding : undefined,
      };
    } catch (error) {
      console.error(`❌ Enrichment failed for ${entityName}:`, error);

      return {
        success: false,
        enrichedData: {},
        metadata: {
          modelUsed: modelId,
          contentLength: content.length,
          fieldsExtracted: [],
          useSchemaConstraints,
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
  {
    name: "enrich_entity",
    description:
      "Enrich an entity by extracting structured data from provided content. Supports both schema-based extraction (when schema is provided) and example-based extraction (when examples are provided). Schema takes precedence over examples.",
    schema: EnrichEntityInputSchema,
  }
);

/**
 * Schema exports for API routes
 */
export { EnrichEntityInputSchema, EnrichEntityOutputSchema };

/**
 * Type exports for consumers
 */
export type EnrichEntityInput = z.infer<typeof EnrichEntityInputSchema>;
export type EnrichEntityOutput = z.infer<typeof EnrichEntityOutputSchema>;
