/**
 * Academic Domain - Index
 *
 * Exports all academic entity schemas and provides domain-specific
 * UID validation and entity type mappings.
 */

// ==================== Schema Imports ====================

export * from "./university.schema";
export * from "./research.schema";
export * from "./publication.schema";
export * from "./journal.schema";
export * from "./course.schema";
export * from "./degree.schema";
export * from "./mathematical-concept.schema";
export * from "./formula.schema";
export * from "./theorem.schema";
export * from "./proof.schema";
export * from "./statistical-model.schema";
export * from "./algorithm.schema";
export * from "./function.schema";
export * from "./particle.schema";
export * from "./physics-schemas";

import type { DomainMetadata } from "../../domain-metadata";

import { AlgorithmEntitySchema } from "./algorithm.schema";
import {
  CourseEntitySchema,
  validateCourseUID,
  COURSE_UID_PREFIX,
} from "./course.schema";
import {
  DegreeEntitySchema,
  validateDegreeUID,
  DEGREE_UID_PREFIX,
} from "./degree.schema";
import { FormulaEntitySchema } from "./formula.schema";
import { FunctionEntitySchema } from "./function.schema";
import {
  JournalEntitySchema,
  validateJournalUID,
  JOURNAL_UID_PREFIX,
} from "./journal.schema";
import { MathematicalConceptEntitySchema } from "./mathematical-concept.schema";
import { ParticleEntitySchema } from "./particle.schema";
import {
  ForceEntitySchema,
  FieldEntitySchema,
  EnergyTypeEntitySchema,
  PhysicalProcessEntitySchema,
  WaveEntitySchema,
  QuantumStateEntitySchema,
  ElementEntitySchema,
  CompoundEntitySchema,
  ReactionEntitySchema,
  MoleculeEntitySchema,
  IonEntitySchema,
  ChemicalBondEntitySchema,
  CatalystEntitySchema,
} from "./physics-schemas";
import { ProofEntitySchema } from "./proof.schema";
import {
  PublicationEntitySchema,
  validatePublicationUID,
  PUBLICATION_UID_PREFIX,
} from "./publication.schema";
import {
  ResearchEntitySchema,
  validateResearchUID,
  RESEARCH_UID_PREFIX,
} from "./research.schema";
import { StatisticalModelEntitySchema } from "./statistical-model.schema";
import { TheoremEntitySchema } from "./theorem.schema";
import {
  UniversityEntitySchema,
  validateUniversityUID,
  UNIVERSITY_UID_PREFIX,
} from "./university.schema";

// ==================== Domain Registry ====================

/**
 * All academic entity schemas mapped by type name
 */
export const ACADEMIC_ENTITY_SCHEMAS = {
  University: UniversityEntitySchema,
  Research: ResearchEntitySchema,
  Publication: PublicationEntitySchema,
  Journal: JournalEntitySchema,
  Course: CourseEntitySchema,
  Degree: DegreeEntitySchema,
  Mathematical_Concept: MathematicalConceptEntitySchema,
  Formula: FormulaEntitySchema,
  Theorem: TheoremEntitySchema,
  Proof: ProofEntitySchema,
  Statistical_Model: StatisticalModelEntitySchema,
  Algorithm: AlgorithmEntitySchema,
  Function: FunctionEntitySchema,
  Particle: ParticleEntitySchema,
  Force: ForceEntitySchema,
  Field: FieldEntitySchema,
  Energy_Type: EnergyTypeEntitySchema,
  Physical_Process: PhysicalProcessEntitySchema,
  Wave: WaveEntitySchema,
  Quantum_State: QuantumStateEntitySchema,
  Element: ElementEntitySchema,
  Compound: CompoundEntitySchema,
  Reaction: ReactionEntitySchema,
  Molecule: MoleculeEntitySchema,
  Ion: IonEntitySchema,
  Chemical_Bond: ChemicalBondEntitySchema,
  Catalyst: CatalystEntitySchema,
} as const;

/**
 * All academic entity types
 */
export const ACADEMIC_ENTITY_TYPES = Object.keys(
  ACADEMIC_ENTITY_SCHEMAS
) as Array<keyof typeof ACADEMIC_ENTITY_SCHEMAS>;

/**
 * UID prefix mappings for academic entities
 */
export const ACADEMIC_UID_PREFIXES = {
  [UNIVERSITY_UID_PREFIX]: "University",
  [RESEARCH_UID_PREFIX]: "Research",
  [PUBLICATION_UID_PREFIX]: "Publication",
  [JOURNAL_UID_PREFIX]: "Journal",
  [COURSE_UID_PREFIX]: "Course",
  [DEGREE_UID_PREFIX]: "Degree",
} as const;

/**
 * UID validators for academic entities
 */
export const ACADEMIC_UID_VALIDATORS = {
  [UNIVERSITY_UID_PREFIX]: validateUniversityUID,
  [RESEARCH_UID_PREFIX]: validateResearchUID,
  [PUBLICATION_UID_PREFIX]: validatePublicationUID,
  [JOURNAL_UID_PREFIX]: validateJournalUID,
  [COURSE_UID_PREFIX]: validateCourseUID,
  [DEGREE_UID_PREFIX]: validateDegreeUID,
} as const;

// ==================== Domain Helper Functions ====================

/**
 * Validate if a UID belongs to the academic domain
 */
export function isAcademicUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  return prefix in ACADEMIC_UID_VALIDATORS;
}

/**
 * Get entity type from academic UID
 */
export function getAcademicEntityType(uid: string): string | null {
  const prefix = uid.split(":")[0];
  return (
    ACADEMIC_UID_PREFIXES[prefix as keyof typeof ACADEMIC_UID_PREFIXES] || null
  );
}

/**
 * Validate academic UID format
 */
export function validateAcademicUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  const validator =
    ACADEMIC_UID_VALIDATORS[prefix as keyof typeof ACADEMIC_UID_VALIDATORS];
  return validator ? validator(uid) : false;
}

// ==================== Domain Configuration (New) ====================

export * from "./domain.config";
export { academicDomainConfig } from "./domain.config";

// ==================== Domain Metadata (Deprecated) ====================

/**
 * @deprecated Use academicDomainConfig from domain-system instead.
 * Will be removed in v2.0.0
 */
export const ACADEMIC_DOMAIN_INFO: DomainMetadata = {
  name: "academic",
  description:
    "Academic system - universities, research, publications, journals, courses, degrees",
  entityCount: Object.keys(ACADEMIC_ENTITY_SCHEMAS).length,
  relationships: [
    "ATTENDS",
    "TEACHES",
    "RESEARCHES",
    "PUBLISHES",
    "CITES",
    "REVIEWS",
    "FUNDS",
    "COLLABORATES",
    "ADVISES",
    "GRADUATES_FROM",
    "EMPLOYS",
    "AFFILIATES_WITH",
    "ACCREDITS",
    "PREREQUISITES",
    "STUDIES", // Research examination/investigation
    "APPLIES_TO", // Mathematics application
    "PROVES", // Mathematical/logical proof
    "VALIDATES", // Scientific/academic validation
    "CALCULATES", // Mathematical computation
    "COMPOSED_OF", // Scientific composition (chemistry/physics)
    "GENERATES_ENERGY", // Physics energy generation
    "BONDS_TO", // Chemical bonding
  ],
  ui: {
    color: "#7C3AED", // Violet - education/knowledge
    icon: "🎓", // Graduation cap
    entityIcons: {
      University: "🏛️",
      Research: "🔬",
      Publication: "📄",
      Journal: "📖",
      Course: "📚",
      Degree: "🎓",
      Mathematical_Concept: "🔢",
      Particle: "⚛️",
      Field: "⚡",
      Element: "🧪",
      Compound: "🧲",
      Molecule: "⚗️",
      Ion: "⚡",
      Alloy: "🔩",
      Catalyst: "⚗️",
      Crystal: "💎",
      Mineral: "💎",
      Chemical_Bond: "🔗",
      Reaction: "⚗️",
      Formula: "🔢",
      Theorem: "📐",
      Proof: "✓",
      Function: "ƒ",
      Algorithm: "🔢",
      Statistical_Model: "📊",
      Quantum_State: "🌀",
      Wave: "〰️",
      Force: "⚡",
      Energy_Type: "⚡",
      Physical_Process: "⚙️",
      Environmental_Process: "🌿",
    },
  },
} as const;
