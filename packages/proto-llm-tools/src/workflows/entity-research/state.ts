import { Annotation } from "@langchain/langgraph";

import type {
  EntityType,
  Entity,
  Relationship,
  Evidence,
  EntityResearchOutput,
  EntityResearchMetadata,
  EntityResearchSource,
} from "@protolabsai/types";

/**
 * Entity Research Input State
 * Groups all input parameters into a single annotation
 */
export interface ResearchInputState {
  targetEntityName: string;
  entityType?: EntityType;
  researchDepth: "basic" | "detailed" | "comprehensive";
  focusAreas: string[];
  inputData: EntityResearchSource[];
  existingEntities: Entity[];
  existingRelationships: Relationship[];
  dataSourceConfig: Record<string, any>;
}

/**
 * Entity Research Processing State
 * Groups processing-related state into a single annotation
 */
export interface ResearchProcessingState {
  detectedEntityType?: EntityType;
  entityTypeConfidence: number;
  selectedTool?: string;
  toolExecutionResult?: any;
  extractedData?: any;
  processedData?: any;
  researchMethod: "ai_extraction" | "fallback_parsing" | "manual_input";
}

/**
 * Entity Research Output State
 * Groups all output results into a single annotation
 */
export interface ResearchOutputState {
  generatedEntities: Entity[];
  generatedRelationships: Relationship[];
  generatedEvidence: Evidence[];
  confidenceScore: number;
  completenessScore: number;
  reliabilityScore: number;
  dataGaps: string[];
  warnings: string[];
  errors: string[];
  researchOutput?: EntityResearchOutput;
}

/**
 * Entity Research Metadata State
 * Groups processing metadata into a single annotation
 */
export interface ResearchMetadataState {
  processingStartTime: number;
  processingEndTime: number;
  sourcesProcessed: number;
  modelUsed: string;
}

/**
 * Simplified Entity Research Workflow State
 *
 * Reduces memory usage by grouping 25+ individual annotations
 * into 4 logical state objects, reducing TypeScript compilation complexity.
 */
export const EntityResearchStateAnnotation = Annotation.Root({
  // Input parameters (8 fields grouped into 1 annotation)
  input: Annotation<ResearchInputState>,

  // Processing state (8 fields grouped into 1 annotation)
  processing: Annotation<ResearchProcessingState>,

  // Output results (10 fields grouped into 1 annotation)
  output: Annotation<ResearchOutputState>,

  // Metadata (4 fields grouped into 1 annotation)
  metadata: Annotation<ResearchMetadataState>,
});

export type EntityResearchState = typeof EntityResearchStateAnnotation.State;

// ==================== Helper Types ====================

export interface EntityTypeDetectionResult {
  detectedType: EntityType;
  confidence: number;
  reasoning: string;
  alternativeTypes?: Array<{
    type: EntityType;
    confidence: number;
  }>;
}

export interface ToolSelectionResult {
  selectedTool: string;
  reasoning: string;
  toolConfig: Record<string, any>;
}

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completenessScore: number;
}

export interface BundleGenerationResult {
  entities: Entity[];
  relationships: Relationship[];
  evidence: Evidence[];
  metadata: EntityResearchMetadata;
}
