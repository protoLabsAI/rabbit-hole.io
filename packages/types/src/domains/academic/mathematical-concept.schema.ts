/**
 * Mathematical Concept Entity Schema - Academic Domain
 *
 * Schema for mathematical concept entities in the academic domain.
 * Covers mathematical theories, principles, and abstract concepts.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Mathematical Concept Entity Schema ====================

export const MathematicalConceptEntitySchema = EntitySchema.extend({
  type: z.literal("Mathematical_Concept"),
  properties: z
    .object({
      concept_type: z
        .enum([
          "theorem",
          "axiom",
          "definition",
          "principle",
          "conjecture",
          "lemma",
          "corollary",
          "identity",
          "equation",
          "inequality",
        ])
        .optional(),
      mathematical_field: z.array(z.string()).optional(),
      difficulty_level: z
        .enum(["elementary", "intermediate", "advanced", "graduate"])
        .optional(),
      prerequisites: z.array(z.string()).optional(),
      applications: z.array(z.string()).optional(),
      notation: z.string().optional(),
      proof_methods: z.array(z.string()).optional(),
      related_concepts: z.array(z.string()).optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const MATHEMATICAL_CONCEPT_UID_PREFIX = "mathematical_concept";

/**
 * Validate Mathematical Concept UID format
 */
export function validateMathematicalConceptUID(uid: string): boolean {
  return uid.startsWith(`${MATHEMATICAL_CONCEPT_UID_PREFIX}:`);
}
