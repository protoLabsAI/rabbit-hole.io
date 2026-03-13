/**
 * Fungi Entity Schema - Biological Domain
 *
 * Schema for fungi entities in the biological domain.
 * Covers mushrooms, yeasts, molds, and other fungal organisms.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Fungi Entity Schema ====================

export const FungiEntitySchema = EntitySchema.extend({
  type: z.literal("Fungi"),
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
      fungi_type: z
        .enum([
          "mushroom",
          "yeast",
          "mold",
          "mildew",
          "rust",
          "smut",
          "lichen",
          "bracket_fungi",
          "puffball",
          "truffle",
        ])
        .optional(),
      morphology: z
        .enum([
          "unicellular",
          "multicellular_filamentous",
          "fruiting_body",
          "mycelium",
          "composite_organism", // for lichens
        ])
        .optional(),
      lifespan: z.string().optional(), // lifecycle duration
      averageSize: z.number().min(0).optional(), // in centimeters for fruiting bodies
      spore_type: z.enum(["sexual", "asexual", "both"]).optional(),
      reproduction_method: z
        .enum(["spores", "fragmentation", "budding", "sexual"])
        .optional(),
      temperature_range: z.string().optional(), // optimal growing temperature
      humidity_requirement: z.enum(["low", "moderate", "high"]).optional(),
      ph_preference: z.string().optional(),
      substrate: z.array(z.string()).optional(), // what it grows on
      symbiotic_relationships: z.array(z.string()).optional(), // mycorrhizal, etc.
      edible: z.boolean().optional(),
      toxic: z.boolean().optional(),
      psychoactive: z.boolean().optional(),
      medicinal_properties: z.array(z.string()).optional(),
      economic_importance: z
        .enum(["none", "minor", "moderate", "important", "critical"])
        .optional(),
      ecological_role: z
        .enum(["decomposer", "pathogen", "symbiont", "saprotroph"])
        .optional(),
      cultivation_method: z
        .enum(["wild", "cultivated", "laboratory", "industrial"])
        .optional(),
      native_range: z.string().optional(), // Geographic origin
      threatened_by: z.array(z.string()).optional(), // Conservation threats
      class: z.string().optional(), // Basidiomycetes, Ascomycetes, etc.
      order: z.string().optional(), // Taxonomic order
      family: z.string().optional(), // Taxonomic family
      genus: z.string().optional(), // Taxonomic genus
      species: z.string().optional(), // Taxonomic species
    })
    .optional(),
});

// ==================== UID Validation ====================

export const FUNGI_UID_PREFIX = "fungi";

export const validateFungiUID = (uid: string): boolean => {
  return uid.startsWith("fungi:");
};

// ==================== Type Exports ====================

export type FungiEntity = z.infer<typeof FungiEntitySchema>;
