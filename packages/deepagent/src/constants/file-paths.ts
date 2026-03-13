/**
 * Research File Path Constants
 */

export const RESEARCH_FILE_PATHS = {
  WIKIPEDIA_CONTENT: "/research/wikipedia.txt",
  EVIDENCE_OUTPUT: "/research/evidence.json",
  ENTITY_OUTPUT: "/research/entity.json",
  FIELD_ANALYSIS_OUTPUT: "/research/field-analysis.json",
  RELATED_ENTITIES_OUTPUT: "/research/related-entities.json",
  RELATIONSHIPS_OUTPUT: "/research/relationships.json",
  BUNDLE_OUTPUT: "/research/bundle.json",
} as const;

export type ResearchFilePath =
  (typeof RESEARCH_FILE_PATHS)[keyof typeof RESEARCH_FILE_PATHS];

export const SUBAGENT_OUTPUT_PATHS: Record<string, ResearchFilePath> = {
  "evidence-gatherer": RESEARCH_FILE_PATHS.EVIDENCE_OUTPUT,
  "entity-extractor": RESEARCH_FILE_PATHS.ENTITY_OUTPUT,
  "field-analyzer": RESEARCH_FILE_PATHS.FIELD_ANALYSIS_OUTPUT,
  "entity-creator": RESEARCH_FILE_PATHS.RELATED_ENTITIES_OUTPUT,
  "relationship-mapper": RESEARCH_FILE_PATHS.RELATIONSHIPS_OUTPUT,
  "bundle-assembler": RESEARCH_FILE_PATHS.BUNDLE_OUTPUT,
};
