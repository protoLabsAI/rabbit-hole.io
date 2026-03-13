import type { DomainConfig } from "../../domain-system";

import {
  AlgorithmEntitySchema,
  validateAlgorithmUID,
  ALGORITHM_UID_PREFIX,
} from "./algorithm.schema";
import { academicCardConfig } from "./card.config";
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
import {
  FormulaEntitySchema,
  validateFormulaUID,
  FORMULA_UID_PREFIX,
} from "./formula.schema";
import {
  FunctionEntitySchema,
  validateFunctionUID,
  FUNCTION_UID_PREFIX,
} from "./function.schema";
import {
  JournalEntitySchema,
  validateJournalUID,
  JOURNAL_UID_PREFIX,
} from "./journal.schema";
import {
  MathematicalConceptEntitySchema,
  validateMathematicalConceptUID,
  MATHEMATICAL_CONCEPT_UID_PREFIX,
} from "./mathematical-concept.schema";
import {
  ParticleEntitySchema,
  validateParticleUID,
  PARTICLE_UID_PREFIX,
} from "./particle.schema";
import {
  ProofEntitySchema,
  validateProofUID,
  PROOF_UID_PREFIX,
} from "./proof.schema";
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
import {
  StatisticalModelEntitySchema,
  validateStatisticalModelUID,
  STATISTICAL_MODEL_UID_PREFIX,
} from "./statistical-model.schema";
import {
  TheoremEntitySchema,
  validateTheoremUID,
  THEOREM_UID_PREFIX,
} from "./theorem.schema";
import {
  UniversityEntitySchema,
  validateUniversityUID,
  UNIVERSITY_UID_PREFIX,
} from "./university.schema";

export const academicDomainConfig: DomainConfig = {
  name: "academic",
  displayName: "Academic",
  description: "Academic domain entities",
  category: "core",

  entities: {
    University: UniversityEntitySchema,
    Research: ResearchEntitySchema,
    Publication: PublicationEntitySchema,
    Journal: JournalEntitySchema,
    Course: CourseEntitySchema,
    Degree: DegreeEntitySchema,
    Theorem: TheoremEntitySchema,
    Proof: ProofEntitySchema,
    Formula: FormulaEntitySchema,
    Algorithm: AlgorithmEntitySchema,
    Function: FunctionEntitySchema,
    Mathematical_Concept: MathematicalConceptEntitySchema,
    Statistical_Model: StatisticalModelEntitySchema,
    Particle: ParticleEntitySchema,
  },

  enrichmentExamples: {
    University: {
      input_text:
        "Harvard University was founded in 1636 in Cambridge, Massachusetts and is the oldest institution of higher education in the United States. The university has an enrollment of approximately 23,000 students and is consistently ranked among the top universities globally.",
      expected_output: {
        founded: "1636",
        location: "Cambridge, Massachusetts",
        enrollment: 23000,
        ranking: "top universities",
      },
    },
    Publication: {
      input_text:
        "The paper titled 'Attention Is All You Need' was published in 2017 by researchers at Google Brain. The publication introduced the Transformer architecture and has become one of the most cited papers in deep learning.",
      expected_output: {
        title: "Attention Is All You Need",
        publishedYear: "2017",
        institution: "Google Brain",
        fieldOfStudy: "deep learning",
      },
    },
  },

  relationshipExample: {
    input_text:
      "Albert Einstein authored the groundbreaking paper 'On the Electrodynamics of Moving Bodies' published in Annalen der Physik journal in 1905. He taught advanced physics courses at Princeton University from 1933 to 1955. Einstein's theory of relativity derives from classical mechanics principles developed by Isaac Newton. The Lorentz transformation proves Einstein's special relativity theory. Princeton University offered physics doctoral courses that were taught by Einstein. His research focused on unified field theory. The photoelectric effect theory derives from quantum mechanics foundations. Enrico Fermi published his nuclear physics research in Physical Review journal from 1925-1954.",
    expected_output: {
      relationships: [
        {
          source_entity: "On the Electrodynamics of Moving Bodies",
          target_entity: "Albert Einstein",
          relationship_type: "AUTHORED_BY",
          confidence: 0.99,
        },
        {
          source_entity: "On the Electrodynamics of Moving Bodies",
          target_entity: "Annalen der Physik",
          relationship_type: "PUBLISHED_IN",
          start_date: "1905",
          confidence: 0.97,
        },
        {
          source_entity: "Albert Einstein",
          target_entity: "Princeton University",
          relationship_type: "TAUGHT_AT",
          start_date: "1933",
          end_date: "1955",
          confidence: 0.98,
        },
        {
          source_entity: "Theory of Relativity",
          target_entity: "Classical Mechanics",
          relationship_type: "DERIVES_FROM",
          confidence: 0.94,
        },
        {
          source_entity: "Lorentz Transformation",
          target_entity: "Special Relativity",
          relationship_type: "PROVES",
          confidence: 0.96,
        },
        {
          source_entity: "Princeton University",
          target_entity: "Advanced Physics Doctorate",
          relationship_type: "OFFERS",
          confidence: 0.95,
        },
        {
          source_entity: "Albert Einstein",
          target_entity: "Unified Field Theory",
          relationship_type: "RESEARCHES",
          confidence: 0.93,
        },
        {
          source_entity: "Photoelectric Effect",
          target_entity: "Quantum Mechanics",
          relationship_type: "DERIVES_FROM",
          confidence: 0.91,
        },
        {
          source_entity: "Enrico Fermi",
          target_entity: "Nuclear Physics Research",
          relationship_type: "AUTHORED_BY",
          confidence: 0.97,
        },
        {
          source_entity: "Nuclear Physics Research",
          target_entity: "Physical Review",
          relationship_type: "PUBLISHED_IN",
          start_date: "1925",
          end_date: "1954",
          confidence: 0.96,
        },
      ],
    },
  },

  uidPrefixes: {
    University: UNIVERSITY_UID_PREFIX,
    Research: RESEARCH_UID_PREFIX,
    Publication: PUBLICATION_UID_PREFIX,
    Journal: JOURNAL_UID_PREFIX,
    Course: COURSE_UID_PREFIX,
    Degree: DEGREE_UID_PREFIX,
    Theorem: THEOREM_UID_PREFIX,
    Proof: PROOF_UID_PREFIX,
    Formula: FORMULA_UID_PREFIX,
    Algorithm: ALGORITHM_UID_PREFIX,
    Function: FUNCTION_UID_PREFIX,
    Mathematical_Concept: MATHEMATICAL_CONCEPT_UID_PREFIX,
    Statistical_Model: STATISTICAL_MODEL_UID_PREFIX,
    Particle: PARTICLE_UID_PREFIX,
  },

  validators: {
    [UNIVERSITY_UID_PREFIX]: validateUniversityUID,
    [RESEARCH_UID_PREFIX]: validateResearchUID,
    [PUBLICATION_UID_PREFIX]: validatePublicationUID,
    [JOURNAL_UID_PREFIX]: validateJournalUID,
    [COURSE_UID_PREFIX]: validateCourseUID,
    [DEGREE_UID_PREFIX]: validateDegreeUID,
    [THEOREM_UID_PREFIX]: validateTheoremUID,
    [PROOF_UID_PREFIX]: validateProofUID,
    [FORMULA_UID_PREFIX]: validateFormulaUID,
    [ALGORITHM_UID_PREFIX]: validateAlgorithmUID,
    [FUNCTION_UID_PREFIX]: validateFunctionUID,
    [MATHEMATICAL_CONCEPT_UID_PREFIX]: validateMathematicalConceptUID,
    [STATISTICAL_MODEL_UID_PREFIX]: validateStatisticalModelUID,
    [PARTICLE_UID_PREFIX]: validateParticleUID,
  },

  relationships: [
    "PUBLISHED_IN",
    "AUTHORED_BY",
    "TEACHES",
    "OFFERS",
    "RESEARCHES",
    "PROVES",
    "DERIVES_FROM",
  ],

  ui: {
    color: "#06B6D4",
    icon: "🎓",
    entityIcons: {
      University: "🏛️",
      Research: "🔬",
      Publication: "📄",
      Journal: "📰",
      Course: "📚",
      Degree: "🎓",
      Theorem: "📐",
      Proof: "✓",
      Formula: "∑",
      Algorithm: "🔢",
      Function: "ƒ",
      MathematicalConcept: "∞",
      StatisticalModel: "📊",
      Particle: "⚛️",
    },
    card: academicCardConfig,
  },
};
