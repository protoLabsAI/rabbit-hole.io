import { Annotation } from "@langchain/langgraph";

import type {
  EntityType,
  Entity,
  Evidence,
  Relationship,
} from "@protolabsai/types";

/**
 * Entity Research Playground Configuration State
 * Groups all configuration and input parameters
 */
export interface PlaygroundConfigState {
  entityName: string;
  entityType: EntityType;
  selectedFields: string[];
  researchDepth: "basic" | "detailed" | "comprehensive";
  skipReview: boolean;
}

/**
 * Wikipedia Data State
 * Groups Wikipedia fetching results
 */
export interface WikipediaDataState {
  content: string;
  sourceUrl: string;
  retrievedAt: string;
  contentLength: number;
  fetchSuccess: boolean;
  fetchError?: string;
}

/**
 * Entity Extraction State
 * Groups extraction results from LangExtract
 */
export interface EntityExtractionState {
  entity?: Entity;
  extractionMethod: "langextract" | "fallback" | "manual";
  rawExtractionData?: unknown;
  fieldsExtracted: string[];
  propertiesCount: number;
}

/**
 * Extraction Report State
 * Groups final report and quality metrics
 */
export interface ExtractionReportState {
  success: boolean;
  confidence: number;
  completeness: number;
  reliability: number;
  warnings: string[];
  errors: string[];
  dataGaps: string[];
  summary: string;
  graphUpdate?: {
    action: "ADD_NODE";
    node: {
      id: string;
      type: EntityType;
      data: unknown;
      position: { x: number; y: number };
    };
  };
}

/**
 * Evidence State (NEW)
 * Groups evidence nodes created from research sources
 */
export interface EvidenceState {
  primaryEvidence: Evidence | null;
  evidenceList: Evidence[];
}

/**
 * Field Analysis State (NEW)
 * Groups field analysis for entity auto-creation
 */
export interface FieldAnalysisState {
  analyses: FieldAnalysis[];
  totalFields: number;
  entityCreationCandidates: number;
}

/**
 * Related Entities State (NEW)
 * Groups auto-created entities from field values
 */
export interface RelatedEntitiesState {
  entities: Entity[];
  totalCreated: number;
}

/**
 * Relationships State (NEW)
 * Groups auto-created relationships with evidence backing
 */
export interface RelationshipsState {
  relationshipList: Relationship[];
  totalCreated: number;
}

/**
 * Processing Metadata State
 * Groups workflow execution metadata
 */
export interface ProcessingMetadataState {
  startTime: number;
  endTime: number;
  processingDuration: number;
  currentNode: string;
  nodesExecuted: string[];
  retryCount: number;
}

/**
 * Entity Research Playground Workflow State
 *
 * Optimized for interactive playground use with real-time graph updates.
 * Evidence-first design: creates Evidence nodes before entities, auto-creates
 * related entities from field values, and links all with evidence backing.
 */
export const EntityResearchPlaygroundStateAnnotation = Annotation.Root({
  // Configuration and input (6 fields grouped)
  config: Annotation<PlaygroundConfigState>({
    reducer: (state, update) => update ?? state,
    default: () => ({
      entityName: "",
      entityType: "Person" as EntityType,
      selectedFields: [],
      researchDepth: "basic" as const,
      skipReview: false,
    }),
  }),

  // Wikipedia data (7 fields grouped)
  wikipediaData: Annotation<WikipediaDataState>({
    reducer: (state, update) => update ?? state,
    default: () => ({
      content: "",
      sourceUrl: "",
      retrievedAt: "",
      contentLength: 0,
      fetchSuccess: false,
      fetchError: undefined,
    }),
  }),

  // Evidence nodes (NEW - 2 fields grouped)
  evidence: Annotation<EvidenceState>({
    reducer: (state, update) => update ?? state,
    default: () => ({ primaryEvidence: null, evidenceList: [] }),
  }),

  // Extraction results (5 fields grouped)
  extraction: Annotation<EntityExtractionState>({
    reducer: (state, update) => update ?? state,
    default: () => ({
      entity: undefined,
      extractionMethod: "langextract" as const,
      rawExtractionData: undefined,
      fieldsExtracted: [],
      propertiesCount: 0,
    }),
  }),

  // Field analysis (NEW - 3 fields grouped)
  fieldAnalysis: Annotation<FieldAnalysisState>({
    reducer: (state, update) => update ?? state,
    default: () => ({
      analyses: [],
      totalFields: 0,
      entityCreationCandidates: 0,
    }),
  }),

  // Related entities (NEW - 2 fields grouped)
  relatedEntities: Annotation<RelatedEntitiesState>({
    reducer: (state, update) => update ?? state,
    default: () => ({ entities: [], totalCreated: 0 }),
  }),

  // Relationships (NEW - 2 fields grouped)
  relationships: Annotation<RelationshipsState>({
    reducer: (state, update) => update ?? state,
    default: () => ({ relationshipList: [], totalCreated: 0 }),
  }),

  // Report and quality metrics (9 fields grouped)
  report: Annotation<ExtractionReportState>({
    reducer: (state, update) => update ?? state,
    default: () => ({
      success: false,
      confidence: 0,
      completeness: 0,
      reliability: 0,
      warnings: [],
      errors: [],
      dataGaps: [],
      summary: "",
      graphUpdate: undefined,
    }),
  }),

  // Processing metadata (6 fields grouped)
  metadata: Annotation<ProcessingMetadataState>({
    reducer: (state, update) => update ?? state,
    default: () => ({
      startTime: Date.now(),
      endTime: 0,
      processingDuration: 0,
      currentNode: "",
      nodesExecuted: [],
      retryCount: 0,
    }),
  }),
});

export type EntityResearchPlaygroundState =
  typeof EntityResearchPlaygroundStateAnnotation.State;

// ==================== Helper Types ====================

export interface FieldSelectionConfig {
  entityType: EntityType;
  selectedFields: string[];
  includeRequired: boolean;
  includeOptional: boolean;
}

export interface ExtractionQualityMetrics {
  confidence: number;
  completeness: number;
  reliability: number;
  fieldsFound: number;
  fieldsRequested: number;
}

export interface GraphUpdateEvent {
  action: "ADD_NODE" | "UPDATE_NODE" | "REMOVE_NODE";
  nodeId: string;
  nodeData: unknown;
}

/**
 * Graph Node Data
 * Type-safe structure for node data in graph updates
 */
export interface GraphNodeData {
  uid: string;
  name: string;
  type: EntityType;
  properties?: Record<string, unknown>;
  tags?: string[];
  aliases?: string[];
}

/**
 * Type guard to validate GraphNodeData structure
 */
export function isGraphNodeData(data: unknown): data is GraphNodeData {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.uid === "string" &&
    typeof obj.name === "string" &&
    typeof obj.type === "string"
  );
}

/**
 * Field Analysis Result (NEW)
 * Describes whether a field should become an entity and relationship
 */
export interface FieldAnalysis {
  fieldName: string;
  fieldValue: any;
  shouldCreateEntity: boolean;
  suggestedEntityType: EntityType | null;
  suggestedRelationType: string | null;
  confidence: number;
}
