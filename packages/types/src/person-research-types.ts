/**
 * Person Research Agent Types
 *
 * Specialized types for the person research agent, including input/output
 * interfaces and agent-specific data structures.
 */

import { z } from "zod";

import {
  PersonEntity,
  Relationship,
  PersonEntitySchema,
  RelationshipSchema,
} from "./validation-schemas-modular";

// ==================== Agent Input/Output Types ====================

export interface PersonResearchInput {
  targetPersonName: string;
  existingPersonEntities: PersonEntity[];
  existingRelationships: Relationship[];
  // Optional parameters
  researchDepth?: PersonResearchDepth;
  focusAreas?: PersonResearchFocus[];
  prioritizeAccuracy?: boolean;
  includeControversial?: boolean;
  timeframe?: {
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
  };
}

export interface PersonResearchOutput {
  personEntity: PersonEntity;
  suggestedRelationships: Relationship[];
  researchSummary: string;
  sources: ResearchSource[];
  confidenceLevel: number; // 0-1 overall confidence
  dataGaps: DataGap[];
  metadata: PersonResearchMetadata;
}

export type PersonResearchDepth = "basic" | "detailed" | "comprehensive";

export type PersonResearchFocus =
  | "biographical" // Basic bio info (birth, education, career)
  | "political" // Political affiliations, positions, voting record
  | "business" // Business ventures, financial information
  | "family" // Family relationships, personal connections
  | "social_media" // Online presence, social media accounts
  | "legal" // Legal issues, court cases, investigations
  | "controversy" // Controversies, scandals, public disputes
  | "achievements" // Awards, accomplishments, recognition
  | "relationships"; // Professional and personal connections

// ==================== Research Quality Types ====================

export interface ResearchSource {
  url: string;
  title: string;
  publisher: string;
  publishDate?: string;
  reliability: SourceReliability;
  relevantFields: string[]; // Which entity fields this source supports
  notes?: string;
}

export type SourceReliability =
  | "primary" // Government records, official documents
  | "secondary" // Major news outlets, established media
  | "tertiary" // Academic papers, analysis pieces
  | "social" // Social media posts, personal accounts
  | "unverified"; // Unconfirmed claims, rumors

export interface DataGap {
  field: string;
  reason: DataGapReason;
  severity: "low" | "medium" | "high";
  suggestions?: string[];
}

export type DataGapReason =
  | "not_found" // Information not available in sources
  | "conflicting" // Sources disagree on information
  | "outdated" // Only old information available
  | "private" // Information exists but is private/confidential
  | "unverified" // Information exists but can't be confirmed
  | "restricted"; // Information restricted by legal/ethical concerns

export interface PersonResearchMetadata {
  researchDuration: number; // ms
  sourcesConsulted: number;
  fieldsPopulated: number;
  fieldsTotal: number;
  completenessScore: number; // 0-1
  accuracyScore: number; // 0-1
  relationshipsFound: number;
  relationshipsValidated: number;
  lastResearched: string; // ISO timestamp
  researchVersion: string; // For tracking research iterations
}

// ==================== Relationship Discovery Types ====================

export interface RelationshipSuggestion {
  relationship: Relationship;
  discoveryMethod: RelationshipDiscoveryMethod;
  confidence: number;
  supportingSources: ResearchSource[];
  reasoning: string;
}

export type RelationshipDiscoveryMethod =
  | "direct_mention" // Person A mentioned in relation to Person B
  | "family_records" // Birth certificates, marriage licenses, etc.
  | "business_filing" // SEC filings, corporate documents
  | "court_documents" // Legal proceedings linking individuals
  | "news_coverage" // Media reports of interactions/relationships
  | "social_media" // Social media interactions/mentions
  | "biographical" // Autobiographies, interviews, profiles
  | "inference"; // Logical inference from multiple sources

// ==================== Validation & Quality Control ====================

export interface PersonEntityValidation {
  isValid: boolean;
  errors: PersonValidationError[];
  warnings: ValidationWarning[];
  qualityScore: number; // 0-1
  completenessScore: number; // 0-1
  suggestions: QualityImprovement[];
}

export interface PersonValidationError {
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
  suggestedFix?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  impact: "low" | "medium" | "high";
  recommendation?: string;
}

export interface QualityImprovement {
  category: "accuracy" | "completeness" | "relationships" | "sources";
  description: string;
  priority: "low" | "medium" | "high";
  actionable: boolean;
}

// ==================== Agent Configuration ====================

export interface PersonResearchConfig {
  // Research parameters
  defaultDepth: PersonResearchDepth;
  maxSources: number;
  timeoutMs: number;

  // Quality thresholds
  minConfidenceLevel: number;
  requiredSourceTypes: SourceReliability[];
  minSourcesPerClaim: number;

  // API integrations (for future use)
  enableWebScraping: boolean;
  enableGovernmentAPIs: boolean;
  enableSocialMediaAPIs: boolean;
  enableNewsAPIs: boolean;

  // Privacy & ethics
  respectPrivacy: boolean;
  avoidSensitiveInfo: boolean;
  requireConsent: boolean;
}

// ==================== Wikipedia Entity Extraction Schemas ====================
// Uses existing PersonEntitySchema and RelationshipSchema for consistency

export const WikipediaExtractionSchema = z.object({
  person: PersonEntitySchema,
  relationships: z
    .array(RelationshipSchema)
    .describe("Relationships to other people mentioned in Wikipedia"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Overall extraction confidence"),
  sources: z.array(z.string()).describe("Source citations"),
  dataGaps: z.array(z.string()).describe("Missing information fields"),
});

export type WikipediaExtraction = z.infer<typeof WikipediaExtractionSchema>;

// ==================== Mock Data Example ====================

export const EXAMPLE_DONALD_TRUMP_RESEARCH: PersonResearchOutput = {
  personEntity: {
    uid: "person:donald_trump",
    type: "Person",
    subtype: "Politician",
    name: "Donald John Trump",
    aliases: ["Donald Trump", "DJT", "President Trump", "Trump"],
    bio: "45th President of the United States (2017-2021), businessman, and political figure.",
    birthDate: "1946-06-14",
    birthPlace: "Queens, New York, United States",
    nationality: "US",
    occupation: "Politician, Businessman, Former President",
    politicalParty: "Republican",
    education: [
      "Fordham University",
      "Wharton School of the University of Pennsylvania",
    ],
    netWorth: 2500000000,
    residence: "Mar-a-Lago, Palm Beach, Florida",
    age: 78,
    gender: "male",
    spouse: ["per:melania_trump"],
    children: [
      "per:donald_trump_jr",
      "per:ivanka_trump",
      "per:eric_trump",
      "per:tiffany_trump",
      "per:barron_trump",
    ],
    socialMedia: {
      twitter: "@realDonaldTrump",
      truth_social: "@realDonaldTrump",
      facebook: "DonaldTrump",
    },
    contactInfo: {
      website: "https://www.donaldjtrump.com",
    },
    tags: [
      "politician",
      "businessman",
      "former_president",
      "controversial_figure",
    ],
  },
  suggestedRelationships: [
    {
      uid: "rel:trump_married_melania",
      source: "person:donald_trump",
      target: "person:melania_trump",
      type: "MARRIED_TO",
      confidence: 0.95,
      properties: {
        since: "2005-01-22",
      },
    },
    {
      uid: "rel:trump_owns_trump_org",
      source: "person:donald_trump",
      target: "org:trump_organization",
      type: "OWNS",
      confidence: 0.9,
      properties: {
        label: "owns and controls",
      },
    },
  ],
  researchSummary:
    "Comprehensive research completed for Donald John Trump. Found extensive biographical information from government records, major media sources, and business filings.",
  sources: [
    {
      url: "https://www.whitehouse.gov/about-the-white-house/presidents/donald-j-trump/",
      title: "Donald J. Trump - The White House",
      publisher: "The White House",
      reliability: "primary",
      relevantFields: ["name", "occupation", "politicalParty", "bio"],
    },
  ],
  confidenceLevel: 0.92,
  dataGaps: [
    {
      field: "currentNetWorth",
      reason: "conflicting",
      severity: "medium",
      suggestions: [
        "Check recent SEC filings",
        "Consult financial news sources",
      ],
    },
  ],
  metadata: {
    researchDuration: 45000,
    sourcesConsulted: 8,
    fieldsPopulated: 17,
    fieldsTotal: 20,
    completenessScore: 0.85,
    accuracyScore: 0.92,
    relationshipsFound: 15,
    relationshipsValidated: 12,
    lastResearched: "2025-09-14T06:00:00.000Z",
    researchVersion: "1.0.0",
  },
};
