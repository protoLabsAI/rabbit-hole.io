import { StateGraph, END, START, Annotation } from "@langchain/langgraph";

import { mergeLangExtractEntities } from "@proto/utils";

import { langextractConfig } from "../config/langextract-config";
import { enqueueLangExtract } from "../utils/enqueueLangExtract";

import {
  getEnrichmentFieldsForEntity,
  generateEnrichmentExample,
} from "./domain-schema-extractor";
import {
  getEntityTypesForDomains,
  getDomainColorForEntity,
  getDomainIconForEntity,
  getDomainNameForEntity,
  generateDomainUID,
} from "./multi-phase-extraction-utils";

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ExtractionMode = "discover" | "structure" | "enrich" | "deep_dive";

export interface ConfidenceThresholds {
  discover: number;
  structure: number;
  enrich: number;
  relate: number;
}

export interface SourceGrounding {
  text: string;
  startChar: number;
  endChar: number;
  entityType: string;
  confidence?: number;
}

export interface TiptapAnnotation {
  from: number;
  to: number;
  mark: {
    type: string;
    attrs: {
      entityUid: string;
      entityType: string;
      entityName: string;
      domain: string;
      confidence: number;
      color: string;
      attributes: Record<string, any>;
    };
  };
}

export interface Entity {
  uid: string;
  type: string;
  name: string;
  [key: string]: any;
}

export interface Relationship {
  source_uid: string;
  target_uid: string;
  relationship_type: string;
  start_date?: string;
  end_date?: string;
  properties?: Record<string, any>;
  evidence_text: string;
  confidence: number;
}

// ============================================================================
// State Definition
// ============================================================================

const ExtractionStateAnnotation = Annotation.Root({
  // Input
  inputText: Annotation<string>,
  mode: Annotation<ExtractionMode>,
  domains: Annotation<string[]>,
  modelId: Annotation<string | undefined>({
    reducer: (current, update) => update ?? current,
    default: () => undefined,
  }),
  temperature: Annotation<number | undefined>({
    reducer: (current, update) => update ?? current,
    default: () => undefined,
  }),
  includeEntityTypes: Annotation<string[] | undefined>({
    reducer: (current, update) => update ?? current,
    default: () => undefined,
  }),
  excludeEntityTypes: Annotation<string[] | undefined>({
    reducer: (current, update) => update ?? current,
    default: () => undefined,
  }),
  confidenceThresholds: Annotation<ConfidenceThresholds>,

  // Phase 1: Discovery
  discoveredEntities: Annotation<Map<string, string[]>>({
    reducer: (current, update) => update ?? current,
    default: () => new Map(),
  }),
  phase1Annotations: Annotation<SourceGrounding[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),

  // Phase 2: Structure
  structuredEntities: Annotation<Map<string, Entity>>({
    reducer: (current, update) => update ?? current,
    default: () => new Map(),
  }),
  phase2Annotations: Annotation<SourceGrounding[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),

  // Phase 3: Enrich
  enrichedEntities: Annotation<Map<string, Entity>>({
    reducer: (current, update) => update ?? current,
    default: () => new Map(),
  }),
  phase3Annotations: Annotation<SourceGrounding[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),

  // Phase 4: Relate
  relationships: Annotation<Relationship[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),
  phase4Annotations: Annotation<SourceGrounding[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),

  // Final outputs
  allAnnotations: Annotation<TiptapAnnotation[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),

  // Metadata
  processingTime: Annotation<Record<string, number>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),
  errorLog: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
});

type ExtractionState = typeof ExtractionStateAnnotation.State;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Filter entity types based on include/exclude lists
 */
function filterEntityTypes(
  allTypes: string[],
  include?: string[],
  exclude?: string[]
): string[] {
  let filtered = allTypes;

  if (include && include.length > 0) {
    const includeSet = new Set(include);
    filtered = filtered.filter((type) => includeSet.has(type));
  }

  if (exclude && exclude.length > 0) {
    const excludeSet = new Set(exclude);
    filtered = filtered.filter((type) => !excludeSet.has(type));
  }

  return filtered;
}

async function callLangExtract(params: {
  text: string;
  prompt: string;
  examples: any[];
  includeSourceGrounding?: boolean;
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
    includeSourceGrounding: params.includeSourceGrounding ?? true,
    useSchemaConstraints: true,
    // Schema derived from outputFormat examples by langextract service
  });
}

// ============================================================================
// Phase 1: DISCOVER - Entity Detection
// ============================================================================

async function discoverNode(
  state: ExtractionState
): Promise<Partial<ExtractionState>> {
  console.log("🔍 Phase 1: DISCOVER - Finding entities...");
  const startTime = Date.now();

  try {
    // Get entity types from selected domains
    const allEntityTypes = getEntityTypesForDomains(state.domains);
    const filteredEntityTypes = filterEntityTypes(
      allEntityTypes,
      state.includeEntityTypes,
      state.excludeEntityTypes
    );

    console.log(`   Domains: ${state.domains.join(", ")}`);
    console.log(`   Entity types to extract: ${filteredEntityTypes.length}`);
    console.log(
      `   Types: ${filteredEntityTypes.slice(0, 10).join(", ")}${filteredEntityTypes.length > 10 ? "..." : ""}`
    );

    // Build dynamic example based on available entity types
    const exampleOutput: Record<string, any[]> = {};
    if (filteredEntityTypes.includes("Person")) {
      exampleOutput.person = [{ name: "Marie Curie" }];
    }
    if (filteredEntityTypes.includes("Organization")) {
      exampleOutput.organization = [{ name: "Sorbonne" }];
    }
    if (
      filteredEntityTypes.includes("Location") ||
      filteredEntityTypes.includes("City")
    ) {
      exampleOutput.location = [{ name: "Paris" }];
    }

    // Fallback to basic types if no domain matches
    if (Object.keys(exampleOutput).length === 0) {
      exampleOutput.entity = [{ name: "Example Entity" }];
    }

    const entityTypesList = filteredEntityTypes
      .map((t) => t.toLowerCase())
      .join(", ");

    const result = await callLangExtract({
      text: state.inputText,
      prompt: `Extract all entities mentioned in this text. Focus on these types: ${entityTypesList}. Identify people, organizations, locations, events, publications, and concepts relevant to these domains: ${state.domains.join(", ")}.`,
      examples: [
        {
          input_text:
            "Marie Curie worked at Sorbonne in Paris on radioactivity research.",
          expected_output: exampleOutput,
        },
      ],
      modelId: state.modelId,
      temperature: state.temperature,
    });

    // Process results
    const discoveredEntities = new Map<string, string[]>();
    const annotations: SourceGrounding[] = [];

    // Group entities by type
    Object.entries(result.data || {}).forEach(([entityType, entities]) => {
      if (Array.isArray(entities)) {
        const entityNames = entities.map(
          (e: any) => e.name || e._extraction_text
        );
        discoveredEntities.set(entityType, entityNames);
      }
    });

    // Build source groundings
    if (result.source_grounding) {
      result.source_grounding.forEach((sg: any) => {
        annotations.push({
          text: sg.text_span,
          startChar: sg.start_char,
          endChar: sg.end_char,
          entityType: "discovered",
          confidence: sg.confidence,
        });
      });
    }

    const processingTime = Date.now() - startTime;
    console.log(
      `✅ Phase 1 complete: Found ${Array.from(discoveredEntities.values()).flat().length} entities`
    );

    return {
      discoveredEntities,
      phase1Annotations: annotations,
      processingTime: { discover: processingTime },
    };
  } catch (error) {
    console.error("❌ Phase 1 failed:", error);
    return {
      errorLog: [`Phase 1 (Discover) failed: ${error}`],
      processingTime: { discover: Date.now() - startTime },
    };
  }
}

// ============================================================================
// Phase 2: STRUCTURE - Required Fields
// ============================================================================

async function structureNode(
  state: ExtractionState
): Promise<Partial<ExtractionState>> {
  console.log("🏗️ Phase 2: STRUCTURE - Extracting required fields...");
  const startTime = Date.now();

  try {
    const structuredEntities = new Map<string, Entity>();
    const annotations: SourceGrounding[] = [];

    // Batch configuration for concurrent processing (respects rate limits)
    const BATCH_SIZE = 5;

    // Process each entity type with batched concurrency
    for (const [
      entityType,
      entityNames,
    ] of state.discoveredEntities.entries()) {
      // Process entityNames in concurrent batches
      for (let i = 0; i < entityNames.length; i += BATCH_SIZE) {
        const batch = entityNames.slice(i, i + BATCH_SIZE);

        // Create promises for all items in the batch
        const batchPromises = batch.map((entityName) =>
          callLangExtract({
            text: state.inputText,
            prompt: `Extract required fields for ${entityType}: ${entityName}. Include uid, type, and name.`,
            examples: [
              {
                input_text:
                  "Albert Einstein was a German-born theoretical physicist.",
                expected_output: {
                  [`${entityType}_structured`]: [
                    {
                      uid: `${entityType}:albert_einstein`,
                      type:
                        entityType.charAt(0).toUpperCase() +
                        entityType.slice(1),
                      name: "Albert Einstein",
                    },
                  ],
                },
              },
            ],
            modelId: state.modelId,
            temperature: state.temperature,
            includeSourceGrounding: true,
          })
            .then((result) => ({ success: true, entityName, result }))
            .catch((error) => ({ success: false, entityName, error }))
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
              // Process result - merge all entities from LangExtract array
              Object.entries(result.data || {}).forEach(
                ([key, entities]: [string, any]) => {
                  if (Array.isArray(entities) && entities.length > 0) {
                    // Merge all entity data from LangExtract array
                    const mergedEntity = entities.reduce(
                      (acc, curr) => ({
                        ...acc,
                        ...curr,
                      }),
                      {}
                    );

                    const domainName =
                      getDomainNameForEntity(entityType) || state.domains[0];
                    const uid =
                      mergedEntity.uid ||
                      generateDomainUID(
                        mergedEntity.name || entityName,
                        entityType,
                        domainName
                      );

                    // Extract properties (remove metadata fields)
                    const {
                      uid: _,
                      type: __,
                      name: ___,
                      _confidence,
                      _extraction_text,
                      _extraction_source,
                      ...properties
                    } = mergedEntity;

                    structuredEntities.set(uid, {
                      uid,
                      type:
                        mergedEntity.type ||
                        entityType.charAt(0).toUpperCase() +
                          entityType.slice(1),
                      name: mergedEntity.name || entityName,
                      properties, // Include all extracted properties
                      _confidence: mergedEntity._confidence || 0.85,
                      _domain: domainName,
                    });
                  }
                }
              );

              // Extract source grounding annotations if present
              if ((result as any).source_grounding) {
                const groundings = (result as any).source_grounding;
                if (Array.isArray(groundings)) {
                  groundings.forEach((grounding: any) => {
                    annotations.push({
                      text: grounding.text_span || grounding.text,
                      startChar: grounding.start_char || 0,
                      endChar: grounding.end_char || 0,
                      entityType,
                      confidence: grounding.confidence || 0.85,
                    });
                  });
                }
              }
            } else if (!success && "error" in resultValue) {
              // Log error and create minimal fallback entity
              const error = resultValue.error;
              console.warn(`   ⚠️ Failed to structure ${entityName}:`, error);
              const domainName =
                getDomainNameForEntity(entityType) || state.domains[0];
              const uid = generateDomainUID(entityName, entityType, domainName);
              structuredEntities.set(uid, {
                uid,
                type: entityType.charAt(0).toUpperCase() + entityType.slice(1),
                name: entityName,
                _confidence: 0.5,
                _domain: domainName,
              });
            }
          } else {
            // Handle promise rejection from Promise.allSettled
            const batchItem = batch[idx];
            console.warn(
              `   ⚠️ Failed to structure ${batchItem}:`,
              settledResult.reason
            );
            const domainName =
              getDomainNameForEntity(entityType) || state.domains[0];
            const uid = generateDomainUID(batchItem, entityType, domainName);
            structuredEntities.set(uid, {
              uid,
              type: entityType.charAt(0).toUpperCase() + entityType.slice(1),
              name: batchItem,
              _confidence: 0.5,
              _domain: domainName,
            });
          }
        });
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(
      `✅ Phase 2 complete: Structured ${structuredEntities.size} entities`
    );

    return {
      structuredEntities,
      phase2Annotations: annotations,
      processingTime: { structure: processingTime },
    };
  } catch (error) {
    console.error("❌ Phase 2 failed:", error);
    return {
      errorLog: [`Phase 2 (Structure) failed: ${error}`],
      processingTime: { structure: Date.now() - startTime },
    };
  }
}

// ============================================================================
// Phase 3: ENRICH - Optional Fields
// ============================================================================

async function enrichNode(
  state: ExtractionState
): Promise<Partial<ExtractionState>> {
  console.log("✨ Phase 3: ENRICH - Adding optional fields...");
  const startTime = Date.now();

  try {
    const enrichedEntities = new Map<string, Entity>();

    // Process each structured entity
    for (const [uid, entity] of state.structuredEntities.entries()) {
      try {
        // Get domain for this entity
        const domainName =
          entity._domain || getDomainNameForEntity(entity.type);

        // Dynamically get enrichment fields from domain schema
        const enrichmentFields = domainName
          ? getEnrichmentFieldsForEntity(entity.type, domainName)
          : ["description", "properties"];

        const fieldsToExtract = enrichmentFields.join(", ");

        // Generate example for this entity type
        const example = generateEnrichmentExample(entity.type);

        const result = await callLangExtract({
          text: state.inputText,
          prompt: `Find information about ${entity.name} (${entity.type}) in the text and extract these details if mentioned: ${fieldsToExtract}.`,
          examples: [example],
          modelId: state.modelId,
          temperature: state.temperature,
        });

        // Merge with structured data - preserve core identity fields
        const enrichedData = { ...entity };

        // Protected fields that should never be overwritten
        const protectedFields = new Set(["uid", "type", "name", "_domain"]);

        Object.entries(result.data || {}).forEach(([key, entities]) => {
          if (Array.isArray(entities) && entities.length > 0) {
            // Merge all entities from LangExtract array
            const extracted = mergeLangExtractEntities(entities, {
              protectedFields: Array.from(protectedFields),
            });
            // Only merge non-empty, non-protected values
            Object.entries(extracted).forEach(([field, value]) => {
              if (
                value &&
                !field.startsWith("_") &&
                !protectedFields.has(field)
              ) {
                enrichedData[field] = value;
              }
            });
          }
        });

        enrichedEntities.set(uid, enrichedData);
      } catch (entityError) {
        console.warn(
          `   ⚠️  Failed to enrich ${entity.name}, using structured data only`
        );
        // Keep the structured entity without enrichment
        enrichedEntities.set(uid, entity);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(
      `✅ Phase 3 complete: Enriched ${enrichedEntities.size} entities`
    );

    return {
      enrichedEntities,
      processingTime: { enrich: processingTime },
    };
  } catch (error) {
    console.error("❌ Phase 3 failed:", error);
    return {
      errorLog: [`Phase 3 (Enrich) failed: ${error}`],
      processingTime: { enrich: Date.now() - startTime },
    };
  }
}

// ============================================================================
// Phase 4: RELATE - Relationship Discovery
// ============================================================================

async function relateNode(
  state: ExtractionState
): Promise<Partial<ExtractionState>> {
  console.log("🔗 Phase 4: RELATE - Discovering relationships...");
  const startTime = Date.now();

  try {
    // Skip if no entities to relate
    if (state.enrichedEntities.size === 0) {
      console.log("   No entities to relate, skipping...");
      return {
        relationships: [],
        processingTime: { relate: Date.now() - startTime },
      };
    }

    // Get unique entity names for relationship extraction
    const uniqueNames = new Set(
      Array.from(state.enrichedEntities.values()).map((e) => e.name)
    );
    const entityNames = Array.from(uniqueNames).join(", ");

    const result = await callLangExtract({
      text: state.inputText,
      prompt: `Given these entities from the text: ${entityNames}. Extract ALL relationships and connections between these entities. Include:
- Who created/wrote/authored what
- Who worked where
- Who was affiliated with what organization  
- Who knew or interacted with whom
- Where things happened or were located
- When events occurred (dates)

For each relationship provide: source_entity, target_entity, relationship_type, dates if mentioned, and description.`,
      examples: [
        {
          input_text:
            "Einstein worked at the University of Zurich from 1912 to 1914 as a professor of theoretical physics. He collaborated with Marie Curie on radioactivity research.",
          expected_output: {
            relationship: [
              {
                source_entity: "Einstein",
                target_entity: "University of Zurich",
                relationship_type: "EMPLOYED_BY",
                start_date: "1912",
                end_date: "1914",
                description: "Professor of theoretical physics",
              },
              {
                source_entity: "Einstein",
                target_entity: "Marie Curie",
                relationship_type: "COLLABORATED_WITH",
                description: "Research on radioactivity",
              },
            ],
          },
        },
      ],
      modelId: state.modelId,
      temperature: state.temperature,
    });

    // Debug: log the full response structure
    console.log(
      `   Response structure:`,
      JSON.stringify(Object.keys(result.data || {}), null, 2)
    );
    if (result.data) {
      Object.entries(result.data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          console.log(`   - ${key}: array with ${value.length} items`);
        } else if (typeof value === "object") {
          console.log(
            `   - ${key}: object with keys ${Object.keys(value).join(", ")}`
          );
        } else {
          console.log(`   - ${key}: ${typeof value}`);
        }
      });
    }

    const relationships: Relationship[] = [];

    // Process relationships and resolve entity UIDs
    // Handle multiple possible response formats from LangExtract
    let relationshipsData: any[] = [];

    if (result.data?.relationship) {
      relationshipsData = result.data.relationship;
    } else if (result.data?.extracted_data) {
      // Check if extracted_data is an array or object
      if (Array.isArray(result.data.extracted_data)) {
        relationshipsData = result.data.extracted_data;
      } else if (typeof result.data.extracted_data === "object") {
        // If it's an object, try to find relationship-like data
        relationshipsData =
          result.data.extracted_data.relationships ||
          result.data.extracted_data.relationship ||
          [];
      }
    } else {
      // Fallback: check all keys for arrays that might contain relationships
      for (const [key, value] of Object.entries(result.data || {})) {
        if (Array.isArray(value) && value.length > 0) {
          // Check if first item looks like a relationship
          const firstItem = value[0];
          if (
            firstItem &&
            (firstItem.source_entity ||
              firstItem.source ||
              firstItem.relationship_type)
          ) {
            relationshipsData = value;
            break;
          }
        }
      }
    }

    console.log(`   Found ${relationshipsData.length} potential relationships`);

    // Debug: log what we're working with
    if (relationshipsData.length > 0) {
      console.log(
        `   Sample relationship data:`,
        JSON.stringify(relationshipsData[0], null, 2)
      );
    }

    // Helper function to resolve entity UID with proper empty string handling and confidence threshold
    const resolveUid = (raw?: string) => {
      const q = (raw ?? "").trim().toLowerCase();
      // Skip empty queries to prevent matching all entities
      if (!q) return undefined;

      // Exact match first
      const exact = Array.from(state.enrichedEntities.entries()).find(
        ([_, e]) => e.name.toLowerCase() === q
      )?.[0];
      if (exact) return exact;

      // Partial match fallback
      return Array.from(state.enrichedEntities.entries()).find(([_, e]) => {
        const n = e.name.toLowerCase();
        return n.includes(q) || q.includes(n);
      })?.[0];
    };

    // Get confidence threshold for relationships from state
    const minRelConf = state.confidenceThresholds?.relate ?? 0;

    for (const rel of relationshipsData) {
      const sourceUID = resolveUid(rel.source_entity ?? rel.source);
      const targetUID = resolveUid(rel.target_entity ?? rel.target);

      if (sourceUID && targetUID) {
        // Apply confidence threshold
        const relConf = rel._confidence ?? rel.confidence ?? 0.8;
        if (relConf < minRelConf) {
          console.warn(
            `   ⚠️  Skipping relationship below confidence threshold (${relConf} < ${minRelConf}): ${rel.source_entity} → ${rel.target_entity}`
          );
          continue;
        }

        relationships.push({
          source_uid: sourceUID,
          target_uid: targetUID,
          relationship_type: rel.relationship_type || "RELATED_TO",
          start_date: rel.start_date,
          end_date: rel.end_date,
          properties: rel.description ? { description: rel.description } : {},
          evidence_text: rel._extraction_text || rel.extraction_text || "",
          confidence: relConf,
        });
      } else {
        console.warn(
          `   ⚠️  Could not resolve entities for relationship: ${rel.source_entity} → ${rel.target_entity}`
        );
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(
      `✅ Phase 4 complete: Found ${relationships.length} relationships`
    );

    // Extract phase4Annotations from source grounding if available
    const phase4Annotations: SourceGrounding[] = [];
    if ((result as any).source_grounding) {
      const groundings = (result as any).source_grounding;
      if (Array.isArray(groundings)) {
        groundings.forEach((grounding: any) => {
          phase4Annotations.push({
            text: grounding.text_span || grounding.text,
            startChar: grounding.start_char || 0,
            endChar: grounding.end_char || 0,
            entityType: "Relationship",
            confidence: grounding.confidence || 0.85,
          });
        });
      }
    }

    return {
      relationships,
      phase4Annotations,
      processingTime: { relate: processingTime },
    };
  } catch (error) {
    console.error("❌ Phase 4 failed:", error);
    return {
      errorLog: [`Phase 4 (Relate) failed: ${error}`],
      processingTime: { relate: Date.now() - startTime },
    };
  }
}

// ============================================================================
// Annotation Node - Convert to Tiptap Format
// ============================================================================

async function annotationNode(
  state: ExtractionState
): Promise<Partial<ExtractionState>> {
  console.log("📝 Creating Tiptap annotations...");

  const allAnnotations: TiptapAnnotation[] = [];

  // Merge all source groundings
  const allGroundings = [
    ...state.phase1Annotations,
    ...state.phase2Annotations,
    ...state.phase3Annotations,
    ...state.phase4Annotations,
  ];

  // Build span index: map text spans to entity UIDs for robust O(n) lookup
  const spanIndex = new Map<string, { uid: string; entity: Entity }>();
  for (const [uid, entity] of state.enrichedEntities.entries()) {
    const key = entity.name.toLowerCase();
    spanIndex.set(key, { uid, entity });
  }

  // Convert to Tiptap marks with improved entity resolution
  allGroundings.forEach((grounding) => {
    const groundingText = (grounding.text || "").toLowerCase().trim();

    // Strategy 1: Exact match in span index
    let resolvedUid: string | undefined;
    let resolvedEntity: Entity | undefined;

    const exactMatch = spanIndex.get(groundingText);
    if (exactMatch) {
      resolvedUid = exactMatch.uid;
      resolvedEntity = exactMatch.entity;
    } else {
      // Strategy 2: Partial/fuzzy match
      // Find entity where grounding text is contained in entity name or vice versa
      let bestMatch: { uid: string; entity: Entity } | undefined;
      let bestScore = 0;

      for (const [entityName, match] of spanIndex.entries()) {
        // Check if either string contains the other
        if (
          entityName.includes(groundingText) ||
          groundingText.includes(entityName)
        ) {
          // Score: prefer longer matches (more specific)
          const score = Math.max(entityName.length, groundingText.length);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = match;
          }
        }
      }

      if (bestMatch) {
        resolvedUid = bestMatch.uid;
        resolvedEntity = bestMatch.entity;
      }
    }

    if (resolvedEntity) {
      const domainName =
        (resolvedEntity as any)._domain ||
        getDomainNameForEntity(resolvedEntity.type) ||
        state.domains[0];
      const color = getDomainColorForEntity(resolvedEntity.type);
      const icon = getDomainIconForEntity(resolvedEntity.type);

      allAnnotations.push({
        from: grounding.startChar,
        to: grounding.endChar,
        mark: {
          type: "entityHighlight",
          attrs: {
            entityUid: resolvedUid || resolvedEntity.uid,
            entityType: resolvedEntity.type,
            entityName: resolvedEntity.name,
            domain: domainName,
            confidence: grounding.confidence || 0.85,
            color,
            attributes: resolvedEntity,
          },
        },
      });
    }
  });

  console.log(`✅ Created ${allAnnotations.length} annotations`);

  return {
    allAnnotations,
  };
}

// ============================================================================
// Graph Definition
// ============================================================================

const workflow = new StateGraph(ExtractionStateAnnotation)
  .addNode("discover", discoverNode)
  .addNode("structure", structureNode)
  .addNode("enrich", enrichNode)
  .addNode("relate", relateNode)
  .addNode("annotate", annotationNode);

// Conditional routing based on mode
workflow.addEdge(START, "discover");

workflow.addConditionalEdges("discover", (state) => {
  if (state.mode === "discover") return "annotate";
  return "structure";
});

workflow.addConditionalEdges("structure", (state) => {
  if (state.mode === "structure") return "annotate";
  return "enrich";
});

workflow.addConditionalEdges("enrich", (state) => {
  if (state.mode === "enrich") return "annotate";
  return "relate";
});

workflow.addEdge("relate", "annotate");
workflow.addEdge("annotate", END);

export const extractionGraph = workflow.compile();

// Export phase nodes for human-loop integration
export { discoverNode, structureNode, enrichNode, relateNode, annotationNode };
