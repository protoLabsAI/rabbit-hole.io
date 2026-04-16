import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia_query_run";
import { RunnableConfig } from "@langchain/core/runnables";

import {
  generateEntityUID,
  type Entity,
  type Evidence,
} from "@protolabsai/types";

import { wikipediaConfig } from "../../../config/wikipedia-config";
import type { EntityResearchPlaygroundState, GraphNodeData } from "../state";

// Initialize Wikipedia tool
const wikipediaTool = new WikipediaQueryRun({
  topKResults: wikipediaConfig.defaults.topKResults,
  maxDocContentLength: wikipediaConfig.defaults.maxContentLength,
});

// ==================== Node 1: Validate Input ====================

/**
 * Validate Input Node
 *
 * Validates input parameters and sets defaults for field selection.
 * Default behavior: 'basic' depth extracts only required fields.
 */
export async function validateInputNode(
  state: EntityResearchPlaygroundState,
  config: RunnableConfig
): Promise<Partial<EntityResearchPlaygroundState>> {
  const { entityName, entityType, selectedFields, researchDepth, skipReview } =
    state.config;

  console.log(`🔍 Validating input for: ${entityName} (${entityType})`);

  // Validation checks
  const errors: string[] = [];

  if (!entityName || entityName.trim().length === 0) {
    errors.push("Entity name is required");
  }

  if (!entityType) {
    errors.push("Entity type is required");
  }

  if (entityName && entityName.length > 200) {
    errors.push("Entity name too long (max 200 characters)");
  }

  if (errors.length > 0) {
    console.error(`❌ Validation failed:`, errors);
    return {
      report: {
        ...state.report,
        success: false,
        errors: [...(state.report?.errors || []), ...errors],
      },
      metadata: {
        ...state.metadata,
        currentNode: "validateInput",
        nodesExecuted: [
          ...(state.metadata?.nodesExecuted || []),
          "validateInput",
        ],
      },
    };
  }

  // If no fields selected, use required fields based on depth
  const effectiveFields = selectedFields?.length > 0 ? selectedFields : [];

  console.log(
    `✅ Input validated successfully. Fields: ${effectiveFields.length || "auto-detect"}, Depth: ${researchDepth}`
  );

  return {
    config: {
      ...state.config,
      selectedFields: effectiveFields,
    },
    metadata: {
      ...state.metadata,
      currentNode: "validateInput",
      nodesExecuted: [
        ...(state.metadata?.nodesExecuted || []),
        "validateInput",
      ],
    },
  };
}

// ==================== Node 2: Fetch Wikipedia ====================

/**
 * Fetch Wikipedia Node
 *
 * Fetches Wikipedia data for the target entity.
 */
export async function fetchWikipediaNode(
  state: EntityResearchPlaygroundState,
  config: RunnableConfig
): Promise<Partial<EntityResearchPlaygroundState>> {
  const { entityName } = state.config;

  console.log(`📚 Fetching Wikipedia data for: ${entityName}`);

  try {
    const startTime = Date.now();

    // Fetch Wikipedia data
    const content = await wikipediaTool.invoke(entityName);
    const fetchDuration = Date.now() - startTime;

    const sourceUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(entityName.replace(/\s+/g, "_"))}`;

    console.log(
      `✅ Wikipedia data retrieved (${content.length} chars in ${fetchDuration}ms)`
    );

    return {
      wikipediaData: {
        content,
        sourceUrl,
        retrievedAt: new Date().toISOString(),
        contentLength: content.length,
        fetchSuccess: true,
      },
      metadata: {
        ...state.metadata,
        currentNode: "fetchWikipedia",
        nodesExecuted: [
          ...(state.metadata?.nodesExecuted || []),
          "fetchWikipedia",
        ],
      },
    };
  } catch (error) {
    console.warn(`⚠️ Wikipedia fetch failed for ${entityName}:`, error);

    return {
      wikipediaData: {
        content: "",
        sourceUrl: "",
        retrievedAt: new Date().toISOString(),
        contentLength: 0,
        fetchSuccess: false,
        fetchError: String(error),
      },
      report: {
        ...state.report,
        warnings: [
          ...(state.report?.warnings || []),
          `Wikipedia fetch failed: ${error}`,
        ],
      },
      metadata: {
        ...state.metadata,
        currentNode: "fetchWikipedia",
        nodesExecuted: [
          ...(state.metadata?.nodesExecuted || []),
          "fetchWikipedia",
        ],
      },
    };
  }
}

// ==================== Node 3: Create Evidence ====================

/**
 * Create Evidence Node (NEW)
 *
 * Creates Evidence node for Wikipedia source BEFORE entity extraction.
 * Core philosophy: Evidence first, then entities.
 */
export async function createEvidenceNode(
  state: EntityResearchPlaygroundState,
  config: RunnableConfig
): Promise<Partial<EntityResearchPlaygroundState>> {
  const { entityName } = state.config;
  const { sourceUrl, retrievedAt, contentLength, fetchSuccess } =
    state.wikipediaData;

  console.log(`📋 Creating evidence node for Wikipedia source`);

  if (!fetchSuccess) {
    console.warn(`⚠️ Skipping evidence creation - Wikipedia fetch failed`);
    return {
      evidence: {
        primaryEvidence: null,
        evidenceList: [],
      },
      metadata: {
        ...state.metadata,
        currentNode: "createEvidence",
        nodesExecuted: [
          ...(state.metadata?.nodesExecuted || []),
          "createEvidence",
        ],
      },
    };
  }

  // Generate evidence UID with date to ensure uniqueness across multiple extractions
  const dateStamp = new Date().toISOString().split("T")[0];
  const sanitizedName = entityName.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const evidenceUid = `evidence:wikipedia_${sanitizedName}_${dateStamp}`;

  // Create Evidence node for Wikipedia article
  const evidence: Evidence = {
    uid: evidenceUid,
    kind: "major_media",
    title: `${entityName} - Wikipedia Article`,
    publisher: "Wikipedia",
    date: dateStamp,
    url: sourceUrl,
    reliability: 0.85, // Wikipedia baseline reliability
    notes: `Auto-retrieved Wikipedia article (${contentLength} characters) on ${new Date(retrievedAt).toLocaleDateString("en-US")}`,
  };

  console.log(`✅ Created evidence node: ${evidenceUid}`);

  return {
    evidence: {
      primaryEvidence: evidence,
      evidenceList: [evidence],
    },
    metadata: {
      ...state.metadata,
      currentNode: "createEvidence",
      nodesExecuted: [
        ...(state.metadata?.nodesExecuted || []),
        "createEvidence",
      ],
    },
  };
}

// ==================== Node 4: Extract Entities ====================

/**
 * Extract Entities Node
 *
 * Uses LangExtract to extract structured entity data from Wikipedia content.
 * Filters fields based on selectedFields configuration.
 */
export async function extractEntitiesNode(
  state: EntityResearchPlaygroundState,
  config: RunnableConfig
): Promise<Partial<EntityResearchPlaygroundState>> {
  const { entityName, entityType, selectedFields, researchDepth } =
    state.config;
  const wikipediaData = state.wikipediaData;

  console.log(`🔬 Extracting entity data for: ${entityName}`);

  // Check if we have Wikipedia data
  if (!wikipediaData?.fetchSuccess || !wikipediaData.content) {
    console.error(`❌ No Wikipedia data available for extraction`);
    return {
      extraction: {
        extractionMethod: "fallback",
        fieldsExtracted: [],
        propertiesCount: 0,
      },
      report: {
        ...state.report,
        errors: [
          ...(state.report?.errors || []),
          "No Wikipedia data available for extraction",
        ],
      },
      metadata: {
        ...state.metadata,
        currentNode: "extractEntities",
        nodesExecuted: [
          ...(state.metadata?.nodesExecuted || []),
          "extractEntities",
        ],
      },
    };
  }

  try {
    // Dynamic import of LangExtract client tool
    const { langextractClientTool } = await import(
      "../../../tools/langextract-client"
    );

    console.log(
      `📤 Calling LangExtract API (entity: ${entityType}, depth: ${researchDepth})`
    );

    // Build prompt description based on entity type and selected fields
    const fieldsList =
      selectedFields.length > 0
        ? selectedFields.join(", ")
        : "all relevant properties";
    const promptDescription = `Extract ${entityType} entity information including: ${fieldsList}. Focus on ${researchDepth} level of detail.`;

    // Call LangExtract with Wikipedia content (must be array)
    const extractionResult = await langextractClientTool.invoke({
      textOrDocuments: [wikipediaData.content],
      promptDescription,
      includeSourceGrounding: true,
    });

    if (!extractionResult.success || !extractionResult.extractedData) {
      throw new Error("LangExtract returned no entity data");
    }

    // Map LangExtract response to Entity format
    const entity: Entity = {
      uid: generateEntityUID(entityName, entityType),
      type: entityType,
      name: extractionResult.extractedData.name || entityName,
      properties: extractionResult.extractedData,
      tags: extractionResult.extractedData.tags || [],
      aliases: extractionResult.extractedData.aliases || [],
    };

    const fieldsExtracted = Object.keys(entity.properties || {});

    console.log(
      `✅ Entity extracted successfully. Properties: ${fieldsExtracted.length}`
    );

    return {
      extraction: {
        entity,
        extractionMethod: "langextract",
        rawExtractionData: extractionResult,
        fieldsExtracted,
        propertiesCount: fieldsExtracted.length,
      },
      metadata: {
        ...state.metadata,
        currentNode: "extractEntities",
        nodesExecuted: [
          ...(state.metadata?.nodesExecuted || []),
          "extractEntities",
        ],
      },
    };
  } catch (error) {
    console.error(`❌ Entity extraction failed:`, error);

    // Fallback: Create minimal entity
    const fallbackEntity: Entity = {
      uid: generateEntityUID(entityName, entityType),
      type: entityType,
      name: entityName,
      properties: {},
      tags: [],
      aliases: [],
    };

    return {
      extraction: {
        entity: fallbackEntity,
        extractionMethod: "fallback",
        rawExtractionData: null,
        fieldsExtracted: [],
        propertiesCount: 0,
      },
      report: {
        ...state.report,
        errors: [
          ...(state.report?.errors || []),
          `Entity extraction failed: ${error}`,
        ],
      },
      metadata: {
        ...state.metadata,
        currentNode: "extractEntities",
        nodesExecuted: [
          ...(state.metadata?.nodesExecuted || []),
          "extractEntities",
        ],
      },
    };
  }
}

// ==================== Node 4: Process Extraction ====================

/**
 * Process Extraction Node
 *
 * Validates extracted data against schema and calculates quality metrics.
 */
export async function processExtractionNode(
  state: EntityResearchPlaygroundState,
  config: RunnableConfig
): Promise<Partial<EntityResearchPlaygroundState>> {
  const { entity, fieldsExtracted } = state.extraction;
  const { selectedFields, researchDepth } = state.config;

  console.log(`⚙️ Processing extracted entity data`);

  if (!entity) {
    return {
      report: {
        ...state.report,
        success: false,
        confidence: 0,
        completeness: 0,
        reliability: 0,
        errors: [...(state.report?.errors || []), "No entity data to process"],
      },
      metadata: {
        ...state.metadata,
        currentNode: "processExtraction",
        nodesExecuted: [
          ...(state.metadata?.nodesExecuted || []),
          "processExtraction",
        ],
      },
    };
  }

  // Calculate quality metrics
  const confidence = calculateConfidence(state);
  const completeness = calculateCompleteness(state);
  const reliability = calculateReliability(state);

  // Identify data gaps
  const dataGaps: string[] = [];
  if (selectedFields.length > 0) {
    selectedFields.forEach((field) => {
      if (!fieldsExtracted.includes(field)) {
        dataGaps.push(`Missing requested field: ${field}`);
      }
    });
  }

  // Generate warnings
  const warnings: string[] = [];
  if (completeness < 0.5) {
    warnings.push("Low completeness score - many fields missing");
  }
  if (confidence < 0.6) {
    warnings.push("Low confidence score - extraction may be unreliable");
  }

  console.log(
    `✅ Processing complete. Confidence: ${(confidence * 100).toFixed(0)}%, Completeness: ${(completeness * 100).toFixed(0)}%`
  );

  return {
    report: {
      ...state.report,
      confidence,
      completeness,
      reliability,
      warnings: [...(state.report?.warnings || []), ...warnings],
      dataGaps,
    },
    metadata: {
      ...state.metadata,
      currentNode: "processExtraction",
      nodesExecuted: [
        ...(state.metadata?.nodesExecuted || []),
        "processExtraction",
      ],
    },
  };
}

// ==================== Node 5: Update Graph (NEW) ====================

/**
 * Update Graph Node
 *
 * Broadcasts entity to shared state for real-time graph visualization updates.
 * This is the key node that enables live graph updates in the playground UI.
 */
export async function updateGraphNode(
  state: EntityResearchPlaygroundState,
  config: RunnableConfig
): Promise<Partial<EntityResearchPlaygroundState>> {
  const { entity } = state.extraction;
  const { entityType } = state.config;

  console.log(`🔄 Broadcasting entity to graph visualization`);

  if (!entity) {
    return {
      report: {
        ...state.report,
        errors: [...(state.report?.errors || []), "No entity to add to graph"],
      },
      metadata: {
        ...state.metadata,
        currentNode: "updateGraph",
        nodesExecuted: [
          ...(state.metadata?.nodesExecuted || []),
          "updateGraph",
        ],
      },
    };
  }

  // Create graph update event with properly typed node data
  const nodeData: GraphNodeData = {
    uid: entity.uid,
    name: entity.name,
    type: entity.type,
    properties: entity.properties,
    tags: entity.tags,
    aliases: entity.aliases,
  };

  const graphUpdate = {
    action: "ADD_NODE" as const,
    node: {
      id: entity.uid,
      type: entityType,
      data: nodeData as unknown,
      // Initial position - force layout will animate it
      position: {
        x: Math.random() * 500,
        y: Math.random() * 500,
      },
    },
  };

  console.log(`✅ Graph update prepared for entity: ${entity.name}`);

  return {
    report: {
      ...state.report,
      graphUpdate,
    },
    metadata: {
      ...state.metadata,
      currentNode: "updateGraph",
      nodesExecuted: [...(state.metadata?.nodesExecuted || []), "updateGraph"],
    },
  };
}

// ==================== Node 6: Generate Report ====================

/**
 * Generate Report Node
 *
 * Generates final extraction report with summary and status.
 */
export async function generateReportNode(
  state: EntityResearchPlaygroundState,
  config: RunnableConfig
): Promise<Partial<EntityResearchPlaygroundState>> {
  const { entity, fieldsExtracted, extractionMethod } = state.extraction;
  const { entityName, entityType } = state.config;
  const { confidence, completeness, reliability, warnings, errors, dataGaps } =
    state.report;

  console.log(`📊 Generating final extraction report`);

  // Determine success
  const success =
    !!entity &&
    (errors?.length || 0) === 0 &&
    confidence > 0.5 &&
    completeness > 0.3;

  // Generate summary
  const summary = generateSummary(state);

  // Calculate final processing duration
  const processingDuration =
    (state.metadata?.endTime || Date.now()) - state.metadata.startTime;

  console.log(
    `✅ Report generated. Success: ${success}, Method: ${extractionMethod}`
  );

  return {
    report: {
      ...state.report,
      success,
      summary,
    },
    metadata: {
      ...state.metadata,
      endTime: Date.now(),
      processingDuration,
      currentNode: "generateReport",
      nodesExecuted: [
        ...(state.metadata?.nodesExecuted || []),
        "generateReport",
      ],
    },
  };
}

// ==================== Helper Functions ====================

/**
 * Calculate confidence score based on extraction method and data quality
 */
function calculateConfidence(state: EntityResearchPlaygroundState): number {
  const { extractionMethod, propertiesCount } = state.extraction;
  const { fetchSuccess } = state.wikipediaData;

  let baseScore = 0.5;

  // Extraction method contributes to confidence
  if (extractionMethod === "langextract") {
    baseScore = 0.8;
  } else if (extractionMethod === "fallback") {
    baseScore = 0.3;
  }

  // Wikipedia fetch success increases confidence
  if (fetchSuccess) {
    baseScore += 0.1;
  }

  // More properties = higher confidence
  const propertyBonus = Math.min(propertiesCount * 0.02, 0.2);
  baseScore += propertyBonus;

  return Math.min(baseScore, 1.0);
}

/**
 * Calculate completeness score based on fields extracted vs requested
 */
function calculateCompleteness(state: EntityResearchPlaygroundState): number {
  const { fieldsExtracted } = state.extraction;
  const { selectedFields } = state.config;

  if (selectedFields.length === 0) {
    // No specific fields requested - base on properties count
    return Math.min(fieldsExtracted.length * 0.1, 1.0);
  }

  // Calculate percentage of requested fields that were found
  const foundCount = selectedFields.filter((field) =>
    fieldsExtracted.includes(field)
  ).length;

  return foundCount / selectedFields.length;
}

/**
 * Calculate reliability score based on data sources and consistency
 */
function calculateReliability(state: EntityResearchPlaygroundState): number {
  const { fetchSuccess, contentLength } = state.wikipediaData;
  const { extractionMethod } = state.extraction;

  let score = 0.5;

  // Wikipedia as source is generally reliable
  if (fetchSuccess) {
    score += 0.2;
  }

  // Longer content suggests more comprehensive data
  if (contentLength > 5000) {
    score += 0.2;
  } else if (contentLength > 1000) {
    score += 0.1;
  }

  // LangExtract is more reliable than fallback
  if (extractionMethod === "langextract") {
    score += 0.1;
  }

  return Math.min(score, 1.0);
}

/**
 * Generate human-readable summary of extraction results
 */
function generateSummary(state: EntityResearchPlaygroundState): string {
  const { entity, fieldsExtracted, extractionMethod } = state.extraction;
  const { entityName, entityType } = state.config;
  const { confidence, completeness, errors } = state.report;

  if (!entity || (errors?.length || 0) > 0) {
    return `Failed to extract ${entityType} entity for "${entityName}". ${errors?.join("; ") || "Unknown error"}`;
  }

  const confidencePercent = (confidence * 100).toFixed(0);
  const completenessPercent = (completeness * 100).toFixed(0);

  return `Successfully extracted ${entityType} entity "${entityName}" with ${fieldsExtracted.length} properties using ${extractionMethod}. Confidence: ${confidencePercent}%, Completeness: ${completenessPercent}%.`;
}
