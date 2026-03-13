import { tool } from "@langchain/core/tools";
import * as z from "zod";

import { langextractConfig } from "../../../config/langextract-config";
import { enqueueLangExtract } from "../../../utils/enqueueLangExtract";
import { getEntityTypesForDomains } from "../../../workflows/multi-phase-extraction-utils";

/**
 * Discovered Entity
 */
const DiscoveredEntitySchema = z.object({
  uid: z.string().describe("Unique identifier (type:normalized_name)"),
  type: z
    .string()
    .describe("Entity type (Person, Organization, Location, etc.)"),
  name: z.string().describe("Entity name as it appears in text"),
  confidence: z.number().min(0).max(1).describe("Confidence score (0-1)"),
  sourceText: z
    .string()
    .optional()
    .describe("Source text span where entity was found"),
  startChar: z.number().optional().describe("Start character position in text"),
  endChar: z.number().optional().describe("End character position in text"),
});

/**
 * Tool Input Schema for Entity Discovery
 */
const DiscoverEntitiesInputSchema = z.object({
  content: z.string().describe("Text content to discover entities from"),

  // Domain and type filtering
  domains: z
    .array(z.string())
    .optional()
    .default(["social", "academic", "geographic"])
    .describe(
      "Knowledge domains to focus on (social, academic, geographic, medical, etc.)"
    ),
  entityTypes: z
    .array(z.string())
    .optional()
    .describe(
      "Specific entity types to extract (Person, Organization, Location, etc.). If not provided, uses all types from domains."
    ),

  // Focus entities
  focusEntityNames: z
    .array(z.string())
    .optional()
    .describe("Names of entities to prioritize and return in results"),

  // Limits
  maxEntities: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(25)
    .describe("Maximum number of entities to return"),

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
    .describe("Include source text references for discovered entities"),
  confidenceThreshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.7)
    .describe("Minimum confidence score to include entity (0-1)"),
});

/**
 * Tool Output Schema
 */
const DiscoverEntitiesOutputSchema = z.object({
  success: z.boolean().describe("Whether discovery succeeded"),
  entities: z.array(DiscoveredEntitySchema).describe("Discovered entities"),
  metadata: z.object({
    totalFound: z.number().describe("Total entities found before filtering"),
    returned: z
      .number()
      .describe("Number of entities returned after filtering"),
    domains: z.array(z.string()).describe("Domains used for discovery"),
    entityTypes: z.array(z.string()).describe("Entity types extracted"),
    focusEntityUids: z
      .array(z.string())
      .optional()
      .describe("UIDs of focus entities"),
    modelUsed: z.string(),
    contentLength: z.number(),
  }),
});

/**
 * Normalize entity name to UID format
 */
function normalizeEntityName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

/**
 * Generate entity UID
 */
function generateEntityUID(type: string, name: string): string {
  return `${type}:${normalizeEntityName(name)}`;
}

/**
 * Build dynamic example output based on entity types
 */
function buildExampleOutput(entityTypes: string[]): Record<string, any[]> {
  const exampleOutput: Record<string, any[]> = {};

  if (entityTypes.includes("Person")) {
    exampleOutput.person = [{ name: "Marie Curie" }];
  }
  if (entityTypes.includes("Organization")) {
    exampleOutput.organization = [{ name: "Sorbonne" }];
  }
  if (entityTypes.includes("Location") || entityTypes.includes("City")) {
    exampleOutput.location = [{ name: "Paris" }];
  }
  if (entityTypes.includes("Event")) {
    exampleOutput.event = [{ name: "World War II" }];
  }
  if (entityTypes.includes("Publication")) {
    exampleOutput.publication = [{ name: "Nature Journal" }];
  }
  if (entityTypes.includes("Concept")) {
    exampleOutput.concept = [{ name: "radioactivity" }];
  }

  // Fallback to basic types if no domain matches
  if (Object.keys(exampleOutput).length === 0) {
    exampleOutput.entity = [{ name: "Example Entity" }];
  }

  return exampleOutput;
}

/**
 * Match focus entity names to discovered entity UIDs
 */
function matchFocusEntityNames(
  focusNames: string[],
  entities: Array<{ uid: string; name: string }>
): string[] {
  const focusUIDs: string[] = [];
  const normalizedFocusNames = focusNames.map((n) => normalizeEntityName(n));

  for (const entity of entities) {
    const normalizedEntityName = normalizeEntityName(entity.name);

    // Check if entity name matches any focus name
    if (
      normalizedFocusNames.some(
        (focusName) =>
          normalizedEntityName.includes(focusName) ||
          focusName.includes(normalizedEntityName)
      )
    ) {
      focusUIDs.push(entity.uid);
    }
  }

  return focusUIDs;
}

/**
 * Generic Entity Discovery Tool
 *
 * Discovers entities in text content using domain-aware extraction.
 * Supports filtering by domains, entity types, and focus entities.
 *
 * @core tool
 */
export const discoverEntitiesTool = tool(
  async (input: z.infer<typeof DiscoverEntitiesInputSchema>) => {
    const {
      content,
      domains = ["social", "academic", "geographic"],
      entityTypes: requestedEntityTypes,
      focusEntityNames,
      maxEntities = 25,
      modelId = langextractConfig.defaults.modelId,
      temperature,
      includeSourceGrounding = true,
      confidenceThreshold = 0.7,
    } = input;

    console.log(
      `🔍 Discovering entities in ${content.length} character content`
    );
    console.log(`   Domains: ${domains.join(", ")}`);
    console.log(`   Max entities: ${maxEntities}`);

    try {
      // Get entity types from domains or use requested types
      const entityTypes =
        requestedEntityTypes && requestedEntityTypes.length > 0
          ? requestedEntityTypes
          : getEntityTypesForDomains(domains);

      console.log(`   Entity types: ${entityTypes.length} types`);

      // Build dynamic example and prompt
      const exampleOutput = buildExampleOutput(entityTypes);
      const entityTypesList = entityTypes
        .map((t) => t.toLowerCase())
        .join(", ");

      const extractionPrompt = `Extract all entities mentioned in this text. Focus on these types: ${entityTypesList}. Identify people, organizations, locations, events, publications, and concepts relevant to these domains: ${domains.join(", ")}.`;

      // Call langextract
      const result = await enqueueLangExtract({
        textContent: content,
        extractionPrompt,
        modelId,
        temperature,
        includeSourceGrounding,
        useSchemaConstraints: false,
        examples: [
          {
            input_text:
              "Marie Curie worked at Sorbonne in Paris on radioactivity research.",
            expected_output: exampleOutput,
          },
        ],
      });

      // Process results
      const entitiesMap = new Map<string, any>();
      const sourceGroundingMap = new Map<string, any>();

      // Group entities by type and deduplicate
      Object.entries(result.data || {}).forEach(([entityType, entities]) => {
        if (Array.isArray(entities)) {
          for (const entity of entities) {
            const entityName = entity.name || entity._extraction_text;
            if (!entityName) continue;

            // Normalize type (capitalize first letter)
            const normalizedType =
              entityType.charAt(0).toUpperCase() + entityType.slice(1);

            // Generate UID with normalized type to match docs (e.g., "Person:marie_curie")
            const uid = generateEntityUID(normalizedType, entityName);

            // Deduplicate - only add if not already present
            if (!entitiesMap.has(uid)) {
              entitiesMap.set(uid, {
                uid,
                type: normalizedType,
                name: entityName,
                confidence: entity.confidence ?? 0.85, // Default confidence if not provided, preserve explicit 0
              });
            }
          }
        }
      });

      // Build source grounding map
      if (result.source_grounding) {
        for (const sg of result.source_grounding) {
          const text = sg.text_span || sg.sourceText;
          if (!text) continue;

          // Try to match grounding to entities
          for (const [uid, entity] of entitiesMap.entries()) {
            if (text.toLowerCase().includes(entity.name.toLowerCase())) {
              sourceGroundingMap.set(uid, {
                sourceText: text,
                startChar: sg.start_char || sg.startChar,
                endChar: sg.end_char || sg.endChar,
                confidence: sg.confidence,
              });
              break;
            }
          }
        }
      }

      // Filter by confidence threshold
      let entities = Array.from(entitiesMap.values()).filter(
        (entity) => entity.confidence >= confidenceThreshold
      );

      console.log(
        `   Found ${entities.length} entities (after confidence filter)`
      );

      // Match focus entities
      let focusEntityUids: string[] = [];
      if (focusEntityNames && focusEntityNames.length > 0) {
        focusEntityUids = matchFocusEntityNames(focusEntityNames, entities);
        console.log(`   Focus entities matched: ${focusEntityUids.length}`);
      }

      // Apply maxEntities limit with focus entity prioritization
      const totalFound = entities.length;
      if (entities.length > maxEntities) {
        console.log(
          `   Limiting: ${entities.length} found → ${maxEntities} returned`
        );

        // Prioritize focus entities
        const focusSet = new Set(focusEntityUids);
        const focusEntities = entities.filter((e) => focusSet.has(e.uid));
        const otherEntities = entities.filter((e) => !focusSet.has(e.uid));

        entities = [
          ...focusEntities,
          ...otherEntities.slice(
            0,
            Math.max(0, maxEntities - focusEntities.length)
          ),
        ];
      }

      // Merge source grounding into entities
      const entitiesWithGrounding = entities.map((entity) => {
        const grounding = sourceGroundingMap.get(entity.uid);
        return {
          ...entity,
          ...(grounding || {}),
        };
      });

      console.log(
        `✅ Discovery complete: ${entitiesWithGrounding.length} entities returned`
      );

      return {
        success: true,
        entities: entitiesWithGrounding,
        metadata: {
          totalFound,
          returned: entitiesWithGrounding.length,
          domains,
          entityTypes,
          focusEntityUids:
            focusEntityUids.length > 0 ? focusEntityUids : undefined,
          modelUsed: modelId,
          contentLength: content.length,
        },
      };
    } catch (error) {
      console.error(`❌ Entity discovery failed:`, error);

      return {
        success: false,
        entities: [],
        metadata: {
          totalFound: 0,
          returned: 0,
          domains,
          entityTypes: requestedEntityTypes || [],
          modelUsed: modelId,
          contentLength: content.length,
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
  {
    name: "discover_entities",
    description:
      "Discover entities in text content using domain-aware extraction. Returns entities with types, confidence scores, and optional source grounding. Supports filtering by domains, entity types, and focus entities.",
    schema: DiscoverEntitiesInputSchema,
  }
);

/**
 * Schema exports for API routes
 */
export { DiscoverEntitiesInputSchema, DiscoverEntitiesOutputSchema };

/**
 * Type exports for consumers
 */
export type DiscoverEntitiesInput = z.infer<typeof DiscoverEntitiesInputSchema>;
export type DiscoverEntitiesOutput = z.infer<
  typeof DiscoverEntitiesOutputSchema
>;
export type DiscoveredEntity = z.infer<typeof DiscoveredEntitySchema>;
