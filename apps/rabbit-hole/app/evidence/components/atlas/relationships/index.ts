/**
 * Relationship Components Exports - Rabbit Hole Schema
 *
 * Centralized exports for all relationship display components.
 */

export { FamilyRelationshipCard } from "./FamilyRelationshipCard";
export {
  SpouseRelationshipCard,
  ChildRelationshipCard,
  ParentRelationshipCard,
  SiblingRelationshipCard,
} from "./FamilyRelationshipCard";

export { FamilyRelationshipsSection } from "./FamilyRelationshipsSection";
export { FamilyAnalysisDialog } from "./FamilyAnalysisDialog";

// Re-export relationship types for convenience
export type {
  FamilyMember,
  FamilyRelationshipCardProps,
} from "./FamilyRelationshipCard";
export type { FamilyRelationshipsSectionProps } from "./FamilyRelationshipsSection";

// TODO: Add business, political, and platform relationship components
// export { BusinessRelationshipsSection } from "./BusinessRelationshipsSection";
// export { PoliticalRelationshipsSection } from "./PoliticalRelationshipsSection";
// export { PlatformRelationshipsSection } from "./PlatformRelationshipsSection";
