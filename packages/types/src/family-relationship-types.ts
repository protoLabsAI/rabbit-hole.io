/**
 * Family Relationship Types - Rabbit Hole Schema
 *
 * Type definitions for family relationship analysis and display components.
 * Supports comprehensive family network analysis with age calculations.
 */

export interface PersonDetails {
  uid: string;
  name: string;
  birthDate?: string;
  deathDate?: string;
  age?: number;
  status: "living" | "deceased" | "unknown";
}

export interface EvidenceSource {
  uid: string;
  title: string;
  publisher: string;
  url: string;
  reliability: number;
}

export interface FamilyMarriage {
  relationshipId: string;
  relationshipType: "MARRIED_TO" | "DIVORCED_FROM";
  partner: PersonDetails;
  marriageDate?: string;
  divorceDate?: string;
  duration?: string;
  confidence: number;
  evidence: EvidenceSource[];
}

export interface FamilyChild {
  relationshipId: string;
  child: PersonDetails;
  birthDate?: string;
  age?: number;
  confidence: number;
  evidence: EvidenceSource[];
}

export interface FamilyParent {
  relationshipId: string;
  parent: PersonDetails;
  relationship: "father" | "mother" | "parent";
  confidence: number;
  evidence: EvidenceSource[];
}

export interface FamilySibling {
  relationshipId: string;
  sibling: PersonDetails;
  age?: number;
  relationship: "brother" | "sister" | "sibling";
  confidence: number;
  evidence: EvidenceSource[];
}

export interface FamilyRelationshipSummary {
  totalFamilyMembers: number;
  spouses: number;
  children: number;
  parents: number;
  siblings: number;
  averageAge?: number;
}

export interface FamilyRelationships {
  marriages: FamilyMarriage[];
  children: FamilyChild[];
  parents: FamilyParent[];
  siblings: FamilySibling[];
  summary: FamilyRelationshipSummary;
}

export interface RelationshipDetailsResponse {
  success: boolean;
  data?: {
    entity: {
      uid: string;
      name: string;
      type: string;
      birthDate?: string;
    };
    categories: {
      family?: FamilyRelationships;
      business?: any; // TODO: Define when implemented
      political?: any; // TODO: Define when implemented
      platform?: any; // TODO: Define when implemented
    };
    summary: {
      totalRelationships: number;
      categoryCounts: Record<string, number>;
      timeRange: { earliest: string; latest: string };
    };
  };
  error?: string;
}

// Family Analysis Types
export interface FamilyMemberAnalysis {
  uid: string;
  name: string;
  age?: number;
  status: "living" | "deceased" | "unknown";
  politicalRoles?: string[];
  missingData: string[];
}

export interface GenerationAnalysis {
  generation: number; // -1 = parents, 0 = person, +1 = children
  members: FamilyMemberAnalysis[];
  averageAge?: number;
  politicalInvolvement: number; // 0-1 score
}

export interface MarriageAnalysis {
  totalMarriages: number;
  currentMarriages: number;
  averageDuration?: number;
  longestMarriage?: {
    partner: string;
    duration: string;
    years: number;
  };
  marriageTimeline: Array<{
    year: number;
    event: "marriage" | "divorce";
    partner: string;
  }>;
}

export interface ResearchGap {
  category: "high" | "medium" | "low";
  description: string;
  impact: string;
}

export interface ResearchGaps {
  missingBirthDates: number;
  missingRelationships: string[];
  researchPriorities: ResearchGap[];
}

export interface PoliticalDynastyAnalysis {
  hasMultiGenerationalInvolvement: boolean;
  politicalSpan?: { earliest: number; latest: number };
  familyPoliticalScore: number; // 0-1 based on political involvement
  powerTransitions: Array<{
    from: string;
    to: string;
    positions: string[];
    timeframe: string;
  }>;
}

export interface FamilyAnalysisResponse {
  success: boolean;
  data?: {
    entity: {
      uid: string;
      name: string;
      type: string;
    };
    analysis: {
      familyOverview: {
        totalFamilyMembers: number;
        generationSpan: number;
        familyTreeDepth: number;
        completenessScore: number; // 0-1 based on missing data
      };
      generationAnalysis: GenerationAnalysis[];
      marriageAnalysis: MarriageAnalysis;
      researchGaps: ResearchGaps;
      politicalDynasty: PoliticalDynastyAnalysis;
    };
    reportGenerated: string;
  };
  error?: string;
}

// Relationship Category Types
export type RelationshipCategory =
  | "family"
  | "business"
  | "political"
  | "platform";

export interface RelationshipCategoryConfig {
  name: string;
  icon: string;
  relationshipTypes: string[];
  displayComponent: React.ComponentType<any>;
  analysisEndpoint: string;
  queryPattern: string;
}

// Family Relationship Card Props
export interface FamilyRelationshipCardProps {
  relationshipType: "spouse" | "child" | "parent" | "sibling";
  member: PersonDetails;
  relationshipDate?: string;
  duration?: string;
  confidence: number;
  isCurrentSpouse?: boolean;
  onAnalyzeRelationship?: (memberUid: string, relationshipType: string) => void;
}

// Family Relationships Section Props
export interface FamilyRelationshipsSectionProps {
  data?: FamilyRelationships;
  isLoading: boolean;
  onAnalyze?: () => void;
  onAnalyzeRelationship?: (memberUid: string, relationshipType: string) => void;
}

// Family Analysis Dialog Props
export interface FamilyAnalysisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityUid: string;
  entityName: string;
}
