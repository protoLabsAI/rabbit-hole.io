/**
 * Plant Entity Schema - Biological Domain
 *
 * Schema for plant entities in the biological domain.
 * Covers all plant life from trees to grasses to agricultural crops.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Plant Entity Schema ====================

export const PlantEntitySchema = EntitySchema.extend({
  type: z.literal("Plant"),
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
      plant_type: z
        .enum([
          "tree",
          "shrub",
          "herb",
          "grass",
          "fern",
          "moss",
          "algae",
          "flower",
          "vegetable",
          "fruit",
          "grain",
          "legume",
        ])
        .optional(),
      lifespan: z.string().optional(), // Annual, perennial, etc.
      averageHeight: z.number().min(0).optional(), // in centimeters
      growingSeason: z.array(z.string()).optional(), // seasons when plant grows
      sunlightRequirement: z
        .enum(["full_sun", "partial_sun", "partial_shade", "full_shade"])
        .optional(),
      waterRequirement: z
        .enum(["low", "moderate", "high", "aquatic"])
        .optional(),
      soilType: z.array(z.string()).optional(), // preferred soil types
      hardiness_zone: z.string().optional(), // USDA hardiness zone
      reproductionType: z
        .enum(["seed", "spore", "vegetative", "bulb", "runner"])
        .optional(),
      pollinationMethod: z
        .enum(["wind", "insect", "bird", "bat", "water", "self"])
        .optional(),
      edible: z.boolean().optional(),
      medicinal_properties: z.array(z.string()).optional(),
      toxic: z.boolean().optional(),
      invasive: z.boolean().optional(),
      native_range: z.string().optional(), // Geographic origin
      cultivated: z.boolean().optional(), // Cultivated by humans
      threatened_by: z.array(z.string()).optional(), // Conservation threats
      class: z.string().optional(), // Angiospermae, Gymnospermae, etc.
      order: z.string().optional(), // Taxonomic order
      family: z.string().optional(), // Taxonomic family
      genus: z.string().optional(), // Taxonomic genus
      species: z.string().optional(), // Taxonomic species
    })
    .optional(),
});

// ==================== UID Validation ====================

export const PLANT_UID_PREFIX = "plant";

export const validatePlantUID = (uid: string): boolean => {
  return uid.startsWith("plant:");
};

// ==================== Type Exports ====================

export type PlantEntity = z.infer<typeof PlantEntitySchema>;
