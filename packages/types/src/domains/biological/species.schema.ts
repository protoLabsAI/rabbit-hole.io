/**
 * Species Entity Schema - Biological Domain
 *
 * Schema for species entities in the biological domain.
 * Covers taxonomic classification and species-specific properties.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Species Entity Schema ====================

export const SpeciesEntitySchema = EntitySchema.extend({
  type: z.literal("Species"),
  properties: z
    .object({
      scientificName: z.string().optional(), // Binomial nomenclature
      authority: z.string().optional(), // Taxonomic authority
      yearDescribed: z.string().optional(), // Year first described
      commonNames: z.array(z.string()).optional(),
      taxonomicStatus: z
        .enum(["accepted", "synonym", "invalid", "doubtful"])
        .optional(),
      parentTaxon: z.string().optional(), // Parent genus/family UID
      conservationStatus: z
        .enum([
          "extinct",
          "extinct_in_wild",
          "critically_endangered",
          "endangered",
          "vulnerable",
          "near_threatened",
          "least_concern",
          "data_deficient",
          "not_evaluated",
        ])
        .optional(),
      nativeRange: z.string().optional(),
      introduced: z.array(z.string()).optional(), // Regions where introduced
      morphology: z.string().optional(), // Physical description
      ecology: z.string().optional(), // Ecological role
      reproduction: z.string().optional(), // Reproductive behavior
      diet: z.string().optional(), // Feeding behavior
      habitat: z.string().optional(), // Primary habitat
      threats: z.array(z.string()).optional(), // Conservation threats
      class: z.string().optional(), // Taxonomic class
      order: z.string().optional(), // Taxonomic order
      family: z.string().optional(), // Taxonomic family
      genus: z.string().optional(), // Taxonomic genus
    })
    .optional(),
});

// ==================== UID Validation ====================

export const SPECIES_UID_PREFIX = "species";

export const validateSpeciesUID = (uid: string): boolean => {
  return uid.startsWith("species:");
};

// ==================== Type Exports ====================

export type SpeciesEntity = z.infer<typeof SpeciesEntitySchema>;
