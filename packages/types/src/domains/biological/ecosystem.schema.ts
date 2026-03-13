/**
 * Ecosystem Entity Schema - Biological Domain
 *
 * Schema for ecosystem entities in the biological domain.
 * Covers environmental systems and their characteristics.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Ecosystem Entity Schema ====================

export const EcosystemEntitySchema = EntitySchema.extend({
  type: z.literal("Ecosystem"),
  properties: z
    .object({
      ecosystemType: z
        .enum([
          "forest",
          "grassland",
          "desert",
          "tundra",
          "freshwater",
          "marine",
          "wetland",
          "urban",
          "agricultural",
          "mountain",
        ])
        .optional(),
      biome: z.string().optional(),
      location: z.string().optional(),
      area: z.number().min(0).optional(), // in square kilometers
      climate: z.string().optional(),
      keySpecies: z.array(z.string()).optional(), // Important species UIDs
      threats: z.array(z.string()).optional(),
      conservationStatus: z
        .enum([
          "pristine",
          "largely_intact",
          "moderately_degraded",
          "severely_degraded",
          "extinct",
        ])
        .optional(),
      protectedStatus: z.boolean().optional(),
      services: z.array(z.string()).optional(), // Ecosystem services provided
      humanImpact: z
        .enum(["minimal", "low", "moderate", "high", "severe"])
        .optional(),
      biodiversityIndex: z.number().min(0).optional(),
      primaryProducers: z.array(z.string()).optional(), // Plant species UIDs
      primaryConsumers: z.array(z.string()).optional(), // Herbivore species UIDs
      secondaryConsumers: z.array(z.string()).optional(), // Predator species UIDs
      decomposers: z.array(z.string()).optional(), // Decomposer species UIDs
      dominantVegetation: z.string().optional(),
      soilType: z.string().optional(),
      waterSources: z.array(z.string()).optional(),
      seasonality: z.string().optional(),
      restoration: z.boolean().optional(), // Is this a restoration site
    })
    .optional(),
});

// ==================== UID Validation ====================

export const ECOSYSTEM_UID_PREFIX = "ecosystem";

export const validateEcosystemUID = (uid: string): boolean => {
  return uid.startsWith("ecosystem:");
};

// ==================== Type Exports ====================

export type EcosystemEntity = z.infer<typeof EcosystemEntitySchema>;
