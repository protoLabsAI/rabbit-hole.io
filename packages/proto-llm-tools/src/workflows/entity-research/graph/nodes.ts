import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia_query_run";
import { RunnableConfig } from "@langchain/core/runnables";

import {
  generateEntityUID,
  generateRelationshipUID,
  type EntityType,
  type Entity,
  type Relationship,
  type Evidence,
  type EntityResearchOutput,
  type ResearchableEntityType,
} from "@proto/types";

import { wikipediaConfig } from "../../../config/wikipedia-config";
import { EntityResearchState, EntityTypeDetectionResult } from "../state";

// Dynamic tool imports to reduce initial memory usage
async function getToolForEntityType(_entityType: EntityType) {
  // NOTE: Entity-specific research tools have been deprecated
  // Use deep agent entity researcher for all entity types
  const { getDeepAgentGraph } = await import("@proto/deepagent/graph");
  return getDeepAgentGraph();
}

// Initialize Wikipedia tool for auto-fetching
// Configuration centralized in wikipediaConfig
const wikipediaTool = new WikipediaQueryRun({
  topKResults: wikipediaConfig.defaults.topKResults,
  maxDocContentLength: wikipediaConfig.defaults.maxContentLength,
});

/**
 * Wikipedia Data Fetching Node
 *
 * Automatically fetches Wikipedia data if no rawData is provided
 */
export async function wikipediaFetchingNode(
  state: EntityResearchState,
  config: RunnableConfig
): Promise<Partial<EntityResearchState>> {
  const targetEntityName = state.input?.targetEntityName;
  const inputData = state.input?.inputData;

  // If we already have input data, skip Wikipedia fetching
  if (inputData && inputData.length > 0) {
    console.log(
      `📊 Using provided raw data (${inputData.length} sources), skipping Wikipedia fetch`
    );
    return {};
  }

  console.log(`📚 Fetching Wikipedia data for: ${targetEntityName}`);

  try {
    // Fetch Wikipedia data
    const wikipediaData = await wikipediaTool.invoke(targetEntityName);
    console.log(`✅ Wikipedia data retrieved (${wikipediaData.length} chars)`);

    // Create raw data source from Wikipedia
    const wikipediaSource = {
      content: wikipediaData,
      source: "Wikipedia",
      sourceType: "wikipedia" as const,
      sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(
        targetEntityName.replace(/\s+/g, "_")
      )}`,
      retrievedAt: new Date().toISOString(),
      reliability: wikipediaConfig.defaults.reliability,
      metadata: {
        fetchedAutomatically: true,
        maxContentLength: wikipediaConfig.defaults.maxContentLength,
        topKResults: wikipediaConfig.defaults.topKResults,
      },
    };

    console.log(`📄 Created Wikipedia source entry for: ${targetEntityName}`);

    return {
      input: {
        ...state.input,
        inputData: [wikipediaSource],
      },
    };
  } catch (error) {
    console.warn(`⚠️ Wikipedia fetch failed for ${targetEntityName}:`, error);

    // Continue without Wikipedia data - the API will handle the empty data case
    return {
      input: {
        ...state.input,
        inputData: [],
      },
      output: {
        ...state.output,
        warnings: [
          ...(state.output?.warnings || []),
          `Wikipedia fetch failed: ${error}`,
        ],
      },
    };
  }
}

/**
 * Entity Type Detection Node
 *
 * Analyzes input data to determine the most likely entity type
 */
export async function entityTypeDetectionNode(
  state: EntityResearchState,
  config: RunnableConfig
): Promise<Partial<EntityResearchState>> {
  const targetEntityName = state.input?.targetEntityName;
  const inputData = state.input?.inputData;
  const entityType = state.input?.entityType;

  console.log(`🔍 Detecting entity type for: ${targetEntityName}`);

  // If entity type is already provided, use it
  if (entityType) {
    console.log(`📋 Using provided entity type: ${entityType}`);
    return {
      processing: {
        ...state.processing,
        detectedEntityType: entityType,
        entityTypeConfidence: 1.0,
      },
    };
  }

  // Simple heuristic-based detection (can be enhanced with LLM later)
  const detectionResult = detectEntityTypeFromContext(
    targetEntityName,
    inputData
  );

  console.log(
    `🎯 Detected entity type: ${detectionResult.detectedType} (confidence: ${detectionResult.confidence})`
  );

  return {
    processing: {
      ...state.processing,
      detectedEntityType: detectionResult.detectedType,
      entityTypeConfidence: detectionResult.confidence,
    },
  };
}

/**
 * Tool Selection and Execution Node
 *
 * Selects and executes the appropriate research tool based on entity type
 */
export async function toolExecutionNode(
  state: EntityResearchState,
  config: RunnableConfig
): Promise<Partial<EntityResearchState>> {
  const targetEntityName = state.input?.targetEntityName;
  const detectedEntityType = state.processing?.detectedEntityType;
  const researchDepth = state.input?.researchDepth;
  const focusAreas = state.input?.focusAreas;
  const inputData = state.input?.inputData;
  const dataSourceConfig = state.input?.dataSourceConfig;

  if (!detectedEntityType) {
    return {
      output: {
        ...state.output,
        errors: [
          ...(state.output?.errors || []),
          "Tool execution failed: no detected entity type",
        ],
      },
    };
  }

  console.log(
    `🔧 Executing research tool for ${detectedEntityType}: ${targetEntityName}`
  );

  try {
    let toolResult;

    // Execute the appropriate research tool with dynamic loading and correct parameter names
    switch (detectedEntityType) {
      case "Organization": {
        const tool = await getToolForEntityType("Organization");
        toolResult = await (tool.invoke as any)({
          targetOrganizationName: targetEntityName,
          researchDepth,
          focusAreas: mapFocusAreasForEntity(focusAreas, "Organization"),
          rawData: inputData,
          dataSourceConfig,
        });
        break;
      }

      case "Platform": {
        const tool = await getToolForEntityType("Platform");
        toolResult = await (tool.invoke as any)({
          targetPlatformName: targetEntityName,
          researchDepth,
          focusAreas: mapFocusAreasForEntity(focusAreas, "Platform"),
          rawData: inputData,
          dataSourceConfig,
        });
        break;
      }

      case "Movement": {
        const tool = await getToolForEntityType("Movement");
        toolResult = await (tool.invoke as any)({
          targetMovementName: targetEntityName,
          researchDepth,
          focusAreas: mapFocusAreasForEntity(focusAreas, "Movement"),
          rawData: inputData,
          dataSourceConfig,
        });
        break;
      }

      case "Event": {
        const tool = await getToolForEntityType("Event");
        toolResult = await (tool.invoke as any)({
          targetEventName: targetEntityName,
          researchDepth,
          focusAreas: mapFocusAreasForEntity(focusAreas, "Event"),
          rawData: inputData,
          dataSourceConfig,
        });
        break;
      }

      case "Person":
        // TODO: Replace with generic config-driven enrichment
        // See handoff: 2025-10-28_CONFIG_DRIVEN_ENTITY_ENRICHMENT.md
        // Stub returns basic entity - enrichment phase currently disabled
        toolResult = {
          success: true,
          extractedData: { name: targetEntityName, type: "Person" },
          metadata: {
            researchMethod: "stub_pending_refactor",
            confidence: 0.6,
            modelUsed: "none",
          },
        };
        break;

      default: {
        // For entity types not yet implemented, use generic research
        console.warn(
          `⚠️ Entity type ${detectedEntityType} not yet implemented, using basic research`
        );
        toolResult = {
          success: true,
          data: {
            name: state.input.targetEntityName,
            type: detectedEntityType,
            description: `Research needed for ${detectedEntityType}: ${state.input.targetEntityName}`,
            sources: [],
          },
        };
      }
    }

    if (!toolResult.success) {
      throw new Error(toolResult.error || "Tool execution failed");
    }

    console.log(`✅ Tool execution completed successfully`);

    return {
      processing: {
        ...state.processing,
        toolExecutionResult: toolResult,
        extractedData: toolResult.extractedData,
        researchMethod: "ai_extraction",
      },
      metadata: {
        ...state.metadata,
        modelUsed: toolResult.metadata?.modelUsed || "gemini-2.5-flash",
      },
    };
  } catch (error) {
    console.error(`❌ Tool execution failed:`, error);

    return {
      output: {
        ...state.output,
        errors: [
          ...(state.output?.errors || []),
          `Tool execution failed: ${error}`,
        ],
      },
      processing: {
        ...state.processing,
        toolExecutionResult: null,
        researchMethod: "fallback_parsing",
      },
    };
  }
}

/**
 * Data Processing and Validation Node
 *
 * Processes extracted data and validates it against schemas
 */
export async function dataProcessingNode(
  state: EntityResearchState,
  config: RunnableConfig
): Promise<Partial<EntityResearchState>> {
  const targetEntityName = state.input?.targetEntityName;
  const detectedEntityType = state.processing?.detectedEntityType;
  const extractedData = state.processing?.extractedData;
  const toolExecutionResult = state.processing?.toolExecutionResult;

  console.log(`📊 Processing and validating data for: ${targetEntityName}`);

  if (!extractedData || !detectedEntityType) {
    return {
      output: {
        ...state.output,
        errors: [
          ...(state.output?.errors || []),
          "No extracted data to process",
        ],
      },
      processing: {
        ...state.processing,
        processedData: null,
      },
    };
  }

  try {
    // Generate entity with proper UID
    const entityUID = generateEntityUID(detectedEntityType, targetEntityName);

    // Create base entity structure
    const entity: Entity = {
      uid: entityUID,
      type: detectedEntityType,
      name: targetEntityName,
      aliases: extractedData.aliases || [],
      tags: extractedData.tags || [],
      properties: extractEntityProperties(extractedData, detectedEntityType),
    };

    // Generate evidence entries
    const evidence: Evidence[] = generateEvidenceEntries(
      state.input?.inputData,
      targetEntityName
    );

    // Generate relationships if relationship data is present
    const relationships: Relationship[] = generateRelationships(
      extractedData,
      entityUID,
      detectedEntityType,
      evidence
    );

    // Calculate quality metrics
    const confidenceScore = toolExecutionResult?.metadata?.confidence || 0.5;
    const completenessScore = calculateCompletenessScore(
      extractedData,
      detectedEntityType
    );
    const dataGaps = identifyDataGaps(extractedData, detectedEntityType);

    console.log(
      `✅ Data processing completed - Confidence: ${confidenceScore}, Completeness: ${completenessScore}`
    );

    return {
      processing: {
        ...state.processing,
        processedData: extractedData,
      },
      output: {
        ...state.output,
        generatedEntities: [entity],
        generatedRelationships: relationships,
        generatedEvidence: evidence,
        confidenceScore,
        completenessScore,
        dataGaps,
        warnings: [],
      },
    };
  } catch (error) {
    console.error(`❌ Data processing failed:`, error);

    return {
      output: {
        ...state.output,
        errors: [
          ...(state.output?.errors || []),
          `Data processing failed: ${error}`,
        ],
      },
      processing: {
        ...state.processing,
        processedData: null,
      },
    };
  }
}

/**
 * Bundle Generation Node
 *
 * Creates final Rabbit Hole bundle output
 */
export async function bundleGenerationNode(
  state: EntityResearchState,
  config: RunnableConfig
): Promise<Partial<EntityResearchState>> {
  const targetEntityName = state.input?.targetEntityName;
  const detectedEntityType = state.processing?.detectedEntityType;
  const generatedEntities = state.output?.generatedEntities;
  const generatedRelationships = state.output?.generatedRelationships;
  const generatedEvidence = state.output?.generatedEvidence;
  const confidenceScore = state.output?.confidenceScore;
  const dataGaps = state.output?.dataGaps;
  const warnings = state.output?.warnings;
  const processingStartTime = state.metadata?.processingStartTime;
  const sourcesProcessed = state.metadata?.sourcesProcessed;
  const modelUsed = state.metadata?.modelUsed;
  const researchMethod = state.processing?.researchMethod;

  console.log(`📦 Generating final research bundle for: ${targetEntityName}`);

  if (!detectedEntityType || !generatedEntities?.length) {
    return {
      output: {
        ...state.output,
        errors: [
          ...(state.output?.errors || []),
          "Insufficient data to generate bundle",
        ],
        researchOutput: undefined,
      },
    };
  }

  const processingEndTime = Date.now();
  const processingTime =
    processingEndTime - (processingStartTime || processingEndTime);

  const researchOutput: EntityResearchOutput = {
    success: true,
    targetEntityName,
    detectedEntityType: detectedEntityType as ResearchableEntityType,
    entities: generatedEntities || [],
    relationships: generatedRelationships || [],
    evidence: generatedEvidence || [],
    content: [], // No content items for now
    metadata: {
      researchMethod: researchMethod || "ai_extraction",
      confidenceScore: confidenceScore || 0,
      sourcesConsulted: state.input?.inputData?.map((d) => d.source) || [],
      processingTime,
      entityTypeDetectionConfidence:
        state.processing?.entityTypeConfidence || 0,
      propertiesExtracted: Object.keys(state.processing?.processedData || {}),
      relationshipsDiscovered: generatedRelationships?.length || 0,
      dataGaps: dataGaps || [],
      warnings: warnings || [],
    },
  };

  console.log(`✅ Research bundle generated successfully`);

  return {
    output: {
      ...state.output,
      researchOutput,
    },
    metadata: {
      ...state.metadata,
      processingEndTime,
    },
  };
}

// ==================== Helper Functions ====================

/**
 * Simple entity type detection based on name and content analysis
 */
function detectEntityTypeFromContext(
  entityName: string,
  inputData: any[]
): EntityTypeDetectionResult {
  const name = entityName.toLowerCase();
  const content = inputData
    .map((d) => d.content?.toLowerCase() || "")
    .join(" ");

  // Enhanced keyword-based detection with stronger indicators for each type
  const indicators = {
    Movement: [
      "movement",
      "conspiracy theory",
      "political movement",
      "far-right",
      "far-left",
      "campaign",
      "activists",
      "ideology",
      "maga",
      "blm",
      "qanon",
      "supporters",
      "followers",
      "belief",
      "cult",
      "theory",
      "adherents",
    ],
    Event: [
      "attack",
      "riot",
      "incident",
      "rally",
      "conference",
      "meeting",
      "happened",
      "occurred",
      "january 6",
      "capitol",
      "2021",
      "2024",
      "election",
      "protest",
      "march",
    ],
    Platform: [
      "platform",
      "social media",
      "twitter",
      "facebook",
      "website",
      "app",
      "users",
      "launched",
      "streaming",
      "rebranded",
      "social networking",
    ],
    Organization: [
      "company",
      "corporation",
      "inc",
      "llc",
      "ltd",
      "founded",
      "ceo",
      "revenue",
      "tesla",
      "business",
      "headquarters",
      "employees",
    ],
    Person: [
      "born",
      "age",
      "married",
      "education",
      "graduated",
      "children",
      "spouse",
      "politician",
      "president",
      "biography",
    ],
  };

  let maxScore = 0;
  let detectedType: EntityType = "Organization"; // default

  for (const [type, keywords] of Object.entries(indicators)) {
    const score = keywords.reduce(
      (count, keyword) => count + (content.includes(keyword) ? 1 : 0),
      0
    );

    if (score > maxScore) {
      maxScore = score;
      detectedType = type as EntityType;
    }
  }

  // Calculate confidence based on keyword matches
  const confidence = Math.min(maxScore / 3, 0.9); // Max 90% confidence from heuristics

  return {
    detectedType,
    confidence: Math.max(confidence, 0.3), // Minimum 30% confidence
    reasoning: `Detected based on keyword analysis: ${maxScore} relevant keywords found`,
  };
}

// Removed duplicate getToolForEntityType function - using the async version above

/**
 * Extract entity-specific properties from raw data
 */
function extractEntityProperties(
  extractedData: any,
  entityType: EntityType
): Record<string, any> {
  // Map extracted data to entity-specific properties
  const properties: Record<string, any> = {};

  // Common property mappings
  const commonMappings = {
    founded: ["founded", "established", "started", "created"],
    headquarters: ["headquarters", "location", "based"],
    website: ["website", "url", "site"],
  };

  // Apply common mappings
  for (const [propName, aliases] of Object.entries(commonMappings)) {
    for (const alias of aliases) {
      if (extractedData[alias]) {
        properties[propName] = extractedData[alias];
        break;
      }
    }
  }

  // Entity-specific property extraction
  switch (entityType) {
    case "Organization":
      Object.assign(properties, {
        orgType: extractedData.orgType || extractedData.type,
        industry: extractedData.industry || extractedData.sector,
        revenue: extractedData.revenue,
        employees: extractedData.employees || extractedData.workforce,
        ceo: extractedData.ceo || extractedData.leader,
      });
      break;

    case "Platform":
      Object.assign(properties, {
        platformType: extractedData.platformType || extractedData.type,
        launched: extractedData.launched || extractedData.founded,
        userBase: extractedData.userBase || extractedData.users,
        businessModel: extractedData.businessModel,
      });
      break;

    case "Movement":
      Object.assign(properties, {
        ideology: extractedData.ideology,
        keyFigures: extractedData.keyFigures || extractedData.leaders,
        geography: extractedData.geography || extractedData.region,
        status: extractedData.status,
      });
      break;

    case "Event":
      Object.assign(properties, {
        date: extractedData.date,
        endDate: extractedData.endDate,
        location: extractedData.location,
        eventType: extractedData.eventType || extractedData.type,
        participants: extractedData.participants,
        impact: extractedData.impact,
      });
      break;

    case "Person":
      // Person properties are handled by PersonEntitySchema directly
      break;

    case "Media":
      // Basic media properties
      break;

    // Biological entities
    case "Animal":
      Object.assign(properties, {
        scientificName: extractedData.scientificName,
        conservationStatus: extractedData.conservationStatus,
        habitat: extractedData.habitat,
        diet: extractedData.diet,
        class: extractedData.class || extractedData.taxonomicClass,
      });
      break;

    case "Species":
      Object.assign(properties, {
        scientificName: extractedData.scientificName,
        authority: extractedData.authority,
        conservationStatus: extractedData.conservationStatus,
        nativeRange: extractedData.nativeRange || extractedData.range,
      });
      break;

    case "Insect":
    case "Ecosystem":
      // Use generic biological properties
      Object.assign(properties, {
        conservationStatus: extractedData.conservationStatus,
        threats: extractedData.threats,
      });
      break;

    // Astronomical entities
    case "Planet":
      Object.assign(properties, {
        planetType: extractedData.planetType || extractedData.type,
        discovered: extractedData.discovered,
        discoverer: extractedData.discoverer,
        mass: extractedData.mass,
        radius: extractedData.radius,
      });
      break;

    case "Star":
      Object.assign(properties, {
        starType: extractedData.starType || extractedData.type,
        spectralClass: extractedData.spectralClass,
        discovered: extractedData.discovered,
        discoverer: extractedData.discoverer,
      });
      break;

    case "Galaxy":
    case "Solar_System":
      // Use generic astronomical properties
      Object.assign(properties, {
        discovered: extractedData.discovered,
        discoverer: extractedData.discoverer,
      });
      break;

    // Geographic entities
    case "Country":
      Object.assign(properties, {
        independence: extractedData.independence,
        founded: extractedData.founded,
        capital: extractedData.capital,
        population: extractedData.population,
        government: extractedData.government,
      });
      break;

    case "City":
      Object.assign(properties, {
        founded: extractedData.founded,
        country: extractedData.country,
        population: extractedData.population,
        mayor: extractedData.mayor,
      });
      break;

    case "Region":
    case "Continent":
      // Use generic geographic properties
      Object.assign(properties, {
        area: extractedData.area,
        population: extractedData.population,
      });
      break;

    // Technology entities
    case "Software":
      Object.assign(properties, {
        version: extractedData.version,
        language: extractedData.language,
        license: extractedData.license,
        openSource: extractedData.openSource,
        category: extractedData.category,
      });
      break;

    case "Hardware":
      Object.assign(properties, {
        manufacturer: extractedData.manufacturer,
        model: extractedData.model,
        category: extractedData.category,
        architecture: extractedData.architecture,
      });
      break;

    case "Database":
      Object.assign(properties, {
        database_type: extractedData.database_type,
        vendor: extractedData.vendor,
        license: extractedData.license,
        cloud_native: extractedData.cloud_native,
      });
      break;

    case "API":
      Object.assign(properties, {
        api_type: extractedData.api_type,
        version: extractedData.version,
        provider: extractedData.provider,
        status: extractedData.status,
      });
      break;

    case "Protocol":
      Object.assign(properties, {
        protocol_type: extractedData.protocol_type,
        layer: extractedData.layer,
        standard_body: extractedData.standard_body,
      });
      break;

    case "Framework":
    case "Library":
      Object.assign(properties, {
        language: extractedData.language,
        license: extractedData.license,
        category: extractedData.category,
        maturity: extractedData.maturity,
      });
      break;

    // Economic entities
    case "Currency":
      Object.assign(properties, {
        currency_code: extractedData.currency_code,
        currency_type: extractedData.currency_type,
        country_of_origin: extractedData.country_of_origin,
      });
      break;

    case "Market":
      Object.assign(properties, {
        market_type: extractedData.market_type,
        exchange_name: extractedData.exchange_name,
        location: extractedData.location,
      });
      break;

    case "Company":
      Object.assign(properties, {
        ticker_symbol: extractedData.ticker_symbol,
        industry: extractedData.industry,
        headquarters: extractedData.headquarters,
        employees: extractedData.employees,
      });
      break;

    case "Industry":
    case "Commodity":
    case "Investment":
      Object.assign(properties, {
        category: extractedData.category,
        market_size: extractedData.market_size,
      });
      break;

    // Legal entities
    case "Law":
      Object.assign(properties, {
        law_type: extractedData.law_type,
        jurisdiction: extractedData.jurisdiction,
        status: extractedData.status,
      });
      break;

    case "Court":
      Object.assign(properties, {
        court_type: extractedData.court_type,
        jurisdiction: extractedData.jurisdiction,
        location: extractedData.location,
      });
      break;

    case "Case":
      Object.assign(properties, {
        case_number: extractedData.case_number,
        case_type: extractedData.case_type,
        status: extractedData.status,
      });
      break;

    case "Patent":
      Object.assign(properties, {
        patent_number: extractedData.patent_number,
        patent_type: extractedData.patent_type,
        status: extractedData.status,
      });
      break;

    case "Regulation":
    case "License":
    case "Contract":
      Object.assign(properties, {
        status: extractedData.status,
        jurisdiction: extractedData.jurisdiction,
      });
      break;

    default:
      // For entity types not yet implemented, return empty properties
      console.warn(
        `⚠️ Property extraction for ${entityType} not yet implemented`
      );
      break;
  }

  // Remove undefined values
  return Object.fromEntries(
    Object.entries(properties).filter(([_, value]) => value !== undefined)
  );
}

/**
 * Generate evidence entries from input data sources
 */
function generateEvidenceEntries(
  inputData: any[],
  entityName: string
): Evidence[] {
  return inputData.map(
    (source, index) =>
      ({
        uid: `evidence:${entityName
          .toLowerCase()
          .replace(/\s+/g, "_")}_source_${index + 1}`,
        kind: mapSourceTypeToEvidenceKind(source.sourceType),
        title: `Research source for ${entityName}`,
        publisher: source.source || "User provided",
        date: new Date().toISOString().split("T")[0], // Today's date
        url: source.sourceUrl || "https://example.com/user-provided",
        reliability: source.reliability || 0.7,
      }) as Evidence
  );
}

/**
 * Map source types to evidence kinds
 */
function mapSourceTypeToEvidenceKind(sourceType: string): any {
  const mapping: Record<string, any> = {
    user_provided: "research",
    wikipedia: "research",
    sec_filing: "government",
    corporate_website: "research",
    news_archive: "major_media",
    academic: "research",
    government: "government",
  };

  return mapping[sourceType] || "research";
}

/**
 * Generate relationships from extracted data
 */
function generateRelationships(
  extractedData: any,
  entityUID: string,
  entityType: EntityType,
  evidence: Evidence[]
): Relationship[] {
  const relationships: Relationship[] = [];

  // Generate relationships based on extracted data
  // This is a simplified implementation - can be enhanced

  if (extractedData.parentCompany) {
    relationships.push({
      uid: generateRelationshipUID(
        entityUID,
        `org:${extractedData.parentCompany.toLowerCase().replace(/\s+/g, "_")}`,
        "BELONGS_TO"
      ),
      type: "BELONGS_TO",
      source: entityUID,
      target: `org:${extractedData.parentCompany
        .toLowerCase()
        .replace(/\s+/g, "_")}`,
      confidence: 0.8,
      properties: {
        evidence_uids: evidence.map((e) => e.uid),
      },
    } as Relationship);
  }

  return relationships;
}

/**
 * Calculate completeness score based on extracted data
 */
function calculateCompletenessScore(
  extractedData: any,
  entityType: EntityType
): number {
  if (!extractedData) return 0;

  const requiredFields: Partial<Record<EntityType, string[]>> = {
    Person: ["name", "bio", "occupation"],
    Organization: ["name", "orgType", "founded"],
    Platform: ["name", "platformType", "launched"],
    Movement: ["name", "ideology", "founded"],
    Event: ["name", "date", "location"],
    Media: ["name", "type", "publisher"],
  };

  const required = requiredFields[entityType] || [];
  const present = required.filter((field) => extractedData[field]).length;

  return required.length > 0 ? present / required.length : 0;
}

/**
 * Identify missing data gaps
 */
function identifyDataGaps(
  extractedData: any,
  entityType: EntityType
): string[] {
  const importantFields: Partial<Record<EntityType, string[]>> = {
    Person: ["bio", "birthDate", "occupation", "education"],
    Organization: ["orgType", "founded", "headquarters", "industry", "ceo"],
    Platform: ["platformType", "launched", "userBase", "businessModel"],
    Movement: ["ideology", "founded", "keyFigures", "geography"],
    Event: ["date", "location", "eventType", "participants"],
    Media: ["type", "publisher", "founded", "headquarters"],
  };

  const important = importantFields[entityType] || [];
  return important.filter((field) => !extractedData[field]);
}

/**
 * Map universal focus areas to entity-specific focus areas
 */
function mapFocusAreasForEntity(
  universalFocusAreas: string[],
  entityType: EntityType
): string[] {
  const focusAreaMappings: Partial<
    Record<EntityType, Record<string, string[]>>
  > = {
    Organization: {
      biographical: ["business", "history"],
      business: ["business", "financial"],
      financial: ["financial", "business"],
      political: ["legal", "business"],
      relationships: ["business", "leadership"],
      legal: ["legal", "business"],
      social: ["business"],
    },
    Platform: {
      biographical: ["technological", "business"],
      business: ["business", "technological"],
      financial: ["business"],
      technological: ["technological", "business"],
      relationships: ["business"],
      social: ["social", "content"],
      content: ["content", "social"],
    },
    Movement: {
      biographical: ["political", "history"],
      business: ["political", "relationships"],
      financial: ["political"],
      political: ["political", "ideology"],
      relationships: ["relationships", "political"],
      social: ["social", "political"],
      events: ["events", "history"],
      ideology: ["ideology", "political"],
    },
    Event: {
      biographical: ["events", "relationships"],
      business: ["events"],
      political: ["political", "events"],
      relationships: ["relationships", "events"],
      legal: ["legal", "events"],
      social: ["social", "events"],
      events: ["events"],
      content: ["content", "events"],
    },
    Person: {
      biographical: ["biographical"],
      business: ["business"],
      political: ["political"],
      relationships: ["relationships"],
      social: ["social"],
      legal: ["legal"],
    },
    Media: {
      biographical: ["business", "content"],
      business: ["business", "content"],
      financial: ["business"],
      technological: ["content"],
      relationships: ["business"],
      social: ["content", "social"],
      content: ["content", "business"],
    },
  };

  const mappings = focusAreaMappings[entityType] || {};
  const entitySpecificAreas = new Set<string>();

  // Map each universal focus area to entity-specific ones
  universalFocusAreas.forEach((area) => {
    const mapped = mappings[area];
    if (mapped) {
      mapped.forEach((mappedArea) => entitySpecificAreas.add(mappedArea));
    } else {
      // If no mapping exists, try to use the area directly if it's valid for this entity type
      entitySpecificAreas.add(area);
    }
  });

  // Convert set back to array and ensure we have at least one focus area
  const result = Array.from(entitySpecificAreas);
  return result.length > 0 ? result : getDefaultFocusAreas(entityType);
}

/**
 * Get default focus areas for each entity type
 */
function getDefaultFocusAreas(entityType: EntityType): string[] {
  const defaults: Partial<Record<EntityType, string[]>> = {
    Organization: ["business", "financial"],
    Platform: ["technological", "business"],
    Movement: ["political", "relationships"],
    Event: ["events", "relationships"],
    Person: ["biographical", "relationships"],
    Media: ["business", "content"],
  };

  return defaults[entityType] || ["relationships"];
}
