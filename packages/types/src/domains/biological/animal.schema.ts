/**
 * Animal Entity Schema - Biological Domain
 *
 * Schema for animal entities in the biological domain.
 * Inherits universal properties from base EntitySchema.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Animal Entity Schema ====================

export const AnimalEntitySchema = EntitySchema.extend({
  type: z.literal("Animal"),
  properties: z
    .object({
      scientificName: z.string().optional(), // Taxonomic scientific name
      commonNames: z.array(z.string()).optional(), // Common names across regions
      taxonomicRank: z.string().optional(), // Species, subspecies, etc.
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
      habitat: z.string().optional(), // Primary habitat description
      diet: z
        .enum([
          "carnivore",
          "herbivore",
          "omnivore",
          "insectivore",
          "piscivore",
          "frugivore",
          "nectarivore",
          "carnivorous",
          "herbivorous",
          "omnivorous",
        ])
        .optional(),
      lifespan: z.string().optional(), // Average lifespan
      averageWeight: z.number().min(0).optional(), // in grams
      averageLength: z.number().min(0).optional(), // in centimeters
      socialStructure: z
        .enum([
          "solitary",
          "pair",
          "family_group",
          "pack",
          "herd",
          "colony",
          "swarm",
        ])
        .optional(),
      reproductionType: z
        .enum(["sexual", "asexual", "hermaphroditic", "parthenogenetic"])
        .optional(),
      geographicRange: z.string().optional(), // Geographic distribution
      threats: z.array(z.string()).optional(), // Conservation threats
      class: z.string().optional(), // Mammalia, Aves, etc.
      order: z.string().optional(), // Taxonomic order
      family: z.string().optional(), // Taxonomic family
      genus: z.string().optional(), // Taxonomic genus
      species: z.string().optional(), // Taxonomic species
    })
    .optional(),
});

// ==================== UID Validation ====================

export const ANIMAL_UID_PREFIX = "animal";

export const validateAnimalUID = (uid: string): boolean => {
  return uid.startsWith("animal:");
};

// ==================== Type Exports ====================

export type AnimalEntity = z.infer<typeof AnimalEntitySchema>;
