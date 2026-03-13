/**
 * Speech Acts and Sentiment Tracking Types
 *
 * Extends the evidence graph to track inflammatory speech, praise,
 * and detailed speech act relationships between entities.
 */

import type { GraphEdge, EvidenceEntry } from "./evidence-graph.types";

// ==================== Speech Act Categories ====================

/**
 * Categories of speech acts for tracking inflammatory and supportive rhetoric
 */
export type SpeechActCategory =
  // Inflammatory/Hate Categories
  | "accusation_demonization"
  | "dehumanization_xenophobia"
  | "great_replacement_rhetoric"
  | "anti_muslim_bigotry"
  | "derogation_national_origin"
  | "xenophobic_trope"
  | "violent_repression_support"
  | "militia_signal"
  | "explicit_violence_incitement"
  | "depicted_violence_against_opponents"
  | "militarized_xenophobia"
  | "bothsidesing_extremism"
  | "delegitimizing_press"
  | "demonization_opponents"
  | "menacing_rhetoric"
  | "dehumanization_metaphor"
  | "apocalyptic_threat_frame"

  // Praise/Support Categories
  | "endorsement_signal"
  | "amplification_support"
  | "defense_justification"
  | "praise_admiration"
  | "alliance_building"
  | "loyalty_expression"
  | "movement_promotion"
  | "platform_provision"

  // Neutral/Informational
  | "factual_reporting"
  | "neutral_mention"
  | "procedural_statement";

/**
 * Sentiment classification for speech acts
 */
export type SentimentType = "hostile" | "supportive" | "neutral" | "ambiguous";

/**
 * Intensity scale for speech acts
 */
export type IntensityLevel = "low" | "medium" | "high" | "extreme";

// ==================== Speech Act Data Structures ====================

/**
 * Detailed speech act record
 */
export interface SpeechAct {
  /** Unique identifier for the speech act */
  id: string;

  /** ISO timestamp of when speech occurred */
  date_utc: string;

  /** ID of the entity who made the statement */
  speaker_id: string;

  /** Geographic location where speech occurred */
  location?: {
    city?: string;
    state?: string;
    country: string;
  };

  /** Platform where the speech was delivered */
  platform_id: string;

  /** Category classification of the speech */
  category: SpeechActCategory;

  /** Sentiment classification */
  sentiment: SentimentType;

  /** Intensity level */
  intensity: IntensityLevel;

  /** Target groups or individuals addressed */
  target_group: string[];

  /** Excerpt of the actual speech/text */
  text_excerpt: string;

  /** Supporting evidence sources */
  sources: EvidenceEntry[];

  /** Confidence in the classification (0-1) */
  confidence: number;

  /** Additional contextual notes */
  notes?: string;
}

/**
 * Enhanced edge that includes speech act information
 */
export interface SpeechActEdge extends GraphEdge {
  /** Speech act category if this relationship involves speech */
  speech_category?: SpeechActCategory;

  /** Sentiment of the relationship */
  sentiment?: SentimentType;

  /** Intensity of the relationship */
  intensity?: IntensityLevel;

  /** Reference to detailed speech act records */
  speech_acts?: string[]; // Array of SpeechAct IDs

  /** Target groups affected by this relationship */
  target_groups?: string[];
}

/**
 * Aggregated relationship metrics between entities
 */
export interface EntityRelationshipMetrics {
  /** Source entity ID */
  from_entity: string;

  /** Target entity ID */
  to_entity: string;

  /** Total number of interactions */
  total_interactions: number;

  /** Breakdown by sentiment */
  sentiment_breakdown: {
    hostile: number;
    supportive: number;
    neutral: number;
    ambiguous: number;
  };

  /** Breakdown by intensity */
  intensity_breakdown: {
    low: number;
    medium: number;
    high: number;
    extreme: number;
  };

  /** Most common categories */
  top_categories: Array<{
    category: SpeechActCategory;
    count: number;
    percentage: number;
  }>;

  /** Overall relationship sentiment score (-1 to 1) */
  overall_sentiment: number;

  /** Date range of interactions */
  date_range: {
    first_interaction: string;
    last_interaction: string;
  };
}

// ==================== Analysis Types ====================

/**
 * Results from hate speech analysis
 */
export interface HateSpeechAnalysis {
  /** Entity being analyzed */
  entity_id: string;

  /** Total hate speech incidents */
  total_hate_incidents: number;

  /** Breakdown by category */
  category_breakdown: Array<{
    category: SpeechActCategory;
    count: number;
    examples: string[]; // Speech act IDs
  }>;

  /** Most frequent targets */
  frequent_targets: Array<{
    target: string;
    count: number;
    sentiment_score: number;
  }>;

  /** Temporal pattern of hate speech */
  temporal_pattern: Array<{
    date: string;
    incident_count: number;
    avg_intensity: number;
  }>;

  /** Overall hate speech score (0-1) */
  hate_speech_score: number;
}

/**
 * Results from praise/support analysis
 */
export interface SupportAnalysis {
  /** Entity being analyzed */
  entity_id: string;

  /** Total supportive incidents */
  total_support_incidents: number;

  /** Entities most frequently supported */
  supported_entities: Array<{
    entity_id: string;
    support_count: number;
    avg_intensity: number;
  }>;

  /** Entities providing the most support */
  supporting_entities: Array<{
    entity_id: string;
    support_count: number;
    avg_intensity: number;
  }>;

  /** Overall support network strength */
  support_network_strength: number;
}

// ==================== Pipeline Types ====================

/**
 * Configuration for data ingestion pipeline
 */
export interface IngestionConfig {
  /** Source data format */
  source_format:
    | "hate_rhetoric_seed"
    | "evidence_graph"
    | "manual_entry"
    | "api_import";

  /** Validation settings */
  validation: {
    require_sources: boolean;
    min_confidence_threshold: number;
    require_manual_review: boolean;
  };

  /** Processing options */
  processing: {
    auto_categorize_speech: boolean;
    extract_sentiment: boolean;
    calculate_metrics: boolean;
    generate_embeddings: boolean;
  };

  /** Output settings */
  output: {
    update_existing_entities: boolean;
    create_new_relationships: boolean;
    preserve_original_data: boolean;
  };
}

/**
 * Result from data ingestion process
 */
export interface IngestionResult {
  /** Status of the ingestion */
  status: "success" | "partial" | "failed";

  /** Summary statistics */
  summary: {
    entities_created: number;
    entities_updated: number;
    relationships_created: number;
    speech_acts_processed: number;
    errors: number;
  };

  /** Detailed results */
  details: {
    new_entities: string[];
    updated_entities: string[];
    new_relationships: string[];
    failed_items: Array<{
      item_id: string;
      error_message: string;
    }>;
  };

  /** Processing time */
  processing_time_ms: number;

  /** Next steps for manual review */
  manual_review_required: string[];
}

// ==================== Type Guards ====================

export function isSpeechActCategory(value: string): value is SpeechActCategory {
  const categories: SpeechActCategory[] = [
    "accusation_demonization",
    "dehumanization_xenophobia",
    "great_replacement_rhetoric",
    "anti_muslim_bigotry",
    "derogation_national_origin",
    "xenophobic_trope",
    "violent_repression_support",
    "militia_signal",
    "explicit_violence_incitement",
    "depicted_violence_against_opponents",
    "militarized_xenophobia",
    "bothsidesing_extremism",
    "delegitimizing_press",
    "demonization_opponents",
    "menacing_rhetoric",
    "dehumanization_metaphor",
    "apocalyptic_threat_frame",
    "endorsement_signal",
    "amplification_support",
    "defense_justification",
    "praise_admiration",
    "alliance_building",
    "loyalty_expression",
    "movement_promotion",
    "platform_provision",
    "factual_reporting",
    "neutral_mention",
    "procedural_statement",
  ];
  return categories.includes(value as SpeechActCategory);
}

export function isHostileSpeech(category: SpeechActCategory): boolean {
  const hostileCategories: SpeechActCategory[] = [
    "accusation_demonization",
    "dehumanization_xenophobia",
    "great_replacement_rhetoric",
    "anti_muslim_bigotry",
    "derogation_national_origin",
    "xenophobic_trope",
    "violent_repression_support",
    "militia_signal",
    "explicit_violence_incitement",
    "depicted_violence_against_opponents",
    "militarized_xenophobia",
    "bothsidesing_extremism",
    "delegitimizing_press",
    "demonization_opponents",
    "menacing_rhetoric",
    "dehumanization_metaphor",
    "apocalyptic_threat_frame",
  ];
  return hostileCategories.includes(category);
}

export function isSupportiveSpeech(category: SpeechActCategory): boolean {
  const supportiveCategories: SpeechActCategory[] = [
    "endorsement_signal",
    "amplification_support",
    "defense_justification",
    "praise_admiration",
    "alliance_building",
    "loyalty_expression",
    "movement_promotion",
    "platform_provision",
  ];
  return supportiveCategories.includes(category);
}
